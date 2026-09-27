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

---

## 🔐 Self-Registration, Email OTP & Password Reset

### Flows
- **Patient:** `POST /api/auth/send-otp` (`purpose: patient_signup`) → `POST /api/auth/verify-otp` → `POST /api/auth/register/patient` (name, treating doctor, password, `verification_token`).
- **Doctor:** same with `purpose: doctor_signup` → `POST /api/auth/register/doctor` (name, unique Doctor ID, password, `verification_token`).
- `GET /api/auth/doctors` lists active doctors (id, doctor_id, name, specialty only).
- `GET /api/auth/me/doctor` (patient) and `GET /api/auth/me/patients` (doctor) expose the care-team link.
- `POST /api/auth/forgot-password` → emails a single-use link `FRONTEND_URL/#/reset-password/<token>` (30 min) → `POST /api/auth/reset-password`.
- Admin accounts can never be created through public endpoints; admin-created accounts keep the temporary-password flow.

### Security
- 6-digit codes from Python `secrets`, stored only as HMAC-SHA256 (keyed with `SECRET_KEY`), valid 10 minutes, single use, max 5 wrong attempts.
- Resend cooldown 60 s; max 5 codes per email per hour and 20 per IP per hour.
- Verification returns a random registration token (stored hashed, 30 min, single use) that the registration endpoint re-checks; a client-side "verified" flag is never trusted.
- `send-otp` and `forgot-password` return the same response whether or not an account exists. Existing accounts receive an "you already have an account" email instead of a code.
- Codes, tokens and credentials are never returned in other responses or logged.

### Email configuration (environment variables only)
See `.env.example`. `MAIL_PROVIDER=smtp` needs `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`.
For Gmail use `smtp.gmail.com:587` with TLS and a **Google App Password** (requires 2-Step Verification) — not your normal password.
**Render free web services block outbound SMTP (ports 25/465/587)** — on the free plan use `MAIL_PROVIDER=brevo` (`BREVO_API_KEY`) or `MAIL_PROVIDER=sendgrid` (`SENDGRID_API_KEY`) with a verified sender address.
If email is not configured the OTP and reset endpoints return `503` with `code: "email_not_configured"`; nothing is faked.

### Database migration
On startup the app runs `db.create_all()` (creates the new `email_otps` and `password_reset_tokens` tables only if missing) and an additive migration that adds `users.doctor_code`, `users.updated_at` and `patients.doctor_id` (with a unique index on `doctor_code` and, on MySQL, an `ON DELETE SET NULL` foreign key). It never drops tables or data and is safe to run repeatedly.

### Tests
```bash
cd backend
python -m unittest -v
```

---

## 👤 Initial System Administrator
There is **no default admin password**. On startup, if no admin account exists, the backend creates one from
`ADMIN_EMAIL`, `ADMIN_PASSWORD` (required, at least 8 characters) and optional `ADMIN_NAME`.
- Production (`FLASK_ENV=production`): if no admin exists and `ADMIN_PASSWORD` is missing/too short, startup stops with a clear configuration error (the password is never printed).
- Development/testing: the admin is simply not created and a warning is printed.
- An existing admin is never modified or reset at startup; change its password from the Admin Settings page.
