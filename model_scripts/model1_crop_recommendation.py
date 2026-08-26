"""
Crop Recommendation Model Training Script — State-Aware Version
================================================================
Trains on the new crop_data.csv with STATE, SOIL_TYPE as features.
This script is for local training and analysis.
For Render deployment, use api/retrain_models.py instead.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)
from sklearn.pipeline import Pipeline

# ── Paths ───────────────────────────────────────────
DATA_PATH   = os.path.join(os.path.dirname(__file__), "..", "datasets", "crop_data.csv")
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "..", "latest_model")
MODEL_FILE  = os.path.join(OUTPUT_DIR, "crop_recommendation_rf.pkl")
META_FILE   = os.path.join(OUTPUT_DIR, "crop_recommendation_rf_meta.json")
RANDOM_SEED = 42

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Load Data ───────────────────────────────────────
print("=" * 60)
print("  CROP RECOMMENDATION — RANDOM FOREST (State-Aware)")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
print(f"\n📂 Dataset shape : {df.shape}")
print(f"   Columns       : {list(df.columns)}")
print(f"   Missing values: {df.isnull().sum().sum()}")

# Rename columns to internal names
df = df.rename(columns={
    "N_SOIL": "N",
    "P_SOIL": "P",
    "K_SOIL": "K",
    "TEMPERATURE": "temperature",
    "HUMIDITY": "humidity",
    "RAINFALL": "rainfall",
    "CROP": "label",
    "STATE": "state",
    "SOIL_TYPE": "soil_type",
    "CROP_PRICE": "crop_price",
})

# Clean
df = df.dropna(subset=["label", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
print(f"   After cleaning: {df.shape[0]} rows")
print(f"   Unique states : {df['state'].nunique()} → {sorted(df['state'].unique())[:10]}...")
print(f"   Unique crops  : {df['label'].nunique()}")
print(f"   Unique soils  : {df['soil_type'].nunique()} → {sorted(df['soil_type'].unique())}")


# ── Augment Underrepresented Crops ───────────────────
MIN_SAMPLES = 10
crop_counts = df["label"].value_counts()
underrep_crops = crop_counts[crop_counts < MIN_SAMPLES].index.tolist()
print(f"\n   Augmenting {len(underrep_crops)} underrepresented crops (< {MIN_SAMPLES} samples)")

augmented_rows = []
np.random.seed(RANDOM_SEED)
for crop_name in underrep_crops:
    crop_df = df[df["label"] == crop_name]
    n_needed = MIN_SAMPLES - len(crop_df)
    for _ in range(n_needed):
        row = crop_df.sample(1, replace=True).iloc[0].copy()
        for col in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
            jitter = np.random.normal(0, row[col] * 0.05 + 0.5)
            row[col] = max(0, row[col] + jitter)
        augmented_rows.append(row)

if augmented_rows:
    aug_df = pd.DataFrame(augmented_rows)
    df = pd.concat([df, aug_df], ignore_index=True)
    print(f"   After augmentation: {df.shape[0]} rows")


# ── Encode Categorical Features ─────────────────────
state_encoder = LabelEncoder()
soil_encoder = LabelEncoder()
df["state_enc"] = state_encoder.fit_transform(df["state"].fillna("Unknown"))
df["soil_enc"] = soil_encoder.fit_transform(df["soil_type"].fillna("Unknown"))

FEATURE_COLS = ["state_enc", "soil_enc", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET_COL   = "label"

X = df[FEATURE_COLS].values
y = df[TARGET_COL].values


# ── Label Encode Target ─────────────────────────────
le = LabelEncoder()
y_enc = le.fit_transform(y)
class_names = list(le.classes_)
print(f"\n   Total classes: {len(class_names)}")


# ── Train/Test Split ────────────────────────────────
try:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=RANDOM_SEED, stratify=y_enc
    )
except ValueError:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=RANDOM_SEED
    )
    print("   ⚠️ Used non-stratified split")
print(f"\n📊 Train size : {X_train.shape[0]}  |  Test size : {X_test.shape[0]}")


# ── Build Pipeline ──────────────────────────────────
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", RandomForestClassifier(
        n_estimators=500,
        max_depth=25,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    ))
])


# ── Cross Validation ────────────────────────────────
print("\n🔄 Running 5-fold cross-validation …")
cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="accuracy", n_jobs=-1)
print(f"   CV Accuracy : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")


# ── Train ────────────────────────────────────────────
pipeline.fit(X_train, y_train)


# ── Evaluate ─────────────────────────────────────────
y_pred = pipeline.predict(X_test)
acc    = accuracy_score(y_test, y_pred)

print(f"\n✅ Test Accuracy : {acc:.4f} ({acc*100:.2f}%)")
print("\n📋 Classification Report (top 20 classes):")
# Print just top 20 most common classes to keep output manageable
from collections import Counter
top_classes_idx = [i for i, _ in Counter(y_test).most_common(20)]
top_class_names = [class_names[i] for i in top_classes_idx]
print(classification_report(y_test, y_pred, labels=top_classes_idx, target_names=top_class_names, zero_division=0))


# ── Feature Importances ─────────────────────────────
rf_model     = pipeline.named_steps["clf"]
importances  = rf_model.feature_importances_
raw_feature_names = ["state", "soil_type", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
feat_imp     = dict(zip(raw_feature_names, importances.round(4).tolist()))
feat_imp_sorted = dict(sorted(feat_imp.items(), key=lambda x: x[1], reverse=True))
print("📌 Feature Importances:")
for feat, imp in feat_imp_sorted.items():
    bar = "█" * int(imp * 40)
    print(f"   {feat:<15} {imp:.4f}  {bar}")


# ── Build state→crops mapping ───────────────────────
state_crops_map = {}
for state_name in df["state"].unique():
    state_df = df[df["state"] == state_name]
    crop_counts = state_df["label"].value_counts()
    state_crops_map[state_name] = crop_counts.index.tolist()

soil_types = sorted(df["soil_type"].dropna().unique().tolist())


# ── Save Model Bundle ───────────────────────────────
bundle = {
    "pipeline"       : pipeline,
    "label_encoder"  : le,
    "state_encoder"  : state_encoder,
    "soil_encoder"   : soil_encoder,
    "feature_cols"   : FEATURE_COLS,
    "raw_feature_cols": ["state", "soil_type", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    "class_names"    : class_names,
    "states"         : sorted(df["state"].unique().tolist()),
    "soil_types"     : soil_types,
    "state_crops_map": state_crops_map,
    "dataset_version": "v2_state_aware",
}
joblib.dump(bundle, MODEL_FILE, compress=3)
print(f"\n💾 Model saved → {MODEL_FILE}")

meta = {
    "model_type"        : "RandomForestClassifier",
    "sklearn_version"   : __import__("sklearn").__version__,
    "feature_cols"      : FEATURE_COLS,
    "raw_feature_cols"  : raw_feature_names,
    "target_col"        : TARGET_COL,
    "class_names"       : class_names,
    "n_classes"         : len(class_names),
    "n_estimators"      : 300,
    "train_samples"     : int(X_train.shape[0]),
    "test_samples"      : int(X_test.shape[0]),
    "cv_accuracy_mean"  : round(float(cv_scores.mean()), 4),
    "cv_accuracy_std"   : round(float(cv_scores.std()), 4),
    "test_accuracy"     : round(float(acc), 4),
    "feature_importances": feat_imp_sorted,
    "states"            : sorted(df["state"].unique().tolist()),
    "soil_types"        : soil_types,
    "dataset_version"   : "v2_state_aware",
}
with open(META_FILE, "w") as f:
    json.dump(meta, f, indent=2)
print(f"📄 Metadata saved → {META_FILE}")


# ── Demo Prediction ─────────────────────────────────
print("\n🧪 Demo Predictions:")

# Test wheat recommendation for Uttar Pradesh
test_cases = [
    {"state": "Uttar Pradesh", "soil_type": "Alluvial soil", "N": 110, "P": 30, "K": 30,
     "temperature": 22, "humidity": 60, "ph": 7.0, "rainfall": 150, "desc": "UP — Wheat soil"},
    {"state": "Assam", "soil_type": "Laterite soil", "N": 85, "P": 41, "K": 43,
     "temperature": 21, "humidity": 82, "ph": 6.25, "rainfall": 233, "desc": "Assam — Rice soil"},
    {"state": "Gujarat", "soil_type": "Desert soils", "N": 86, "P": 36, "K": 24,
     "temperature": 26.5, "humidity": 72.9, "ph": 5.78, "rainfall": 73.3, "desc": "Gujarat — Cotton soil"},
]

for tc in test_cases:
    state_val = state_encoder.transform([tc["state"]])[0] if tc["state"] in state_encoder.classes_ else 0
    soil_val = soil_encoder.transform([tc["soil_type"]])[0] if tc["soil_type"] in soil_encoder.classes_ else 0
    sample = pd.DataFrame([{
        "state_enc": state_val,
        "soil_enc": soil_val,
        "N": tc["N"], "P": tc["P"], "K": tc["K"],
        "temperature": tc["temperature"], "humidity": tc["humidity"],
        "ph": tc["ph"], "rainfall": tc["rainfall"],
    }])
    pred_proba = pipeline.predict_proba(sample)[0]
    top3_idx = np.argsort(pred_proba)[::-1][:3]
    print(f"\n   {tc['desc']}:")
    for i in top3_idx:
        print(f"      {class_names[i]:<20} {pred_proba[i]*100:.1f}%")

print("\n✅ Model 1 training complete!\n")
