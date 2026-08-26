

import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

warnings.filterwarnings("ignore")


DATA_PATH  = "/mnt/user-data/uploads/India_Agriculture_Crop_Production.csv"
OUTPUT_DIR = "/mnt/user-data/outputs"
MODEL_FILE = os.path.join(OUTPUT_DIR, "crop_yield_xgboost.pkl")
META_FILE  = os.path.join(OUTPUT_DIR, "crop_yield_xgboost_meta.json")
RANDOM_SEED = 42

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 62)
print("  CROP YIELD PREDICTION — GRADIENT BOOSTING (XGBoost-style)")
print("=" * 62)

df = pd.read_csv(DATA_PATH)
print(f"\n📂 Raw dataset    : {df.shape[0]:,} rows × {df.shape[1]} cols")
──

df["year_num"] = df["Year"].str[:4].astype(int)


df = df.dropna(subset=["Yield", "Area", "Crop", "Season"])


df = df[df["Yield"] > 0]

q995 = df["Yield"].quantile(0.995)
df   = df[df["Yield"] <= q995]

print(f"   After cleaning  : {df.shape[0]:,} rows")

SAMPLE_SIZE = 80_000
if len(df) > SAMPLE_SIZE:
    df = df.sample(n=SAMPLE_SIZE, random_state=RANDOM_SEED).reset_index(drop=True)
    print(f"   Random sample   : {len(df):,} rows")
print(f"   Year range      : {df['year_num'].min()} – {df['year_num'].max()}")
print(f"   Unique states   : {df['State'].nunique()}")
print(f"   Unique crops    : {df['Crop'].nunique()} → {sorted(df['Crop'].unique())}")
print(f"   Seasons         : {df['Season'].unique().tolist()}")


unit_map = {"Tonnes": 1, "Bales": 2, "Nuts": 3}
df["prod_unit_enc"] = df["Production Units"].map(unit_map).fillna(1).astype(int)


df["log_area"]       = np.log1p(df["Area"])
df["log_production"] = np.log1p(df["Production"].fillna(0))


y = df["Yield"].values


print(f"\n📊 Target (Yield — Tonnes/Ha) stats:")
stats = df["Yield"].describe()
for k, v in stats.items():
    print(f"   {k:<8}: {v:.4f}")


CAT_FEATURES = ["State", "District", "Crop", "Season"]
NUM_FEATURES = ["log_area", "year_num"]
ALL_FEATURES = CAT_FEATURES + NUM_FEATURES

X = df[ALL_FEATURES].copy()


for col in CAT_FEATURES:
    X[col] = X[col].fillna("Unknown")

print(f"\n   Features        : {ALL_FEATURES}")


split_year = 2018
mask_train = df["year_num"] < split_year
mask_test  = df["year_num"] >= split_year

X_train, y_train = X[mask_train], y[mask_train]
X_test,  y_test  = X[mask_test],  y[mask_test]

print(f"\n📊 Temporal split (train < {split_year}, test ≥ {split_year})")
print(f"   Train : {X_train.shape[0]:,}  |  Test : {X_test.shape[0]:,}")

cat_transformer = Pipeline([
    ("enc", OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=-1
    ))
])

num_transformer = Pipeline([
    ("impute", SimpleImputer(strategy="median")),
    ("scale",  StandardScaler())
])

preprocessor = ColumnTransformer([
    ("cat", cat_transformer, CAT_FEATURES),
    ("num", num_transformer, NUM_FEATURES),
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", GradientBoostingRegressor(
       
        n_estimators      = 200,
        learning_rate     = 0.08,
        max_depth         = 5,
        min_samples_split = 20,
        min_samples_leaf  = 10,
        subsample         = 0.8,
        max_features      = "sqrt",
        random_state      = RANDOM_SEED,
    ))
])

print("\n🔄 Running 5-fold cross-validation (R²) on train set …")
cv_scores = cross_val_score(
    pipeline, X_train, y_train,
    cv=5, scoring="r2", n_jobs=-1
)
print(f"   CV R²  : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")


print("\n🚀 Training final model …")
pipeline.fit(X_train, y_train)
print("   Training complete.")

y_pred = pipeline.predict(X_test)
y_pred = np.maximum(y_pred, 0)   

mae    = mean_absolute_error(y_test, y_pred)
rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
r2     = r2_score(y_test, y_pred)
mape   = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-6))) * 100

print(f"\n✅ Test Metrics (years ≥ {split_year}):")
print(f"   MAE   : {mae:.4f} Tonnes/Ha")
print(f"   RMSE  : {rmse:.4f} Tonnes/Ha")
print(f"   R²    : {r2:.4f}")
print(f"   MAPE  : {mape:.2f}%")


print("\n📋 Per-crop R² (top 15 crops by sample count):")
test_df = X_test.copy()
test_df["y_true"] = y_test
test_df["y_pred"] = y_pred
top_crops = test_df["Crop"].value_counts().head(15).index
print(f"   {'Crop':<25} {'Samples':>8}  {'R²':>8}  {'MAE':>10}")
print(f"   {'-'*55}")
for crop in top_crops:
    mask = test_df["Crop"] == crop
    if mask.sum() < 5:
        continue
    cr2  = r2_score(test_df.loc[mask, "y_true"], test_df.loc[mask, "y_pred"])
    cmae = mean_absolute_error(test_df.loc[mask, "y_true"], test_df.loc[mask, "y_pred"])
    print(f"   {crop:<25} {mask.sum():>8}  {cr2:>8.4f}  {cmae:>10.4f}")


