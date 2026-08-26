"""
Train a RandomForest classifier for fertilizer recommendation.
Run this script once to generate the model:
    python model_scripts/train_fertilizer_model.py

Input:  datasets/fertlizer_recommendation_dataset.csv
Output: latest_model/fertilizer_recommendation_rf.pkl
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = PROJECT_ROOT / "datasets" / "fertlizer_recommendation_dataset.csv"
OUTPUT_DIR = PROJECT_ROOT / "latest_model"


def train():
    print("=" * 60)
    print("Fertilizer Recommendation Model Training")
    print("=" * 60)

    # Load dataset
    print(f"\n[1/5] Loading dataset from {DATASET_PATH}...")
    df = pd.read_csv(DATASET_PATH)
    print(f"  Rows: {len(df)}, Columns: {df.columns.tolist()}")

    # Standardize column names (strip spaces)
    df.columns = [c.strip() for c in df.columns]
    print(f"  Cleaned columns: {df.columns.tolist()}")

    # Check target column
    target_col = None
    for col in df.columns:
        if "fertil" in col.lower():
            target_col = col
            break

    if target_col is None:
        print("ERROR: Could not find fertilizer target column!")
        sys.exit(1)

    print(f"  Target column: '{target_col}'")
    print(f"  Unique fertilizers: {df[target_col].nunique()}")
    print(f"  Distribution:\n{df[target_col].value_counts()}\n")

    # Define features
    numeric_features = []
    categorical_features = []

    for col in df.columns:
        if col == target_col:
            continue
        lower = col.lower()
        if df[col].dtype in ['float64', 'int64', 'float32', 'int32']:
            numeric_features.append(col)
        else:
            categorical_features.append(col)

    print(f"[2/5] Features identified:")
    print(f"  Numeric:     {numeric_features}")
    print(f"  Categorical: {categorical_features}")

    # Prepare data
    X = df[numeric_features + categorical_features]
    y_raw = df[target_col].str.strip()

    # Encode target
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    fertilizer_types = list(le.classes_)
    print(f"\n[3/5] Label encoding: {len(fertilizer_types)} fertilizer types")

    # Build pipeline with column transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numeric_features),
            ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), categorical_features),
        ]
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\n[4/5] Training RandomForest...")
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n  Accuracy: {accuracy:.4f} ({accuracy * 100:.1f}%)")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=fertilizer_types, zero_division=0))

    # Get unique soil and crop types for metadata
    soil_types = df[categorical_features[0]].unique().tolist() if categorical_features else []
    crop_types = df[categorical_features[1]].unique().tolist() if len(categorical_features) > 1 else []

    # Save model bundle
    print(f"\n[5/5] Saving model...")
    OUTPUT_DIR.mkdir(exist_ok=True)

    bundle = {
        "pipeline": pipeline,
        "label_encoder": le,
        "fertilizer_types": fertilizer_types,
        "soil_types": sorted(soil_types) if soil_types else [],
        "crop_types": sorted(crop_types) if crop_types else [],
        "accuracy": accuracy,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
    }

    out_path = OUTPUT_DIR / "fertilizer_recommendation_rf.pkl"
    joblib.dump(bundle, out_path)
    print(f"  Saved to: {out_path}")
    print(f"  Size: {out_path.stat().st_size / 1024:.1f} KB")
    print(f"\nDone! Model ready for use.")


if __name__ == "__main__":
    train()
