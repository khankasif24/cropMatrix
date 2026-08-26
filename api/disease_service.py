"""
Disease Detection Service — Uses .tflite models (lightweight, no TensorFlow needed).

Supports 4 crops: Potato, Corn, Rice, Sugarcane
Each has a .tflite model + .json treatment solutions.
Models are LAZY-LOADED per-crop on first request to minimise RAM usage.
"""

import os
import json
import numpy as np
from pathlib import Path
from io import BytesIO

# ── Resolve paths ──────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DISEASE_MODEL_DIR = PROJECT_ROOT / "latest_model" / "disease"

# Global disease model data (lazy-loaded per crop)
_disease_interpreters = {}
_disease_solutions = {}
_disease_load_attempted = set()  # tracks which crops we already tried to load

# Supported crops and their model files
DISEASE_CROPS = {
    "potato": {
        "model_file": "potato.tflite",
        "solution_file": "potato.json",
        "display_name": "Potato",
        "classes": ["Potato___Early_Blight", "Potato___Healthy", "Potato___Late_Blight"],
    },
    "corn": {
        "model_file": "corn.tflite",
        "solution_file": "corn.json",
        "display_name": "Corn / Maize",
        "classes": ["Corn___Common_Rust", "Corn___Gray_Leaf_Spot", "Corn___Healthy", "Corn___Northern_Leaf_Blight"],
    },
    "rice": {
        "model_file": "rice.tflite",
        "solution_file": "rice.json",
        "display_name": "Rice",
        "classes": ["Rice___Brown_Spot", "Rice___Healthy", "Rice___Leaf_Blast", "Rice___Neck_Blast"],
    },
    "sugarcane": {
        "model_file": "sugarcane.tflite",
        "solution_file": "sugar_cane.json",
        "display_name": "Sugarcane",
        "classes": ["Sugarcane___Bacterial_Blight", "Sugarcane___Healthy", "Sugarcane___Red_Rot"],
    },
}

# Default treatment when disease not in JSON
DEFAULT_TREATMENT = {
    "spray": "Consult a local agriculture expert",
    "dosage": "Based on expert recommendation",
    "interval": "As advised by expert",
}


def _load_tflite_model(model_path):
    """Load a TFLite model using ai-edge-litert, tflite-runtime, or tf.lite."""
    try:
        # Try ai-edge-litert first (Google's official replacement for tflite-runtime)
        from ai_edge_litert import interpreter as litert
        interpreter = litert.Interpreter(model_path=str(model_path))
    except ImportError:
        try:
            # Try legacy tflite-runtime
            from tflite_runtime.interpreter import Interpreter
            interpreter = Interpreter(model_path=str(model_path))
        except ImportError:
            try:
                # Fallback to full TensorFlow if available (local dev)
                import tensorflow as tf
                interpreter = tf.lite.Interpreter(model_path=str(model_path))
            except ImportError:
                print("  [WARN] No TFLite runtime found!")
                print("  INFO: Install with: pip install ai-edge-litert")
                return None

    interpreter.allocate_tensors()
    return interpreter


def _ensure_disease_model(crop_key: str):
    """Lazy-load a single crop's disease model + solutions on first use."""
    if crop_key in _disease_interpreters or crop_key in _disease_load_attempted:
        return  # already loaded or already failed
    _disease_load_attempted.add(crop_key)

    config = DISEASE_CROPS.get(crop_key)
    if not config:
        return

    if not DISEASE_MODEL_DIR.exists():
        print(f"  [WARN] Disease model directory not found: {DISEASE_MODEL_DIR}")
        return

    model_path = DISEASE_MODEL_DIR / config["model_file"]
    solution_path = DISEASE_MODEL_DIR / config["solution_file"]

    # Load TFLite model
    try:
        if model_path.exists():
            interpreter = _load_tflite_model(model_path)
            if interpreter:
                _disease_interpreters[crop_key] = interpreter
                input_details = interpreter.get_input_details()
                shape = input_details[0]['shape']
                print(f"  [OK] {config['display_name']} disease model loaded (lazy, input: {shape})")
        else:
            print(f"  [WARN] {config['display_name']} model not found: {model_path}")
    except Exception as e:
        print(f"  [ERROR] Failed to load {config['display_name']} model: {e}")

    # Load solutions JSON
    try:
        if solution_path.exists():
            with open(solution_path, "r") as f:
                _disease_solutions[crop_key] = json.load(f)
            print(f"  [OK] {config['display_name']} solutions loaded ({len(_disease_solutions[crop_key])} entries)")
        else:
            print(f"  [WARN] {config['display_name']} solution file not found: {solution_path}")
    except Exception as e:
        print(f"  [ERROR] Failed to load {config['display_name']} solutions: {e}")


def load_disease_models():
    """Legacy: kept for compatibility. Disease models now lazy-load per-crop."""
    print(f"Disease models will lazy-load from: {DISEASE_MODEL_DIR}")


