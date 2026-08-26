"""
Quick retraining script — Retrains models with the current sklearn version.
Retrains crop recommendation with the new state-aware dataset.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "latest_model")
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")

# Ensure the output directory exists before attempting to save models
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════
# MODEL 1: Crop Recommendation (RandomForest) — NEW STATE-AWARE DATASET
# ═══════════════════════════════════════════════════
print("=" * 60)
print("  RETRAINING: Crop Recommendation (RF) — State-Aware")
print("=" * 60)

# Try new dataset first, fall back to old dataset
NEW_DATA_PATH = os.path.join(DATASETS_DIR, "crop_data.csv")
OLD_DATA_PATH = os.path.join(DATASETS_DIR, "Crop_recommendation.csv")

if os.path.exists(NEW_DATA_PATH):
    df = pd.read_csv(NEW_DATA_PATH)
    print(f"Dataset: {df.shape[0]} rows, {df.shape[1]} cols (NEW state-aware dataset)")

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

    # Clean data
    df = df.dropna(subset=["label", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
    print(f"After cleaning: {df.shape[0]} rows")

    # ── IMPORTANT: Augment data to ensure sufficient samples per crop ──
    # The dataset has only ~15 samples per crop on average, which is too sparse.
    # We augment by adding jittered copies of underrepresented crops.
    MIN_SAMPLES = 10
    crop_counts = df["label"].value_counts()
    underrep_crops = crop_counts[crop_counts < MIN_SAMPLES].index.tolist()
    print(f"Augmenting {len(underrep_crops)} underrepresented crops (< {MIN_SAMPLES} samples)")

    augmented_rows = []
    np.random.seed(42)
    for crop_name in underrep_crops:
        crop_df = df[df["label"] == crop_name]
        n_needed = MIN_SAMPLES - len(crop_df)
        for _ in range(n_needed):
            # Sample a random existing row and jitter numerical values
            row = crop_df.sample(1, replace=True).iloc[0].copy()
            for col in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
                jitter = np.random.normal(0, row[col] * 0.05 + 0.5)  # 5% noise
                row[col] = max(0, row[col] + jitter)
            augmented_rows.append(row)

    if augmented_rows:
        aug_df = pd.DataFrame(augmented_rows)
        df = pd.concat([df, aug_df], ignore_index=True)
        print(f"After augmentation: {df.shape[0]} rows")

    print(f"States: {df['state'].nunique()} unique")
    print(f"Crops: {df['label'].nunique()} unique")
    print(f"Soil types: {df['soil_type'].nunique()} unique")

    # Encode categorical features
    state_encoder = LabelEncoder()
    soil_encoder = LabelEncoder()
    df["state_enc"] = state_encoder.fit_transform(df["state"].fillna("Unknown"))
    df["soil_enc"] = soil_encoder.fit_transform(df["soil_type"].fillna("Unknown"))

    FEATURE_COLS = ["state_enc", "soil_enc", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[FEATURE_COLS].values
    y = df["label"].values

    # ── CRITICAL: Fit label encoder on the SAME data used for training ──
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    class_names = list(le.classes_)
    print(f"Total classes: {len(class_names)}")

    # All classes now have >= MIN_SAMPLES, so stratified split should work
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_enc, test_size=0.20, random_state=42, stratify=y_enc
        )
    except ValueError:
        # Fallback to non-stratified split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_enc, test_size=0.20, random_state=42
        )
        print("  [WARN] Used non-stratified split")

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=60, max_depth=15,
            min_samples_split=2, min_samples_leaf=1,
            max_features="sqrt", class_weight="balanced",
            random_state=42, n_jobs=-1,
        ))
    ])
    pipeline.fit(X_train, y_train)

    from sklearn.metrics import accuracy_score
    acc = accuracy_score(y_test, pipeline.predict(X_test))
    print(f"Test Accuracy: {acc:.4f}")

    # Verify: pipeline output classes match label encoder
    n_pipeline_classes = pipeline.named_steps["clf"].n_classes_
    n_encoder_classes = len(le.classes_)
    print(f"Pipeline classes: {n_pipeline_classes}, Encoder classes: {n_encoder_classes}")
    assert n_pipeline_classes == n_encoder_classes, \
        f"MISMATCH: pipeline has {n_pipeline_classes} classes but encoder has {n_encoder_classes}"

    # Build state → crops mapping from dataset for quick lookup
    state_crops_map = {}
    for state_name in df["state"].unique():
        state_df = df[df["state"] == state_name]
        crop_counts = state_df["label"].value_counts()
        state_crops_map[state_name] = crop_counts.index.tolist()

    # Build soil types list
    soil_types = sorted(df["soil_type"].dropna().unique().tolist())

    bundle = {
        "pipeline": pipeline,
        "label_encoder": le,
        "state_encoder": state_encoder,
        "soil_encoder": soil_encoder,
        "feature_cols": FEATURE_COLS,
        "raw_feature_cols": ["state", "soil_type", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
        "class_names": class_names,
        "states": sorted(df["state"].unique().tolist()),
        "soil_types": soil_types,
        "state_crops_map": state_crops_map,
        "dataset_version": "v2_state_aware",
    }
    model_path = os.path.join(OUTPUT_DIR, "crop_recommendation_rf.pkl")
    joblib.dump(bundle, model_path, compress=3)
    print(f"[OK] Saved: {model_path}")

    # Quick verification
    state_val = state_encoder.transform(["Uttar Pradesh"])[0]
    soil_val = soil_encoder.transform(["Alluvial soil"])[0]
    sample = pd.DataFrame([{
        "state_enc": state_val, "soil_enc": soil_val,
        "N": 90, "P": 42, "K": 43,
        "temperature": 18, "humidity": 65, "ph": 7.0, "rainfall": 50,
    }])
    proba = pipeline.predict_proba(sample)[0]
    top5 = np.argsort(proba)[::-1][:5]
    print("\n  Quick verify — Wheat-like inputs for UP:")
    for i in top5:
        print(f"    {class_names[i]:25s} {proba[i]*100:.2f}%")

elif os.path.exists(OLD_DATA_PATH):
    # Fallback to old dataset
    df = pd.read_csv(OLD_DATA_PATH)
    print(f"Dataset: {df.shape[0]} rows, {df.shape[1]} cols (OLD dataset fallback)")

    FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[FEATURE_COLS].values
    y = df["label"].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    class_names = list(le.classes_)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=42, stratify=y_enc
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=60, max_depth=15,
            min_samples_split=2, min_samples_leaf=1,
            max_features="sqrt", class_weight="balanced",
            random_state=42, n_jobs=-1,
        ))
    ])
    pipeline.fit(X_train, y_train)

    from sklearn.metrics import accuracy_score
    acc = accuracy_score(y_test, pipeline.predict(X_test))
    print(f"Test Accuracy: {acc:.4f}")

    bundle = {
        "pipeline": pipeline,
        "label_encoder": le,
        "feature_cols": FEATURE_COLS,
        "raw_feature_cols": FEATURE_COLS,
        "class_names": class_names,
        "dataset_version": "v1_legacy",
    }
    model_path = os.path.join(OUTPUT_DIR, "crop_recommendation_rf.pkl")
    joblib.dump(bundle, model_path, compress=3)
    print(f"[OK] Saved: {model_path}")
else:
    print("[WARN] No crop recommendation dataset found, skipping.")


# ═══════════════════════════════════════════════════
# MODEL 2: Crop Yield (GradientBoosting)
# ═══════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  RETRAINING: Crop Yield (GradientBoosting)")
print("=" * 60)

DATA_PATH2 = os.path.join(DATASETS_DIR, "India Agriculture Crop Production.csv")
if os.path.exists(DATA_PATH2):
    df2 = pd.read_csv(DATA_PATH2)
    print(f"Dataset: {df2.shape[0]} rows")

    if df2.shape[0] < 100:
        print("[WARN] Dataset too small (likely LFS pointer). Skipping yield model.")
        print("   Run 'git lfs pull' to fetch the actual dataset.")
    else:
        df2["year_num"] = df2["Year"].str[:4].astype(int)
        df2 = df2.dropna(subset=["Yield", "Area", "Crop", "Season"])
        df2 = df2[df2["Yield"] > 0]
        q995 = df2["Yield"].quantile(0.995)
        df2 = df2[df2["Yield"] <= q995]

        print(f"After cleaning: {len(df2):,} rows")
        print(f"States: {df2['State'].nunique()}, Districts: {df2['District'].nunique()}, Crops: {df2['Crop'].nunique()}")

        # Build state → districts mapping BEFORE any sampling (full dataset)
        state_districts_map = {}
        for s in sorted(df2["State"].unique()):
            state_districts_map[s] = sorted(df2[df2["State"] == s]["District"].dropna().unique().tolist())

        # Train on FULL dataset — no sampling, to preserve all districts
        CAT_FEATURES = ["State", "District", "Crop", "Season"]
        NUM_FEATURES = ["log_area", "year_num"]
        ALL_FEATURES = CAT_FEATURES + NUM_FEATURES

        df2["log_area"] = np.log1p(df2["Area"])
        X2 = df2[ALL_FEATURES].copy()
        y2 = df2["Yield"].values

        for col in CAT_FEATURES:
            X2[col] = X2[col].fillna("Unknown")

        split_year = 2018
        mask_train = df2["year_num"] < split_year
        mask_test = df2["year_num"] >= split_year

        X2_train, y2_train = X2[mask_train], y2[mask_train]
        X2_test, y2_test = X2[mask_test], y2[mask_test]

        print(f"Train: {len(X2_train):,} rows, Test: {len(X2_test):,} rows")

        cat_transformer = Pipeline([("enc", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))])
        num_transformer = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
        preprocessor = ColumnTransformer([("cat", cat_transformer, CAT_FEATURES), ("num", num_transformer, NUM_FEATURES)])

        pipeline2 = Pipeline([
            ("preprocessor", preprocessor),
            ("model", GradientBoostingRegressor(
                n_estimators=200, learning_rate=0.08, max_depth=5,
                min_samples_split=20, min_samples_leaf=10,
                subsample=0.8, max_features="sqrt", random_state=42,
            ))
        ])
        print("Training yield model on FULL dataset...")
        pipeline2.fit(X2_train, y2_train)

        from sklearn.metrics import r2_score
        y2_pred = np.maximum(pipeline2.predict(X2_test), 0)
        r2 = r2_score(y2_test, y2_pred)
        print(f"Test R²: {r2:.4f}")

        bundle2 = {
            "pipeline": pipeline2,
            "feature_cols": ALL_FEATURES,
            "cat_features": CAT_FEATURES,
            "num_features": NUM_FEATURES,
            "target_col": "Yield",
            "target_unit": "Tonnes per Hectare",
            "crops": sorted(df2["Crop"].unique().tolist()),
            "states": sorted(df2["State"].unique().tolist()),
            "seasons": sorted(df2["Season"].unique().tolist()),
            "year_range": [int(df2["year_num"].min()), int(df2["year_num"].max())],
            "state_districts_map": state_districts_map,
        }
        model_path2 = os.path.join(OUTPUT_DIR, "crop_yield_xgboost.pkl")
        joblib.dump(bundle2, model_path2, compress=3)
        print(f"[OK] Saved: {model_path2}")
        print(f"     Districts in model: {sum(len(v) for v in state_districts_map.values())}")
else:
    print("[WARN] Yield dataset not found, skipping.")


# ═══════════════════════════════════════════════════
# MODEL 3: Crop Price (GradientBoosting)
# ═══════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  RETRAINING: Crop Price (GradientBoosting)")
print("=" * 60)

DATA_PATH3 = os.path.join(DATASETS_DIR, "agmarknet_india_historical_prices_2024_2025.csv")
if os.path.exists(DATA_PATH3):
    df3 = pd.read_csv(DATA_PATH3)
    print(f"Dataset: {df3.shape[0]} rows")

    df3 = df3.rename(columns={
        "District Name":             "district",
        "Market Name":               "market",
        "Commodity":                 "commodity",
        "Variety":                   "variety",
        "Grade":                     "grade",
        "Min Price (Rs./Quintal)":   "min_price",
        "Max Price (Rs./Quintal)":   "max_price",
        "Modal Price (Rs./Quintal)": "modal_price",
        "Price Date":                "price_date",
        "State":                     "state",
    })

    df3["price_date"] = pd.to_datetime(df3["price_date"], dayfirst=True, errors="coerce")
    df3["month"] = df3["price_date"].dt.month.fillna(1).astype(int)
    df3["year"]  = df3["price_date"].dt.year.fillna(2024).astype(int)
    df3["price_spread"] = df3["max_price"] - df3["min_price"]
    df3 = df3.dropna(subset=["modal_price"])

    SAMPLE_SIZE3 = 100_000
    if len(df3) > SAMPLE_SIZE3:
        df3 = df3.sample(n=SAMPLE_SIZE3, random_state=42).reset_index(drop=True)

    CAT_FEATURES3 = ["state", "district", "market", "commodity", "variety", "grade"]
    NUM_FEATURES3 = ["min_price", "max_price", "price_spread", "month", "year"]
    ALL_FEATURES3 = CAT_FEATURES3 + NUM_FEATURES3

    X3 = df3[ALL_FEATURES3].copy()
    y3 = df3["modal_price"].values
    for col in CAT_FEATURES3:
        X3[col] = X3[col].fillna("Unknown")
    for col in NUM_FEATURES3:
        X3[col] = X3[col].fillna(0)

    X3_train, X3_test, y3_train, y3_test = train_test_split(X3, y3, test_size=0.20, random_state=42)

    cat_transformer3 = Pipeline([("enc", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))])
    num_transformer3 = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    preprocessor3 = ColumnTransformer([("cat", cat_transformer3, CAT_FEATURES3), ("num", num_transformer3, NUM_FEATURES3)])

    pipeline3 = Pipeline([
        ("preprocessor", preprocessor3),
        ("model", GradientBoostingRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=5,
            min_samples_split=10, min_samples_leaf=5,
            subsample=0.8, max_features="sqrt", random_state=42,
        ))
    ])
    print("Training price model...")
    pipeline3.fit(X3_train, y3_train)

    from sklearn.metrics import r2_score as r2_score_price
    r2_price = r2_score_price(y3_test, pipeline3.predict(X3_test))
    print(f"Test R²: {r2_price:.4f}")

    bundle3 = {
        "pipeline":     pipeline3,
        "feature_cols": ALL_FEATURES3,
        "cat_features": CAT_FEATURES3,
        "num_features": NUM_FEATURES3,
        "target_col":   "modal_price",
        "commodities":  sorted(df3["commodity"].unique().tolist()),
        "states":       sorted(df3["state"].unique().tolist()),
    }
    model_path3 = os.path.join(OUTPUT_DIR, "crop_price_xgboost.pkl")
    joblib.dump(bundle3, model_path3, compress=3)
    print(f"[OK] Saved: {model_path3}")
else:
    print("[WARN] Price dataset not found, skipping.")


print("\nAll models retrained with current sklearn version!")
print(f"   sklearn: {__import__('sklearn').__version__}")
print(f"   numpy:   {np.__version__}")
