import pandas as pd
import numpy as np
from model_registry import load_artifacts

MEDICAL_DISCLAIMER = (
    "This system provides an AI-assisted CKD risk prediction based on the supplied data "
    "and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional."
)

def format_feature_dict(input_dict, expected_features):
    """
    Format input dict into a pandas DataFrame matching expected feature column names.
    Supports camelCase or lowercase key variants and defaults missing numeric values to 0.0.
    """
    # Create lookup map for lowercase keys
    clean_input = {str(k).lower(): v for k, v in input_dict.items()}
    
    formatted_row = {}
    for feat in expected_features:
        feat_lower = feat.lower()
        if feat_lower in clean_input:
            val = clean_input[feat_lower]
            try:
                formatted_row[feat] = float(val) if val is not None else 0.0
            except (ValueError, TypeError):
                formatted_row[feat] = 0.0
        else:
            formatted_row[feat] = 0.0

    return pd.DataFrame([formatted_row], columns=expected_features)

def predict_ckd_risk(patient_data):
    """
    Execute prediction pipeline for input patient data dictionary.
    
    Returns structured dict:
    {
      "prediction": "CKD Risk" | "No CKD Risk",
      "prediction_result": "CKD Risk" | "No CKD Risk",
      "prediction_probability": float (0.0 to 1.0),
      "risk_percentage": float (0.0 to 100.0),
      "model_name": str,
      "disclaimer": str
    }
    """
    model, preprocessor, feature_names, metadata = load_artifacts()

    if not isinstance(patient_data, dict):
        raise ValueError("Patient data must be provided as a dictionary.")

    # Format input row into DataFrame with exact feature columns
    input_df = format_feature_dict(patient_data, feature_names)

    # Transform input using preprocessor fitted on training data
    input_scaled = preprocessor.transform(input_df)

    # Make prediction
    raw_pred = model.predict(input_scaled)[0]
    
    # Estimate probability
    prob = 0.5
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(input_scaled)[0]
        prob = float(probabilities[1]) if len(probabilities) > 1 else float(probabilities[0])
    elif hasattr(model, "decision_function"):
        score = model.decision_function(input_scaled)[0]
        prob = float(1 / (1 + np.exp(-score)))

    # Diagnosis 1 = CKD Risk, 0 = No CKD Risk
    prediction_label = "CKD Risk" if int(raw_pred) == 1 else "No CKD Risk"

    return {
        "prediction": prediction_label,
        "prediction_result": prediction_label,
        "prediction_probability": round(prob, 4),
        "risk_percentage": round(prob * 100, 2),
        "model_name": metadata.get("model_name", "Random Forest Classifier"),
        "disclaimer": MEDICAL_DISCLAIMER
    }

if __name__ == '__main__':
    # Test sample prediction with dummy feature vector
    test_sample = {
        'Age': 60,
        'BMI': 28.5,
        'SystolicBP': 140,
        'DiastolicBP': 90,
        'SerumCreatinine': 2.1,
        'BUNLevels': 35.0,
        'GFR': 45.0,
        'ProteinInUrine': 1.5,
        'HbA1c': 7.2
    }
    result = predict_ckd_risk(test_sample)
    print("[TEST PREDICTION RESULT]:", result)
