import os
import json
import joblib

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')

_model_cache = None
_preprocessor_cache = None
_feature_names_cache = None
_metadata_cache = None

def load_artifacts(force_reload=False):
    """Load model, preprocessor, feature names, and metadata from artifacts directory."""
    global _model_cache, _preprocessor_cache, _feature_names_cache, _metadata_cache

    if not force_reload and _model_cache is not None:
        return _model_cache, _preprocessor_cache, _feature_names_cache, _metadata_cache

    model_path = os.path.join(ARTIFACTS_DIR, 'model.joblib')
    preprocessor_path = os.path.join(ARTIFACTS_DIR, 'preprocessor.joblib')
    feature_names_path = os.path.join(ARTIFACTS_DIR, 'feature_names.json')
    metadata_path = os.path.join(ARTIFACTS_DIR, 'model_metadata.json')

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at {model_path}. Run backend/ml/train.py first.")
    if not os.path.exists(preprocessor_path):
        raise FileNotFoundError(f"Preprocessor artifact not found at {preprocessor_path}.")

    _model_cache = joblib.load(model_path)
    _preprocessor_cache = joblib.load(preprocessor_path)

    with open(feature_names_path, 'r') as f:
        _feature_names_cache = json.load(f)

    with open(metadata_path, 'r') as f:
        _metadata_cache = json.load(f)

    return _model_cache, _preprocessor_cache, _feature_names_cache, _metadata_cache
