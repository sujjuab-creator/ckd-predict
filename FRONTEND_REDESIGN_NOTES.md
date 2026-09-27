# CKD PREDICT — Frontend Redesign Notes

Frontend-only redesign. No backend, database, ML, environment or deployment
configuration files were changed. Hash routing (`#/...`) is preserved.

## What changed

- New design system in `src/index.css` (white / medical green / dark navy / light green / blue accents).
  Plain CSS: the Tailwind plugin in `vite.config.js` is untouched but no longer required by the new UI.
- Public, education-only Home page (no prediction form): Hero, About CKD, CKD Stages, Healthy Kidney
  Habits, Platform Features, How It Works, Prediction CTA, FAQ, Contact, Medical Disclaimer.
- Login with Patient / Doctor / Admin tabs using the existing `POST /api/auth/login`.
- Patient and Doctor 3-step Gmail OTP sign-up screens (see "Backend requirements").
- Patient, Doctor and Admin dashboards rebuilt on a shared layout with a mobile drawer sidebar.
- **All dashboards now use real backend data.** Mock data and the in-browser fake predictor are no
  longer imported anywhere.
- The prediction form now sends the model's real 51 features
  (`backend/ml/artifacts/feature_names.json`) plus `patient_id`. The previous form sent UCI-style
  fields (`bp`, `sc`, `hemo`, ...) that the model does not use, so the backend silently set them to 0.

## Routes (hash-based)

| Area | Routes |
|---|---|
| Public | `#/`, `#/login`, `#/login/doctor`, `#/login/admin`, `#/signup`, `#/signup/patient`, `#/signup/doctor` |
| Patient | `#/patient`, `#/patient/prediction`, `#/patient/predictions`, `#/patient/history`, `#/patient/result`, `#/patient/result/:id`, `#/patient/shap`, `#/patient/reports`, `#/patient/profile`, `#/patient/doctor` |
| Doctor | `#/doctor`, `#/doctor/patients`, `#/doctor/patients/:id`, `#/doctor/search`, `#/doctor/predictions`, `#/doctor/predictions/:patientId`, `#/doctor/result/:id`, `#/doctor/history`, `#/doctor/shap`, `#/doctor/shap/:id`, `#/doctor/reports`, `#/doctor/analytics`, `#/doctor/profile` |
| Admin | `#/admin`, `#/admin/patients`, `#/admin/doctors`, `#/admin/users`, `#/admin/analytics`, `#/admin/predictions`, `#/admin/models`, `#/admin/system`, `#/admin/settings`, `#/admin/profile` |

Guards: signed-out users are sent to `#/login`. Signed-in users who open another role's dashboard are
sent back to their own dashboard. The old public `#/assessment` routes now redirect to login or the
user's dashboard.

## Endpoints used (all existing, unchanged)

`GET /api/health`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`,
`POST /api/auth/register`, `GET|POST /api/admin/users`, `PUT|DELETE /api/admin/users/:id`,
`POST /api/admin/users/:id/reset-password`, `POST /api/admin/users/:id/toggle-status`,
`GET /api/patients`, `GET /api/patients/:id/predictions`, `GET|POST /api/predictions`,
`POST /api/predictions/:id/explanation`, `GET /api/analytics`, `GET /api/analytics/model-comparison`,
`GET /api/reports`, `POST /api/reports/:predictionId`, `GET /api/reports/:reportId/download`.

## Registration, OTP and password reset (implemented)

The backend now provides real email-OTP self-registration, the patient ↔ doctor link and
email password reset (see `backend/README_BACKEND.md`). Frontend calls:
`POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/register/patient|doctor`,
`GET /api/auth/doctors`, `GET /api/auth/me/doctor`, `GET /api/auth/me/patients`,
`POST /api/auth/forgot-password`, `POST /api/auth/reset-password` (page: `#/reset-password/:token`).
Email must be configured through environment variables; otherwise the UI shows
"Email verification is not available".

## Files no longer used (safe to delete)

These are not imported anywhere. Several contain demo/mock accounts and fake predictions:

```
src/App.css
src/assets/hero.png  src/assets/react.svg  src/assets/vite.svg
src/components/CKDForm.jsx  src/components/PdfReportModal.jsx
src/components/PredictionResultView.jsx  src/components/ShapVisualization.jsx
src/components/admin/AdminDoctors.jsx  src/components/admin/AdminPatients.jsx
src/components/admin/AdminPredictions.jsx  src/components/admin/AdminSidebar.jsx
src/components/doctor/DoctorSidebar.jsx
src/components/patient/DashboardCard.jsx  src/components/patient/MedicalDisclaimer.jsx
src/components/patient/PatientShap.jsx  src/components/patient/PatientSidebar.jsx
src/components/patient/StatusBadge.jsx
src/data/mockAnalytics.js  src/data/mockData.js  src/data/mockPatients.js
src/data/mockPredictions.js  src/data/mockUsers.js  src/data/predictionFields.js
src/utils/ckdPredictor.js
```
