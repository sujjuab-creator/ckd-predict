import sys
import os
import shap
import pandas as pd
import numpy as np

# Ensure backend/ml is in sys.path
ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml'))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

from model_registry import load_artifacts
from predict import format_feature_dict, MEDICAL_DISCLAIMER

def generate_shap_explanation(input_features_dict, top_n=10):
    """
    Generate SHAP feature attribution explanation for individual patient prediction.
    
    Returns:
    {
      "success": True,
      "model": str,
      "base_value": float,
      "prediction_value": float,
      "features": [
        {
          "feature": str,
          "input_value": float,
          "shap_value": float,
          "impact": str
        }, ...
      ],
      "disclaimer": str
    }
    """
    model, preprocessor, feature_names, metadata = load_artifacts()

    # Format input into DataFrame
    input_df = format_feature_dict(input_features_dict, feature_names)

    # Transform using saved preprocessor
    input_scaled = preprocessor.transform(input_df)

    # Initialize SHAP TreeExplainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer(input_scaled)

    # Handle shape of shap_values for binary classification
    # shap_values could be Explainer object or numpy array
    if hasattr(shap_values, "values"):
        vals = shap_values.values
        base_val = shap_values.base_values
    else:
        vals = shap_values
        base_val = getattr(explainer, "expected_value", 0.5)

    # Extract 1D array of SHAP values for the positive class (class 1: CKD Risk)
    if vals.ndim == 3:
        # Shape: (samples, features, classes) -> take positive class (index 1)
        sample_shap = vals[0, :, 1]
    elif vals.ndim == 2:
        # Shape: (samples, features)
        sample_shap = vals[0, :]
    else:
        sample_shap = np.array(vals).flatten()

    # Extract base value scalar safely
    try:
        if isinstance(base_val, np.ndarray):
            flat_vals = base_val.flatten()
            base_val_scalar = float(flat_vals[1]) if len(flat_vals) > 1 else float(flat_vals[0])
        elif isinstance(base_val, (list, tuple)):
            base_val_scalar = float(base_val[1]) if len(base_val) > 1 else float(base_val[0])
        else:
            base_val_scalar = float(base_val)
    except Exception:
        base_val_scalar = 0.5


    # Calculate model prediction output (probability)
    pred_prob = float(model.predict_proba(input_scaled)[0, 1])

    # Feature contribution objects
    feature_contributions = []
    for idx, feature_name in enumerate(feature_names):
        val = float(input_df[feature_name].values[0])
        shap_val = float(sample_shap[idx])
        abs_impact = abs(shap_val)

        if shap_val > 0.001:
            impact_desc = "contributed to higher model CKD-risk prediction"
        elif shap_val < -0.001:
            impact_desc = "contributed to lower model CKD-risk prediction"
        else:
            impact_desc = "minimal contribution to model prediction"

        feature_contributions.append({
            "feature": feature_name,
            "input_value": round(val, 2),
            "shap_value": round(shap_val, 4),
            "abs_impact": abs_impact,
            "impact": impact_desc
        })

    # Sort by absolute SHAP impact descending
    feature_contributions.sort(key=lambda x: x["abs_impact"], reverse=True)

    # Return top N features
    top_features = [
        {
            "feature": item["feature"],
            "input_value": item["input_value"],
            "shap_value": item["shap_value"],
            "impact": item["impact"]
        }
        for item in feature_contributions[:top_n]
    ]

    return {
        "success": True,
        "model": metadata.get("model_name", "Random Forest Classifier"),
        "base_value": round(base_val_scalar, 4),
        "prediction_value": round(pred_prob, 4),
        "features": top_features,
        "disclaimer": MEDICAL_DISCLAIMER
    }

if __name__ == '__main__':
    sample_patient = {
        'Age': 62,
        'BMI': 30.5,
        'SystolicBP': 142,
        'SerumCreatinine': 2.3,
        'GFR': 40.0,
        'ProteinInUrine': 1.8
    }
    exp = generate_shap_explanation(sample_patient, top_n=5)
    print("[SHAP EXPLANATION TEST SUCCESS]:")
    print(exp)
