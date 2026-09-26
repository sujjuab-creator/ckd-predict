import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier

from preprocess import prepare_data_and_preprocessor
from evaluate import evaluate_model

# Directories
ML_DIR = os.path.dirname(__file__)
ARTIFACTS_DIR = os.path.join(ML_DIR, 'artifacts')
REPORTS_DIR = os.path.join(ML_DIR, 'reports')

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

def train_and_evaluate_all_models():
    """
    Train Logistic Regression, Random Forest, Gradient Boosting, and XGBoost models.
    Evaluate on test set, save comparison reports, select best model based on medical risk criteria,
    and export all joblib artifacts.
    """
    print("[1/5] Loading dataset & preprocessing data...")
    data = prepare_data_and_preprocessor(test_size=0.2, random_state=42)
    
    X_train = data['X_train']
    X_test = data['X_test']
    y_train = data['y_train']
    y_test = data['y_test']
    preprocessor = data['preprocessor']
    feature_names = data['feature_names']
    df_summary = data['df_summary']

    # Define candidate models
    models = {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight='balanced'
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            class_weight='balanced'
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=100,
            random_state=42
        ),
        "XGBoost": XGBClassifier(
            n_estimators=100,
            random_state=42,
            eval_metric='logloss'
        )
    }

    evaluations = []
    trained_model_objects = {}

    print("[2/5] Training candidate models...")
    for model_name, model in models.items():
        print(f"  --> Training {model_name}...")
        model.fit(X_train, y_train)
        metrics = evaluate_model(model, X_test, y_test, model_name=model_name)
        evaluations.append(metrics)
        trained_model_objects[model_name] = model

    # Convert evaluations to DataFrame for comparison
    comparison_df = pd.DataFrame([
        {
            "Model": m["model_name"],
            "Accuracy": m["accuracy"],
            "Precision": m["precision"],
            "Recall": m["recall"],
            "F1_Score": m["f1_score"],
            "ROC_AUC": m["roc_auc"]
        }
        for m in evaluations
    ])

    print("\n[3/5] Model Comparison Summary:")
    print(comparison_df.to_string(index=False))

    # Save comparison reports
    reports_json_path = os.path.join(REPORTS_DIR, 'model_comparison.json')
    reports_csv_path = os.path.join(REPORTS_DIR, 'model_comparison.csv')
    
    with open(reports_json_path, 'w') as f:
        json.dump(evaluations, f, indent=2)
    comparison_df.to_csv(reports_csv_path, index=False)
    print(f"\n[INFO] Saved evaluation reports to:\n  - {reports_json_path}\n  - {reports_csv_path}")

    # Final Model Selection Criterion:
    # In medical risk prediction, minimizing false negatives (high Recall) & maximizing F1-Score
    # while maintaining high ROC-AUC and Accuracy is critical.
    # Selection metric: Weighted composite score prioritizing Recall and F1-Score.
    print("[4/5] Selecting best model based on medical-risk criteria (Recall & F1 priority)...")
    
    best_model_name = None
    best_score = -1.0
    
    for m in evaluations:
        # Score combining F1 (0.4), Recall (0.3), ROC_AUC (0.2), Accuracy (0.1)
        composite_score = (
            (m["f1_score"] * 0.4) +
            (m["recall"] * 0.3) +
            ((m["roc_auc"] or 0) * 0.2) +
            (m["accuracy"] * 0.1)
        )
        if composite_score > best_score:
            best_score = composite_score
            best_model_name = m["model_name"]

    best_model = trained_model_objects[best_model_name]
    best_metrics = next(m for m in evaluations if m["model_name"] == best_model_name)
    
    selection_criterion = (
        f"Selected '{best_model_name}' because it achieved the highest composite medical-risk score "
        f"(Recall: {best_metrics['recall']}, F1-Score: {best_metrics['f1_score']}, "
        f"ROC-AUC: {best_metrics['roc_auc']}, Accuracy: {best_metrics['accuracy']}), "
        f"ensuring optimal sensitivity for detecting CKD risk cases while minimizing false negatives."
    )
    print(f"\n[SELECTED MODEL]: {best_model_name}")
    print(f"Selection Rationale: {selection_criterion}")

    # Save artifacts
    print("[5/5] Saving ML artifacts to backend/ml/artifacts/...")
    
    model_artifact_path = os.path.join(ARTIFACTS_DIR, 'model.joblib')
    preprocessor_artifact_path = os.path.join(ARTIFACTS_DIR, 'preprocessor.joblib')
    feature_names_path = os.path.join(ARTIFACTS_DIR, 'feature_names.json')
    metadata_path = os.path.join(ARTIFACTS_DIR, 'model_metadata.json')

    joblib.dump(best_model, model_artifact_path)
    joblib.dump(preprocessor, preprocessor_artifact_path)
    
    with open(feature_names_path, 'w') as f:
        json.dump(feature_names, f, indent=2)

    metadata = {
        "model_name": best_model_name,
        "selection_criterion": selection_criterion,
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "dataset_summary": df_summary,
        "metrics": best_metrics,
        "all_evaluations": [
            {
                "model": m["model_name"],
                "accuracy": m["accuracy"],
                "precision": m["precision"],
                "recall": m["recall"],
                "f1_score": m["f1_score"],
                "roc_auc": m["roc_auc"]
            } for m in evaluations
        ]
    }

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[SUCCESS] Artifacts successfully exported:")
    print(f"  - Model: {model_artifact_path}")
    print(f"  - Preprocessor: {preprocessor_artifact_path}")
    print(f"  - Feature Names: {feature_names_path}")
    print(f"  - Model Metadata: {metadata_path}")

    return metadata

if __name__ == '__main__':
    train_and_evaluate_all_models()
