import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")

def run_test(name, method, endpoint, payload=None, expected_status=200):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode('utf-8') if payload else None
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    print(f"\n--- Running: {name} [{method} {endpoint}] ---")
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body_text = resp.read().decode('utf-8')
            res_json = json.loads(body_text)
            
            status_match = (status == expected_status)
            is_success = res_json.get("success", False)
            
            if status_match and is_success:
                print(f"[PASS] HTTP {status} — Success: True")
                return True, res_json
            else:
                print(f"[FAIL] HTTP {status} — Body: {body_text[:200]}")
                return False, res_json
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ""
        print(f"[FAIL] HTTP {e.code} Error — Response: {body[:200]}")
        return False, None
    except Exception as ex:
        print(f"[FAIL] Network / Connection Error: {str(ex)}")
        return False, None

def main():
    print("=" * 65)
    print("      CKD PREDICT — ENDPOINT & DATABASE VERIFICATION TEST      ")
    print("=" * 65)
    print(f"Target API Server: {BASE_URL}")

    passed_count = 0
    total_tests = 6

    # 1. Health Check
    h_pass, h_res = run_test("Health Check & DB Status", "GET", "/api/health", expected_status=200)
    if h_pass and h_res.get("database") == "connected":
        print("  -> Database Connection: CONNECTED")
        passed_count += 1
    elif h_pass:
        print(f"  -> Health OK, Database status: {h_res.get('database')}")
        passed_count += 1

    # 2. Risk Prediction POST
    sample_patient = {
        "Age": 58,
        "BMI": 28.2,
        "SystolicBP": 138,
        "DiastolicBP": 88,
        "SerumCreatinine": 2.0,
        "BUNLevels": 30.0,
        "GFR": 48.0,
        "ProteinInUrine": 1.0,
        "HbA1c": 6.9
    }
    p_pass, p_res = run_test("Create Prediction & Store DB", "POST", "/api/predictions", payload=sample_patient, expected_status=201)
    
    pred_id = None
    if p_pass and p_res.get("db_stored") is True:
        pred_id = p_res.get("prediction_id")
        print(f"  -> Prediction Result: {p_res.get('prediction_result')}")
        print(f"  -> Model: {p_res.get('model_name')}")
        print(f"  -> Saved in MySQL with ID: {pred_id}")
        passed_count += 1
    elif p_pass:
        print("  -> Prediction generated, but db_stored is False")

    # 3. SHAP Explanation POST
    if pred_id:
        s_pass, s_res = run_test(f"SHAP Explanation for {pred_id}", "POST", f"/api/predictions/{pred_id}/explanation")
        if s_pass and len(s_res.get("features", [])) > 0:
            print(f"  -> SHAP Attributions Computed: {len(s_res['features'])} top features")
            passed_count += 1
    else:
        print("\n--- Skipping SHAP Explanation (Prediction creation failed) ---")

    # 4. Generate Medical Report POST
    if pred_id:
        r_pass, r_res = run_test(f"Generate PDF Report for {pred_id}", "POST", f"/api/reports/{pred_id}", expected_status=201)
        if r_pass and r_res.get("report_id"):
            print(f"  -> PDF Report Created: {r_res.get('report_id')}")
            print(f"  -> Download URL: {r_res.get('download_url')}")
            passed_count += 1
    else:
        print("\n--- Skipping PDF Report Generation (Prediction creation failed) ---")

    # 5. Analytics GET
    a_pass, a_res = run_test("System Analytics Overview", "GET", "/api/analytics")
    if a_pass and "counts" in a_res:
        print(f"  -> Total Database Predictions: {a_res['counts'].get('total_predictions')}")
        print(f"  -> Total Database Reports: {a_res['counts'].get('total_reports')}")
        passed_count += 1

    # 6. Model Comparison GET
    m_pass, m_res = run_test("Model Evaluation Comparison", "GET", "/api/analytics/model-comparison")
    if m_pass and "evaluations" in m_res:
        print(f"  -> Model Evaluations Returned: {len(m_res['evaluations'])} models")
        passed_count += 1

    print("\n" + "=" * 65)
    print(f" VERIFICATION RESULTS: {passed_count}/{total_tests} TESTS PASSED")
    print("=" * 65)
    
    if passed_count == total_tests:
        print("ALL ENDPOINT & DATABASE PERSISTENCE TESTS PASSED SUCCESSFULLY!\n")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED. PLEASE CHECK THE API SERVER LOGS.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
