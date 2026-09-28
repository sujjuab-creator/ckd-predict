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

### Aiven MySQL (Render production)
Paste the Aiven **Service URI** into `DATABASE_URL` unchanged, e.g.
`mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED`.

PyMySQL does not accept the `ssl-mode` option, so `database_config.py` normalises the URL before
the engine is created: `mysql://` uses the PyMySQL driver, `ssl-mode` (and `ssl-ca`/`ssl-cert`/`ssl-key`)
are removed from the URL, and TLS is configured through an `ssl.SSLContext` in the engine's
`connect_args`. SSL is never switched off unless the URL explicitly says `ssl-mode=DISABLED`.

| `ssl-mode` | Behaviour |
|---|---|
| `REQUIRED` (Aiven default), `PREFERRED` | TLS 1.2+ encrypted connection. If `DATABASE_SSL_CA` is set, the server certificate is also verified against it. |
| `VERIFY_CA` | Encrypted + certificate must chain to `DATABASE_SSL_CA` (or the system trust store). |
| `VERIFY_IDENTITY` | `VERIFY_CA` + certificate must match the host name. |

Optional (recommended): set `DATABASE_SSL_CA` to Aiven's CA certificate — either the path to
`ca.pem` or the PEM text itself (Aiven console → service → *CA certificate*). It is public, not a secret.
Local `mysql+pymysql://...@localhost` URLs without SSL options, and SQLite, are used unchanged.

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
- **Doctor:** no self-registration. Doctor accounts are created by the Admin (`POST /api/admin/users` with `role: doctor`, unique Doctor ID and an initial password); doctors then sign in on the Doctor Sign In page. `POST /api/auth/register/doctor`, `POST /api/auth/register` with `role: doctor`, and OTP requests with `purpose: doctor_signup` all return `403` (`code: doctor_self_registration_disabled`).
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
**Production uses Brevo's HTTPS transactional email API** (`POST https://api.brevo.com/v3/smtp/email`).
Render free web services block outbound SMTP (ports 25/465/587), so an HTTPS API is required there.

Set these in Render → backend service → Environment (never in code or git):
```
MAIL_PROVIDER=brevo
BREVO_API_KEY=<your Brevo API key>
MAIL_FROM=<a sender address verified in Brevo>
MAIL_FROM_NAME=CKD Predict
FRONTEND_URL=<your frontend URL, used in password-reset links>
```
Brevo checklist:
1. Create the key under **SMTP & API → API keys** (an *API key*, not the SMTP key).
2. Verify the sender address/domain under **Senders, domains & dedicated IPs**; `MAIL_FROM` must match it.
3. If Brevo's **Authorised IPs** security feature is enabled, requests from Render (whose outbound IPs can change) are rejected with `401 ... unrecognised IP address`. Either deactivate IP blocking for the API key or authorise Render's outbound IPs.

Failures are logged safely as `Email delivery failed: provider=brevo status=<code> error=<Brevo message>` — the API key, OTP codes and passwords are redacted and never logged. The API always returns a generic error to the browser.

Other providers remain available through `MAIL_PROVIDER`: `smtp` (local development or paid hosting — needs `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`; for Gmail use `smtp.gmail.com:587` with a Google **App Password**), `sendgrid` (`SENDGRID_API_KEY`) and `resend` (`RESEND_API_KEY`).
If email is not configured the OTP and reset endpoints return `503` with `code: "email_not_configured"`; nothing is faked.

### Database migration
On startup the app runs `db.create_all()` (creates the new `email_otps` and `password_reset_tokens` tables only if missing) and an additive migration that adds `users.doctor_code`, `users.updated_at` and `patients.doctor_id` (with a unique index on `doctor_code` and, on MySQL, an `ON DELETE SET NULL` foreign key). It never drops tables or data and is safe to run repeatedly.

### Tests
```bash
cd backend
python -m unittest -v
```
Email tests (`test_email_service.py`, `test_email_brevo.py`) mock all HTTP calls — no real email is sent and no API key is needed.

---