gb_model    = pipeline.named_steps["model"]
importances = gb_model.feature_importances_
feat_imp    = dict(zip(ALL_FEATURES, importances.round(4).tolist()))
feat_imp_sorted = dict(sorted(feat_imp.items(), key=lambda x: x[1], reverse=True))
print("\n📌 Feature Importances:")
for feat, imp in feat_imp_sorted.items():
    bar = "█" * int(imp * 50)
    print(f"   {feat:<20} {imp:.4f}  {bar}")


bundle = {
    "pipeline"      : pipeline,
    "feature_cols"  : ALL_FEATURES,
    "cat_features"  : CAT_FEATURES,
    "num_features"  : NUM_FEATURES,
    "target_col"    : "Yield",
    "target_unit"   : "Tonnes per Hectare",
    "crops"         : sorted(df["Crop"].unique().tolist()),
    "states"        : sorted(df["State"].unique().tolist()),
    "seasons"       : sorted(df["Season"].unique().tolist()),
    "year_range"    : [int(df["year_num"].min()), int(df["year_num"].max())],
}
joblib.dump(bundle, MODEL_FILE, compress=3)
print(f"\n💾 Model saved → {MODEL_FILE}")

meta = {
    "model_type"        : "GradientBoostingRegressor (XGBoost-equivalent)",
    "xgboost_swap"      : "Replace with xgboost.XGBRegressor — same pipeline interface",
    "sklearn_version"   : __import__("sklearn").__version__,
    "dataset"           : "India_Agriculture_Crop_Production.csv",
    "records_trained"   : int(X_train.shape[0]),
    "records_tested"    : int(X_test.shape[0]),
    "train_years"       : f"up to {split_year - 1}",
    "test_years"        : f"{split_year} and beyond",
    "feature_cols"      : ALL_FEATURES,
    "target_col"        : "Yield",
    "target_unit"       : "Tonnes per Hectare",
    "n_crops"           : int(df["Crop"].nunique()),
    "n_states"          : int(df["State"].nunique()),
    "n_estimators"      : 200,
    "learning_rate"     : 0.08,
    "max_depth"         : 6,
    "cv_r2_mean"        : round(float(cv_scores.mean()), 4),
    "cv_r2_std"         : round(float(cv_scores.std()), 4),
    "test_mae"          : round(float(mae), 4),
    "test_rmse"         : round(float(rmse), 4),
    "test_r2"           : round(float(r2), 4),
    "test_mape_pct"     : round(float(mape), 2),
    "feature_importances": feat_imp_sorted,
    "crops"             : sorted(df["Crop"].unique().tolist()),
    "states"            : sorted(df["State"].unique().tolist()),
    "seasons"           : sorted(df["Season"].unique().tolist()),
}
with open(META_FILE, "w") as f:
    json.dump(meta, f, indent=2)
print(f"📄 Metadata saved → {META_FILE}")

# ── 10. Demo Prediction ───────────────────────────────────
print("\n🌾 Demo Predictions:")
demos = [
    {"State": "Punjab", "District": "LUDHIANA", "Crop": "Rice",
     "Season": "Kharif", "Area": 50000, "Production": 200000,
     "year_num": 2020, "prod_unit_enc": 1},
    {"State": "Maharashtra", "District": "PUNE", "Crop": "Wheat",
     "Season": "Rabi", "Area": 10000, "Production": 30000,
     "year_num": 2019, "prod_unit_enc": 1},
    {"State": "Karnataka", "District": "MYSORE", "Crop": "Sugarcane",
     "Season": "Whole Year", "Area": 5000, "Production": 350000,
     "year_num": 2021, "prod_unit_enc": 1},
]
for d in demos:
    sample = pd.DataFrame([{
        "State"         : d["State"],
        "District"      : d["District"],
        "Crop"          : d["Crop"],
        "Season"        : d["Season"],
        "log_area"      : np.log1p(d["Area"]),
        "log_production": np.log1p(d["Production"]),
        "year_num"      : d["year_num"],
        "prod_unit_enc" : d["prod_unit_enc"],
    }])
    pred = max(0, pipeline.predict(sample)[0])
    print(f"   {d['Crop']:<12} | {d['State']:<15} | {d['Season']:<11} | {d['year_num']} | Area={d['Area']:,} Ha → Yield: {pred:.3f} T/Ha")

print("\n✅ Model 2 (v2) complete!\n")


print(bundle["crops"])
print(bundle["states"])
print(bundle["seasons"])


sample = pd.DataFrame([{
    "State"         : "Punjab",
    "District"      : "LUDHIANA",
    "Crop"          : "Wheat",
    "Season"        : "Rabi",
    "log_area"      : np.log1p(20000),       
    "log_production": np.log1p(80000),       
    "year_num"      : 2024,
    "prod_unit_enc" : 1,                    
}])

predicted_yield = max(0, pipeline.predict(sample)[0])
print(f"Predicted yield: {predicted_yield:.3f} Tonnes/Hectare")

