import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# Path to genuine dataset
DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'Chronic_Kidney_Dsease_data.csv')

# Excluded columns as mandated by requirements
EXCLUDED_COLUMNS = ['PatientID', 'DoctorInCharge']
TARGET_COLUMN = 'Diagnosis'

def load_raw_dataset(path=None):
    """Load genuine CKD dataset from backend/data/."""
    file_path = path or DATASET_PATH
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CKD Dataset file not found at: {file_path}")
    df = pd.read_csv(file_path)
    return df

def get_feature_and_target_data(df):
    """Clean dataset by removing non-feature identifier columns."""
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' missing from dataset.")

    # Drop non-feature columns
    cols_to_drop = [col for col in EXCLUDED_COLUMNS if col in df.columns] + [TARGET_COLUMN]
    X = df.drop(columns=cols_to_drop)
    y = df[TARGET_COLUMN].astype(int)
    
    return X, y

def build_preprocessing_pipeline(feature_names):
    """
    Build scikit-learn preprocessing pipeline.
    Uses SimpleImputer and StandardScaler for numerical/binary features.
    """
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, feature_names)
        ],
        remainder='passthrough'
    )
    return preprocessor

def prepare_data_and_preprocessor(test_size=0.2, random_state=42):
    """
    Load dataset, split with stratification, and fit preprocessor on training data only.
    Prevents data leakage.
    """
    df = load_raw_dataset()
    X, y = get_feature_and_target_data(df)
    
    feature_names = list(X.columns)

    # Stratified train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )

    # Build and fit preprocessor on X_train ONLY
    preprocessor = build_preprocessing_pipeline(feature_names)
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)

    return {
        'X_train_raw': X_train,
        'X_test_raw': X_test,
        'X_train': X_train_scaled,
        'X_test': X_test_scaled,
        'y_train': y_train,
        'y_test': y_test,
        'preprocessor': preprocessor,
        'feature_names': feature_names,
        'df_summary': {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'num_features': len(feature_names),
            'missing_values': int(df.isnull().sum().sum()),
            'duplicate_rows': int(df.duplicated().sum()),
            'target_distribution': y.value_counts().to_dict(),
            'train_rows': len(X_train),
            'test_rows': len(X_test)
        }
    }

if __name__ == '__main__':
    data = prepare_data_and_preprocessor()
    print("[SUCCESS] Data Preprocessing Pipeline Verified:")
    print("Summary:", data['df_summary'])