## 👤 Initial System Administrator
There is **no default admin password**. On startup, if no admin account exists, the backend creates one from
`ADMIN_EMAIL`, `ADMIN_PASSWORD` (required, at least 8 characters) and optional `ADMIN_NAME`.
- Production (`FLASK_ENV=production`): if no admin exists and `ADMIN_PASSWORD` is missing/too short, startup stops with a clear configuration error (the password is never printed).
- Development/testing: the admin is simply not created and a warning is printed.
- A second admin is never created. If an admin already exists and its email matches `ADMIN_EMAIL` (case-insensitive), startup sets its password to `ADMIN_PASSWORD` (when at least 8 characters) and keeps it `role=admin`, `status=Active`. If the email does not match, or `ADMIN_PASSWORD` is not set, the existing admin is left unchanged.
- Because of this, while `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set for the existing admin, a password changed in the Admin Settings page is reset to `ADMIN_PASSWORD` on the next restart. Change the environment variable instead, or remove `ADMIN_PASSWORD` after the first deploy to manage the password from the app.

### Create / reset the admin account manually
Run from `backend/` against the database in `backend/.env` (e.g. Aiven):
```bash
python manage_admin.py --email admin@predict.com
```
You are prompted for the password (hidden input; or set `CKD_NEW_ADMIN_PASSWORD`). The existing admin is updated
(never duplicated), or created if none exists; Patient/Doctor accounts are not touched. The password is stored only
as a hash and never printed, and the command confirms the credentials through `/api/auth/login`.

---

## 🔒 Role-based access & Patient Portal
All patient-data endpoints now require a signed-in user (`Authorization: Bearer <token>`); the backend enforces
roles and ownership itself, independently of what the frontend shows.

| Endpoint | Patient | Doctor | Admin |
|---|---|---|---|
| `POST /api/predictions` | **403** | assigned patients only (else 403) | ✅ |
| `GET /api/predictions`, `GET /api/reports` | own only (`/reports`) / **403** (`/predictions`) | assigned patients only | ✅ all |
| `POST /api/predictions/<id>/explanation`, `POST /api/reports/<prediction_id>` | **403** | assigned patients only (else 403) | ✅ |
| `GET /api/patients` (list) | **403** | assigned patients only | ✅ all |
| `GET /api/patients/<id>`, `/api/patients/<id>/predictions` | own record only (else 403) | assigned patients only (else 403) | ✅ |
| `GET /api/reports/<id>`, `/api/reports/<id>/download` | own reports only (else 403) | assigned patients only (else 403) | ✅ |
| `GET /api/patient/profile`, `/overview`, `/reports`, `/reports/<id>`, `/reviews` | ✅ own data | 403 | 403 |
| `GET /api/reviews?patient_id=` | own reviews only | assigned patients only (+ `can_review`) | ✅ |
| `POST /api/reviews` | **403** | assigned patients only | 403 |
| `PUT` / `DELETE /api/reviews/<id>` | **403** | author, while still assigned | 403 |
| `GET /api/analytics` | **403** | aggregates for assigned patients only (`scope: "assigned_patients"`) | system-wide (`scope: "system"`) |
| `GET /api/analytics/model-comparison` | **403** | ✅ (aggregate model metrics, no patient data) | ✅ |
| `GET /api/notifications`, `POST /api/notifications/<id>/read`, `POST /api/notifications/read-all` | own | own | own |

A doctor's access is based on `patients.doctor_id` (the treating doctor set at registration or by the Admin).
Unauthenticated requests receive `401`; a doctor requesting an unassigned patient receives `403`.

`POST /api/predictions` now requires `patient_id` for an existing patient (400 / 404 otherwise) instead of
falling back to the first patient in the database.

**New tables** (created automatically by `db.create_all()`, nothing is dropped):
- `doctor_reviews` — review text and recommendations written by the treating doctor, optionally linked to a prediction/report.
- `notifications` — per-user in-app notifications. Created for real events only: a report is generated
  (`report`), a doctor adds a review (`review`), a password is changed or reset (`security`). They never contain
  passwords, OTP codes or tokens.

If a report's PDF file is missing (e.g. after a redeploy on an ephemeral disk), `GET /api/reports/<id>/download`
regenerates it from the stored prediction with the existing PDF generator.

Tests: `test_patient_portal.py` covers patient isolation, doctor-to-assigned-patient scoping, the 403 on
prediction, review permissions, analytics authorization, notifications, doctor prediction and admin management.

---

## 🩺 Doctor Patient Analysis & Batch Analysis
Doctor/Admin only (patients get `403`). Doctors can only use patients assigned to them; admins keep system-wide access.
All predictions use the existing model (`ml/predict.py`, `ml/artifacts/`). A prediction is **only** run when all 51
model features are present and valid (`ml/feature_schema.py`) — missing values are never filled in.

| Endpoint | Purpose |
|---|---|
| `POST /api/doctor/analysis/report` (multipart: `patient_id`, `file`) | Extract values from a report for review. Nothing is saved. |
| `POST /api/doctor/analysis/predict` (`patient_id`, `features`, `source`, `report_reference`) | Validate and save one prediction (`source`: `single_report` or `manual`). `422` with per-field issues if incomplete/invalid. |
| `POST /api/doctor/analysis/batch/validate` (multipart `file`, or JSON `{rows}`) | Validate a CSV/XLSX (PatientID + 51 feature columns) or corrected rows. Nothing is saved. |
| `POST /api/doctor/analysis/batch/predict` (`file_name`, `rows`) | Re-validates every row; predicts and saves only valid rows of accessible patients; partial failures allowed. |
| `GET /api/doctor/analysis/history` (`source`, `batch_id`, `patient_id`) | Unified history (single report, batch, manual) with patient, doctor, source and report reference. |

SHAP (`POST /api/predictions/<id>/explanation`) and PDF reports (`POST /api/reports/<id>`) reuse the existing endpoints.

**Report formats:** text-based PDF, TXT, CSV, XLSX, JSON (max 5 MB). Scanned/image PDFs are rejected (no OCR).
Values reported in a different unit (e.g. creatinine in µmol/L) or with conflicting values are marked *Needs Review*
and are not converted; anything not found is *Incomplete Data*.

**Validation statuses:** Incomplete Data (missing value) · Needs Review (not a number, outside plausible limits,
invalid category, ambiguous) · Failed (unknown/unassigned patient or model error). Values outside the training-data
range are allowed with a warning. Batch: max 1,000 rows, 5 MB.

**Audit fields** added to `predictions` (additive, nullable; created automatically on startup, existing rows kept):
`doctor_user_id`, `source` (`manual` | `single_report` | `batch`), `report_reference`, `batch_id`, `model_version`.

**New dependencies:** `openpyxl` (Excel) and `pypdf` (text-based PDF) — `pip install -r requirements.txt`.