def get_supported_disease_crops() -> list[dict]:
    """Return list of crops supported for disease detection (checks file existence, not RAM)."""
    result = []
    for crop_key, config in DISEASE_CROPS.items():
        model_path = DISEASE_MODEL_DIR / config["model_file"]
        result.append({
            "key": crop_key,
            "name": config["display_name"],
            "available": model_path.exists(),
            "diseases": [c.replace("___", " — ").replace("_", " ") for c in config["classes"]],
        })
    return result


def is_valid_leaf_image(img_pil) -> bool:
    """
    Check if the image has a minimum percentage of leaf-like colors.
    Converts image to HSV and checks for Green, Yellow, and Brown hues.
    """
    try:
        hsv_img = img_pil.convert('HSV')
        hsv_data = np.array(hsv_img)
        H = hsv_data[:,:,0]
        S = hsv_data[:,:,1]
        V = hsv_data[:,:,2]
        
        # Narrow down the valid hue range strictly to Yellow-Green and Green.
        # In PIL HSV (0-255): Yellow is ~43, Green is ~85.
        # Restrict to H between 25 and 100. This perfectly EXCLUDES skin tones, wood, furniture, and red/brown walls (H 0-25).
        # We require at least 5% of the image to have some actual green/yellow-green, 
        # which is almost always present even on severely blighted leaves or in the background of a leaf photo.
        valid_hue = (H >= 25) & (H <= 105)
        
        # Filter out very dark/black or very washed-out/grayscale areas (must be somewhat vibrant)
        valid_sat = S > 40
        valid_val = V > 40
        
        # Combine masks
        leaf_mask = valid_hue & valid_sat & valid_val
        
        # Calculate percentage of green/yellow-green pixels
        leaf_percentage = np.mean(leaf_mask)
        
        # Require at least 5% of the image to be green/yellow-green
        return bool(leaf_percentage >= 0.05)
    except Exception as e:
        print(f"  [WARN] Error in leaf validation: {e}")
        return True


def detect_disease(crop: str, image_bytes: bytes) -> dict:
    """
    Detect disease from a leaf image using TFLite interpreter.
    Model is lazy-loaded on first request for this crop.

    Args:
        crop: One of 'potato', 'corn', 'rice', 'sugarcane'
        image_bytes: Raw bytes of the uploaded image

    Returns:
        Dict with disease name, confidence, treatment info
    """
    crop_key = crop.lower().strip()

    if crop_key not in DISEASE_CROPS:
        return {
            "success": False,
            "error": f"Unsupported crop: {crop}. Supported: {list(DISEASE_CROPS.keys())}",
        }

    # Lazy-load this crop's model
    _ensure_disease_model(crop_key)

    if crop_key not in _disease_interpreters:
        return {
            "success": False,
            "error": f"Disease model for {crop} is not loaded. It may not be available on this server.",
        }

    config = DISEASE_CROPS[crop_key]
    interpreter = _disease_interpreters[crop_key]
    solutions = _disease_solutions.get(crop_key, {})

    try:
        from PIL import Image

        # Get model input shape from interpreter
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        input_shape = input_details[0]['shape']  # e.g. [1, 256, 256, 3]

        target_h = int(input_shape[1])
        target_w = int(input_shape[2])

        # Load and preprocess image
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Fast leaf validation before heavy inference
        if not is_valid_leaf_image(img):
            return {
                "success": True,
                "is_valid_leaf": False,
                "error": "The uploaded image does not appear to be a plant leaf."
            }

        img = img.resize((target_w, target_h))
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Run inference
        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]['index'])
        pred_proba = predictions[0]

        # Get predicted class
        pred_idx = int(np.argmax(pred_proba))
        confidence = float(pred_proba[pred_idx])

        # Machine learning models often produce a low maximum confidence flatline when given out-of-distribution random images
        if confidence < 0.60:
            return {
                "success": True,
                "is_valid_leaf": False,
                "error": "The AI model confidence is too low. Please upload a clear photo of the leaf."
            }

        classes = config["classes"]
        if pred_idx < len(classes):
            disease_key = classes[pred_idx]
        else:
            disease_key = f"Unknown_Class_{pred_idx}"

        # Format disease name for display
        disease_display = disease_key.replace("___", " — ").replace("_", " ")

        # Check if healthy
        is_healthy = "healthy" in disease_key.lower()

        # Get treatment from solutions JSON
        treatment = solutions.get(disease_key, DEFAULT_TREATMENT)

        # Build all predictions
        all_predictions = []
        for i, cls in enumerate(classes):
            all_predictions.append({
                "disease": cls.replace("___", " — ").replace("_", " "),
                "confidence": round(float(pred_proba[i]) * 100, 1) if i < len(pred_proba) else 0,
            })
        all_predictions.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "success": True,
            "crop": config["display_name"],
            "disease": disease_display,
            "disease_key": disease_key,
            "confidence": round(confidence * 100, 1),
            "is_healthy": is_healthy,
            "is_valid_leaf": True,
            "treatment": {
                "spray": treatment.get("spray", DEFAULT_TREATMENT["spray"]),
                "dosage": treatment.get("dosage", DEFAULT_TREATMENT["dosage"]),
                "interval": treatment.get("interval", DEFAULT_TREATMENT["interval"]),
            },
            "all_predictions": all_predictions,
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing image: {str(e)}",
        }
