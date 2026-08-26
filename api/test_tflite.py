"""Quick test: verify disease detection with TFLite works."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from disease_service import load_disease_models, get_supported_disease_crops
load_disease_models()
crops = get_supported_disease_crops()
for c in crops:
    print(f"  {c['name']}: {'[OK] loaded' if c['available'] else '[X] not loaded'}")
print("\nDone!")
