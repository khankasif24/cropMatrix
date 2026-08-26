"""Quick comparison: per-state accuracy to show real-world effectiveness."""
import os, numpy as np, pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, top_k_accuracy_score

df = pd.read_csv('../datasets/crop_data.csv')
df = df.rename(columns={
    'N_SOIL':'N','P_SOIL':'P','K_SOIL':'K',
    'TEMPERATURE':'temperature','HUMIDITY':'humidity',
    'RAINFALL':'rainfall','CROP':'label',
    'STATE':'state','SOIL_TYPE':'soil_type',
})
df = df.dropna(subset=['label','N','P','K','temperature','humidity','ph','rainfall'])

total_crops = df['label'].nunique()
print(f"Total crops in full dataset: {total_crops}")
print(f"Total rows: {len(df)}")
print()

print("=" * 65)
print("  PER-STATE ACCURACY (simulating real-world app usage)")
print("=" * 65)
print(f"{'State':<22} {'Crops':>5}  {'Rows':>5}  {'Top-1':>6}  {'Top-3':>6}")
print("-" * 65)

states = ['Uttar Pradesh', 'Maharashtra', 'Punjab', 'Tamil Nadu',
          'West Bengal', 'Karnataka', 'Madhya Pradesh', 'Rajasthan']

for state in states:
    state_df = df[df['state'] == state].copy()
    n_crops = state_df['label'].nunique()
    if len(state_df) < 20 or n_crops < 3:
        continue

    se = LabelEncoder()
    so = LabelEncoder()
    le = LabelEncoder()
    state_df['state_enc'] = se.fit_transform(state_df['state'].fillna('X'))
    state_df['soil_enc'] = so.fit_transform(state_df['soil_type'].fillna('X'))

    feats = ['state_enc','soil_enc','N','P','K','temperature','humidity','ph','rainfall']
    X = state_df[feats].values
    y = le.fit_transform(state_df['label'].values)

    try:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    except:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)

    pipe = Pipeline([
        ('s', StandardScaler()),
        ('c', RandomForestClassifier(
            n_estimators=60, max_depth=15,
            class_weight='balanced', random_state=42, n_jobs=-1
        ))
    ])
    pipe.fit(Xtr, ytr)

    acc1 = accuracy_score(yte, pipe.predict(Xte))

    proba = pipe.predict_proba(Xte)
    try:
        acc3 = top_k_accuracy_score(yte, proba, k=min(3, n_crops), labels=pipe.named_steps['c'].classes_)
    except:
        acc3 = acc1

    print(f"{state:<22} {n_crops:>5}  {len(state_df):>5}  {acc1*100:>5.1f}%  {acc3*100:>5.1f}%")

print()
print("NOTE: In the real app, users select a state first,")
print("so the model only competes among that state's crops.")
print("This is the accuracy that matters for user experience.")
