

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer


DATA_PATH   = r"C:\Users\agmarknet_india_historical_prices_2024_2025.csv"
OUTPUT_DIR  = r"C:\Users\SIH25010\latest_model"
MODEL_FILE  = os.path.join(OUTPUT_DIR, "crop_price_xgboost.pkl")
META_FILE   = os.path.join(OUTPUT_DIR, "crop_price_xgboost_meta.json")
RANDOM_SEED = 42

os.makedirs(OUTPUT_DIR, exist_ok=True)


print("=" * 60)
print("  CROP PRICE PREDICTION — GRADIENT BOOSTING")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
print(f"\n📂 Dataset shape  : {df.shape}")
print(f"   Columns        : {list(df.columns)}")
print(f"   Missing values : {df.isnull().sum().sum()}")

df = df.rename(columns={
    "District Name"             : "district",
    "Market Name"               : "market",
    "Commodity"                 : "commodity",
    "Variety"                   : "variety",
    "Grade"                     : "grade",
    "Min Price (Rs./Quintal)"   : "min_price",
    "Max Price (Rs./Quintal)"   : "max_price",
    "Modal Price (Rs./Quintal)" : "modal_price",
    "Price Date"                : "price_date",
    "State"                     : "state",
})

df["price_date"] = pd.to_datetime(df["price_date"], dayfirst=True, errors="coerce")
df["month"] = df["price_date"].dt.month.fillna(1).astype(int)
df["year"]  = df["price_date"].dt.year.fillna(2024).astype(int)


df["price_spread"] = df["max_price"] - df["min_price"]

# Drop rows with missing target
df = df.dropna(subset=["modal_price"])
print(f"   After cleaning  : {df.shape[0]} rows")


print(f"\n📊 Target (modal_price) stats:")
print(df["modal_price"].describe().round(2).to_string())


CAT_FEATURES = ["state", "district", "market", "commodity", "variety", "grade"]
NUM_FEATURES = ["min_price", "max_price", "price_spread", "month", "year"]
ALL_FEATURES = CAT_FEATURES + NUM_FEATURES
TARGET_COL   = "modal_price"

X = df[ALL_FEATURES].copy()
y = df[TARGET_COL].values


for col in CAT_FEATURES:
    X[col] = X[col].fillna("Unknown")


for col in NUM_FEATURES:
    X[col] = X[col].fillna(0)

print(f"\n   Features used  : {ALL_FEATURES}")
print(f"   Unique commodities ({df['commodity'].nunique()}): {sorted(df['commodity'].unique())[:10]} ...")
print(f"   Unique states ({df['state'].nunique()}): {sorted(df['state'].unique())}")


SAMPLE_SIZE = 100_000
if len(X) > SAMPLE_SIZE:
    print(f"\n⚡ Sampling {SAMPLE_SIZE:,} rows from {len(X):,} for faster training …")
    np.random.seed(RANDOM_SEED)
    sample_idx = np.random.choice(len(X), size=SAMPLE_SIZE, replace=False)
    X = X.iloc[sample_idx].reset_index(drop=True)
    y = y[sample_idx]


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=RANDOM_SEED
)
print(f"\n📊 Train size : {X_train.shape[0]}  |  Test size : {X_test.shape[0]}")


cat_transformer = OrdinalEncoder(
    handle_unknown="use_encoded_value",
    unknown_value=-1
)
num_transformer = StandardScaler()

preprocessor = ColumnTransformer([
    ("cat", cat_transformer, CAT_FEATURES),
    ("num", num_transformer, NUM_FEATURES),
])


pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", GradientBoostingRegressor(
        n_estimators      = 300,
        learning_rate     = 0.05,
        max_depth         = 5,
        min_samples_split = 10,
        min_samples_leaf  = 5,
        subsample         = 0.8,
        max_features      = "sqrt",
        random_state      = RANDOM_SEED,
    ))
])


print("\n🔄 Running 3-fold cross-validation (R²) …")
cv_scores = cross_val_score(
    pipeline, X_train, y_train, cv=3,
    scoring="r2", n_jobs=-1
)
print(f"   CV R² : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

print("\n🏋️ Training final model …")
pipeline.fit(X_train, y_train)


y_pred = pipeline.predict(X_test)
mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)
mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-9))) * 100

print(f"\n✅ Test Metrics:")
print(f"   MAE   : ₹{mae:,.2f}")
print(f"   RMSE  : ₹{rmse:,.2f}")
print(f"   R²    : {r2:.4f}")
print(f"   MAPE  : {mape:.2f}%")


gb_model    = pipeline.named_steps["model"]
importances = gb_model.feature_importances_
feat_imp    = dict(zip(ALL_FEATURES, importances.round(4).tolist()))
feat_imp_sorted = dict(sorted(feat_imp.items(), key=lambda x: x[1], reverse=True))
print("\n📌 Feature Importances:")
for feat, imp in feat_imp_sorted.items():
    bar = "█" * int(imp * 50)
    print(f"   {feat:<18} {imp:.4f}  {bar}")


bundle = {
    "pipeline"       : pipeline,
    "feature_cols"   : ALL_FEATURES,
    "cat_features"   : CAT_FEATURES,
    "num_features"   : NUM_FEATURES,
    "target_col"     : TARGET_COL,
    "commodities"    : sorted(df["commodity"].unique().tolist()),
    "states"         : sorted(df["state"].unique().tolist()),
}
joblib.dump(bundle, MODEL_FILE, compress=3)
print(f"\n💾 Model saved → {MODEL_FILE}")

meta = {
    "model_type"      : "GradientBoostingRegressor",
    "sklearn_version" : __import__("sklearn").__version__,
    "feature_cols"    : ALL_FEATURES,
    "target_col"      : TARGET_COL,
    "n_estimators"    : 300,
    "learning_rate"   : 0.05,
    "max_depth"       : 5,
    "train_samples"   : int(X_train.shape[0]),
    "test_samples"    : int(X_test.shape[0]),
    "cv_r2_mean"      : round(float(cv_scores.mean()), 4),
    "cv_r2_std"       : round(float(cv_scores.std()), 4),
    "test_mae"        : round(float(mae), 2),
    "test_rmse"       : round(float(rmse), 2),
    "test_r2"         : round(float(r2), 4),
    "test_mape_pct"   : round(float(mape), 2),
    "feature_importances": feat_imp_sorted,
}
with open(META_FILE, "w") as f:
    json.dump(meta, f, indent=2)
print(f"📄 Metadata saved → {META_FILE}")

print("\n🌾 Demo Prediction:")
sample = pd.DataFrame([{
    "state"       : "Uttar Pradesh",
    "district"    : "Auraiya",
    "market"      : "Achalda",
    "commodity"   : "Wheat",
    "variety"     : "Dara",
    "grade"       : "FAQ",
    "min_price"   : 2200,
    "max_price"   : 2500,
    "price_spread": 300,
    "month"       : 4,
    "year"        : 2025,
}])
pred_price = pipeline.predict(sample)[0]
print(f"   Input   : Wheat, Achalda (Uttar Pradesh), Apr 2025, min=₹2200, max=₹2500")
print(f"   → Predicted modal price: ₹{pred_price:,.0f}")

print("\n✅ Model 2 complete!\n")



}])

predicted_price = pipeline.predict(sample)[0]
print(f"Predicted modal price: ₹{predicted_price:,.0f}")
