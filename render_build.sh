#!/usr/bin/env bash
# Render build script — installs deps, fetches LFS files, retrains ML models

set -e  # Exit on error

echo "=== Installing Git LFS and fetching large files ==="
git lfs install
git lfs pull

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Creating model output directory ==="
mkdir -p latest_model/disease

echo "=== Verifying datasets ==="
echo "Datasets:"
ls -la datasets/
wc -l datasets/*.csv 2>/dev/null || true

if [ ! -f "latest_model/crop_recommendation_rf.pkl" ]; then
    echo "=== Models missing: Retraining ML models ==="
    cd api
    python retrain_models.py
    cd ..
else
    echo "=== Pre-trained ML models found in Git LFS, skipping retraining to save memory ==="
fi

echo "=== Build complete ==="
echo "Models saved in latest_model/"
ls -la latest_model/
ls -la latest_model/disease/
