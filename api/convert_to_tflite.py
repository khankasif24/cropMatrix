"""Convert .h5 disease models to .tflite format for lightweight deployment."""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "latest_model", "disease")

models = ["potato.h5", "corn.h5", "sugarcane.h5", "rice.h5"]

for m in models:
    h5_path = os.path.join(MODEL_DIR, m)
    tflite_path = os.path.join(MODEL_DIR, m.replace(".h5", ".tflite"))
    
    if not os.path.exists(h5_path):
        print(f"  [WARN] {m} not found, skipping")
        continue
    
    print(f"Converting {m}...")
    model = tf.keras.models.load_model(h5_path, compile=False)
    print(f"  Input: {model.input_shape}, Output: {model.output_shape}")
    
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # Quantize for smaller size
    tflite_model = converter.convert()
    
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    
    h5_size = os.path.getsize(h5_path) / (1024*1024)
    tflite_size = len(tflite_model) / (1024*1024)
    print(f"  [OK] {m}: {h5_size:.1f} MB -> {tflite_path}: {tflite_size:.1f} MB ({(1-tflite_size/h5_size)*100:.0f}% smaller)")

print("\nDone! You can now remove .h5 files and use tflite-runtime instead of tensorflow.")
