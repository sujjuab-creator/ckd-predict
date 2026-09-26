# CKD Prediction System — Backend API Foundation

Flask-based Python backend API for Chronic Kidney Disease (CKD) risk prediction application.

---

## 📋 System Requirements & Stack
- **Python Version**: Python 3.10+ (Tested on Python 3.12)
- **Framework**: Flask, Flask-CORS, Flask-SQLAlchemy
- **Database**: MySQL (PyMySQL driver)
- **Security**: Werkzeug password hashing
- **Config**: python-dotenv

---

## 🚀 Environment & Virtual Environment Setup

### 1. Create Virtual Environment (Optional / Recommended)
```bash
cd backend
python -m venv venv
```

Activate environment:
- **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
- **Linux / macOS**: `source venv/bin/activate`

### 2. Install Required Dependencies
```bash
pip install -r requirements.txt
```

---

## 🗄️ MySQL Database Setup

1. Open MySQL Command Line or MySQL Workbench and create database:
   ```sql
   CREATE DATABASE IF NOT EXISTS ckd_db;
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Configure your database URL in `.env`:
   ```env
   DATABASE_URL=mysql+pymysql://<username>:<password>@localhost:3306/ckd_db
   SECRET_KEY=ckd_prediction_secret_key_demo_2026
   CORS_ORIGIN=http://localhost:5173
   ```

---

## ▶️ Starting the Backend Server

Run the Flask server:
```bash
python app.py
```
Server will start on: **`http://localhost:5000`**

---

## 🔌 API Endpoints Summary

### Health Check
- `GET /api/health` — System status check

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Public user registration (Patient/Doctor only; Admin blocked)
- `POST /api/auth/login` — User login verification

### Patient Roster (`/api/patients`)
- `GET /api/patients` — List all patient records
- `GET /api/patients/<patient_id>` — Fetch single patient details
- `GET /api/patients/<patient_id>/predictions` — Fetch patient prediction history

### Predictions (`/api/predictions`)
- `GET /api/predictions` — System-wide prediction records
- `POST /api/predictions` — Prediction endpoint foundation (Prepared for Day 2 Step 2 ML training)

### Analytics (`/api/analytics`)
- `GET /api/analytics` — Database-derived entity counts

### Reports (`/api/reports`)
- `GET /api/reports` — System report logs
- `GET /api/reports/<report_id>` — Single report details
