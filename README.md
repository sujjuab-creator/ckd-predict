# 🩺 CKD PREDICT
### Chronic Kidney Disease Prediction Using Machine Learning & Explainable AI

---

## 1. Project Overview
**CKD PREDICT** is an end-to-end medical decision support system designed to assist healthcare professionals and patients with early risk assessment for **Chronic Kidney Disease (CKD)**. The application integrates an advanced Machine Learning classification pipeline (**Random Forest**), explainable AI feature attribution via **SHAP (SHapley Additive exPlanations)**, automated clinical **PDF Medical Report generation**, role-based user management (**Patient, Doctor, Admin**), and persistent database storage.

---

## 2. Features
- **AI Risk Inference**: Real-time evaluation of patient clinical parameters to predict CKD risk.
- **SHAP Feature Attribution**: Explains individual predictions by identifying top contributing clinical features.
- **Automated PDF Reports**: Generates downloadable, clinical-grade medical reports using ReportLab.
- **Role-Based Portals**:
  - **Patient Portal**: Submit clinical data, view AI risk explanations, download PDF reports, and track prediction history.
  - **Doctor Portal**: Search patient roster, inspect patient prediction history, and view/download medical reports.
  - **Admin Portal**: System analytics dashboard, user management, prediction roster, and empirical ML model evaluation metrics.
- **Database Persistence**: Automatic storage of user accounts, patient rosters, prediction records with input payloads, and generated report metadata.

---

## 3. System Architecture
```
[ React / Vite Frontend ] (Port 5173)
         │
         ▼  (HTTP / JSON REST API)
[ Flask Backend API ] (Port 5000)
         │
         ├──> [ Preprocessing Pipeline (StandardScaler + SimpleImputer) ]
         ├──> [ Random Forest ML Model ] ──> SHAP TreeExplainer
         ├──> [ ReportLab PDF Engine ] ──> PDF Reports (reports_pdf/)
         └──> [ SQLAlchemy ORM ] ──> [ MySQL / SQLite Database ]
```

---

## 4. Technology Stack
- **Frontend**: React 18, Vite, Lucide Icons, Vanilla CSS Design System
- **Backend Framework**: Python 3.12, Flask, Flask-CORS, Flask-SQLAlchemy, Werkzeug
- **Machine Learning & XAI**: Scikit-Learn, Random Forest, Gradient Boosting, XGBoost, SHAP, Joblib, Pandas, NumPy
- **Reporting**: ReportLab
- **Database**: MySQL (PyMySQL) with local SQLite fallback
- **Production Server**: Gunicorn

---

## 5. Folder Structure
```
ckd-ide/
├── backend/
│   ├── app.py                     # Flask application entry point
│   ├── config.py                  # Environment & DB configuration
│   ├── requirements.txt           # Python backend dependencies
│   ├── .env.example               # Backend environment template
│   ├── data/                      # Verified CKD dataset location
│   ├── models/                    # SQLAlchemy database models (User, Patient, Prediction, Report)
│   ├── routes/                    # API route blueprints (auth, patients, predictions, reports, analytics)
│   ├── services/                  # Business logic services (shap_service, report_service)
│   ├── ml/                        # ML pipeline code and artifacts
│   │   ├── preprocess.py
│   │   ├── evaluate.py
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── model_registry.py
│   │   ├── artifacts/             # joblib & json model artifacts
│   │   └── reports/               # Model comparison JSON & CSV
│   └── reports_pdf/               # Generated patient PDF reports directory
├── src/                           # React frontend source code
│   ├── components/                # UI components (Patient, Doctor, Admin views)
│   ├── context/                   # AuthContext state management
│   ├── services/                  # apiService API client
│   └── data/                      # Feature definitions & data fixtures
├── public/                        # Static assets
├── .env.example                   # Root environment variable template
├── .gitignore                     # Git ignore policy
├── package.json                   # Frontend dependencies
├── vite.config.js                 # Vite configuration
└── README.md                      # Comprehensive project documentation
```

---

## 6. Dataset Information
> **IMPORTANT DATASET STATEMENT:**  
> *"The verified training dataset used in this implementation contains 1,659 genuine clinical records. No artificial duplication was performed."*

- **Dataset File**: `backend/data/Chronic_Kidney_Dsease_data.csv`
- **Total Records**: 1,659 rows
- **Total Columns**: 54 columns
- **Model Features**: 51 clinical features (Demographics, Vital Signs, Blood & Urine Tests, Lifestyle Parameters, Comorbidities)
- **Target Variable**: `Diagnosis` (`1` = CKD Risk, `0` = No CKD Risk)
- **Excluded Identifiers**: `PatientID`, `DoctorInCharge`

---

## 7. Machine Learning Models
Four candidate classification models were trained and empirically evaluated on a 20% stratified test split:
1. **Logistic Regression** (Balanced class weights)
2. **Random Forest Classifier** (100 Estimators, Balanced class weights) — **Selected Final Model**
3. **Gradient Boosting Classifier** (100 Estimators)
4. **XGBoost Classifier** (100 Estimators)

---

## 8. Model Evaluation & Comparison
> **Note**: Metrics reflect performance on the 20% test split (332 test samples) from the project dataset and do not constitute clinical validation.

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | 0.7440 | 0.9661 | 0.7475 | 0.8429 | 0.7919 |
| **Random Forest** ⭐ | **0.9307** | **0.9299** | **1.0000** | **0.9637** | **0.7998** |
| **Gradient Boosting** | 0.9247 | 0.9348 | 0.9869 | 0.9601 | 0.7781 |
| **XGBoost** | 0.9217 | 0.9373 | 0.9803 | 0.9583 | 0.7602 |

### Selection Rationale:
In medical screening systems, maximizing sensitivity (**Recall**) is paramount to ensure high-risk cases are identified and false negatives are minimized. **Random Forest** was selected as the final deployed model because it achieved **1.0000 Recall**, **0.9637 F1-Score**, **0.7998 ROC-AUC**, and **0.9307 Accuracy**.

---

## 9. SHAP Explainability
Individual prediction explanations are generated using `shap.TreeExplainer` on the Random Forest pipeline. SHAP values calculate the relative contribution of each clinical parameter (e.g., *Serum Creatinine*, *GFR*, *Systolic BP*) toward pushing the prediction toward or away from CKD risk.

---

## 10. PDF Medical Reports
Automated PDF medical reports are built using **ReportLab** and contain:
- Patient & Report Metadata Grid
- Highlighted Prediction Result Box & Risk Percentage
- Clinical Feature Input Summary Grid
- SHAP Feature Attribution Table with direction indicators
- Required Clinical Safety Notice & Disclaimer

---

## 11. User Roles
- **Patient**: Submits health parameters, views risk prediction and SHAP explanation, downloads PDF reports.
- **Doctor**: Searches patient records, reviews history, views SHAP explanations and PDF reports.
- **Admin**: Views system-wide database analytics, manages user rosters, inspects prediction logs, and reviews empirical model evaluation results.

---

## 12. Database Setup
1. Ensure MySQL Server is running on port `3306`.
2. Create the target database:
   ```sql
   CREATE DATABASE ckd_db;
   ```
3. Update `backend/.env` with your credentials:
   ```env
   DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/ckd_db
   ```
*(Note: If MySQL is not running, the application automatically falls back to a local SQLite database `backend/ckd_db.sqlite` for development seamlessly).*

---

## 13. Backend Setup
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # Linux / macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 14. Frontend Setup
1. From project root, install Node dependencies:
   ```bash
   npm install
   ```
2. Build client production bundle:
   ```bash
   npm run build
   ```

---

## 15. Environment Variables
Create `.env` files using `.env.example` as a template:

### Backend `.env` (`backend/.env`):
```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/ckd_db
SECRET_KEY=your_production_secret_key
FLASK_ENV=production
PORT=5000
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` (`.env`):
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 16. Local Development
Start the backend API server:
```bash
cd backend
python app.py
```
Start the React Vite frontend:
```bash
npm run dev
```

---

## 17. Production Deployment
- **Backend Server (Gunicorn)**:
  ```bash
  cd backend
  gunicorn -w 4 -b 0.0.0.0:5000 app:app
  ```
- **Frontend Server**: Deploy `dist/` directory produced by `npm run build` to Vercel, Netlify, or Nginx.

---

## 18. API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check |
| `POST` | `/api/auth/register` | User registration (Patient/Doctor allowed; Admin blocked) |
| `POST` | `/api/auth/login` | User login verification |
| `GET` | `/api/patients` | List all patient records |
| `GET` | `/api/patients/<id>/predictions` | Fetch patient prediction history |
| `POST` | `/api/predictions` | Run ML risk inference & save record to database |
| `POST` | `/api/predictions/<id>/explanation` | Calculate SHAP feature attribution explanation |
| `POST` | `/api/reports/<prediction_id>` | Generate PDF medical report |
| `GET` | `/api/reports/<report_id>/download` | Stream PDF report download |
| `GET` | `/api/analytics` | Database-derived analytics & trends |
| `GET` | `/api/analytics/model-comparison` | Stored ML model comparison evaluation metrics |

---

## 19. Security
- Passwords hashed using **Werkzeug** security (`pbkdf2:sha256`).
- Public admin registration is strictly forbidden.
- Patient report access is scoped to authorized patient/doctor roles.
- Environment variable isolation for database passwords and secret keys.
- Sensitive patient PDF files are excluded from Git repository tracking (`.gitignore`).

---

## 20. Medical Disclaimer
> **IMPORTANT MEDICAL STATEMENT:**  
> *"This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional."*

---

## 21. Limitations
- PDF report files are currently stored on local server disk (`backend/reports_pdf/`).
- The ML model is trained on a single cohort dataset (1,659 records) and should be evaluated on broader demographics before clinical deployment.

---

## 22. Future Improvements
- Cloud object storage integration (AWS S3 / GCP Storage) for patient PDF reports.
- Support for multi-center clinical validation datasets.
- OAuth2 / JWT stateless token authentication.
