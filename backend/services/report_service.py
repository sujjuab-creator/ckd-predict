import os
import sys
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak
)

# Ensure sys.path includes backend/ml and backend/services
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ml_dir = os.path.join(backend_dir, 'ml')
for p in [backend_dir, ml_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from shap_service import generate_shap_explanation, MEDICAL_DISCLAIMER
from ml.feature_schema import FEATURE_SCHEMA, FEATURES_BY_NAME

REPORTS_PDF_DIR = os.path.join(backend_dir, 'reports_pdf')
os.makedirs(REPORTS_PDF_DIR, exist_ok=True)

# Key clinical markers required by prompt for prominent display in report
KEY_MARKERS = [
    ('SystolicBP', 'Systolic Blood Pressure'),
    ('DiastolicBP', 'Diastolic Blood Pressure'),
    ('SerumCreatinine', 'Serum Creatinine'),
    ('GFR', 'Glomerular Filtration Rate (eGFR)'),
    ('HemoglobinLevels', 'Hemoglobin'),
    ('FastingBloodSugar', 'Fasting Blood Sugar'),
    ('HbA1c', 'HbA1c'),
    ('BUNLevels', 'Blood Urea Nitrogen (BUN)'),
    ('ProteinInUrine', 'Protein in Urine'),
    ('ACR', 'Albumin-to-Creatinine Ratio (ACR)'),
    ('SerumElectrolytesSodium', 'Serum Sodium'),
    ('SerumElectrolytesPotassium', 'Serum Potassium'),
    ('BMI', 'Body Mass Index (BMI)'),
    ('CholesterolTotal', 'Total Cholesterol'),
]

def format_feature_display(feat_name, raw_val):
    feat = FEATURES_BY_NAME.get(feat_name)
    if raw_val is None or raw_val == '':
        return '—'
    if feat and feat.get('type') == 'select':
        options = feat.get('options', {})
        try:
            val_num = int(float(raw_val))
            if val_num in options:
                return str(options[val_num])
        except (ValueError, TypeError):
            pass
        return str(raw_val)
    unit = feat.get('unit') if feat else None
    if unit and not unit.startswith('score'):
        return f"{raw_val} {unit}"
    return str(raw_val)

def generate_pdf_report(prediction_record, patient_info=None, user_info=None):
    """
    Generate professional medical PDF report for a CKD prediction record using ReportLab.
    """
    pred_db_id = getattr(prediction_record, 'id', None) or prediction_record.get('id', 1)
    pred_result = getattr(prediction_record, 'prediction_result', None) or prediction_record.get('prediction_result', 'CKD Risk')
    pred_prob = getattr(prediction_record, 'prediction_probability', None) or prediction_record.get('prediction_probability', 0.8)
    input_features = getattr(prediction_record, 'input_features', None) or prediction_record.get('input_features', {})
    created_at = getattr(prediction_record, 'created_at', datetime.utcnow())

    formatted_pred_id = f"PRED-{pred_db_id:04d}" if isinstance(pred_db_id, int) else str(pred_db_id)
    report_code = f"RPT-{pred_db_id:04d}" if isinstance(pred_db_id, int) else "RPT-0001"
    pdf_filename = f"{report_code}.pdf"
    pdf_path = os.path.join(REPORTS_PDF_DIR, pdf_filename)

    date_str = created_at.strftime("%Y-%m-%d %H:%M UTC") if isinstance(created_at, datetime) else str(created_at)

    patient_id_display = "PAT-0001"
    patient_name_display = "Patient User"
    if patient_info:
        patient_id_display = getattr(patient_info, 'patient_id', None) or patient_info.get('patient_id', patient_id_display)
    if user_info:
        patient_name_display = getattr(user_info, 'name', None) or user_info.get('name', patient_name_display)

    # SHAP explanation
    shap_data = generate_shap_explanation(input_features, top_n=6)
    shap_features = shap_data.get('features', [])

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    COLOR_PRIMARY = colors.HexColor("#1e3a8a")
    COLOR_ACCENT = colors.HexColor("#0284c7")
    COLOR_TEXT = colors.HexColor("#1e293b")
    COLOR_LIGHT_BG = colors.HexColor("#f8fafc")
    COLOR_RISK_HIGH = colors.HexColor("#dc2626")
    COLOR_RISK_LOW = colors.HexColor("#16a34a")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_PRIMARY
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b")
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=COLOR_PRIMARY,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_TEXT
    )

    body_bold_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#7f1d1d")
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("CKD PREDICT", title_style))
    story.append(Paragraph("Chronic Kidney Disease Prediction — AI-Assisted Clinical Report", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceBefore=2, spaceAfter=8))

    # 2. Patient Overview Grid
    patient_table_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style), Paragraph(patient_name_display, body_style),
            Paragraph("<b>Report ID:</b>", body_style), Paragraph(report_code, body_style)
        ],
        [
            Paragraph("<b>Patient ID:</b>", body_style), Paragraph(patient_id_display, body_style),
            Paragraph("<b>Prediction ID:</b>", body_style), Paragraph(formatted_pred_id, body_style)
        ],
        [
            Paragraph("<b>Report Date:</b>", body_style), Paragraph(date_str, body_style),
            Paragraph("<b>Notice:</b>", body_style), Paragraph("AI-Assisted Prediction", body_style)
        ]
    ]

    patient_table = Table(patient_table_data, colWidths=[1.2*inch, 2.55*inch, 1.2*inch, 2.55*inch])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 8))

    # 3. Prediction Result Box
    risk_color = COLOR_RISK_HIGH if "Risk" in str(pred_result) and "No" not in str(pred_result) else COLOR_RISK_LOW
    result_text = f"<b>Prediction Output:</b> <font color='{risk_color.hexval()}'>{pred_result.upper()}</font>"
    risk_pct = round(pred_prob * 100, 1) if pred_prob is not None else 0.0
    prob_text = f"<b>Estimated Risk Probability:</b> {risk_pct}% ({pred_prob:.4f})"

    result_box_data = [
        [Paragraph(result_text, ParagraphStyle('ResHead', parent=body_style, fontSize=11, leading=15))],
        [Paragraph(prob_text, ParagraphStyle('ProbHead', parent=body_style, fontSize=9.5, leading=13))]
    ]
    result_box = Table(result_box_data, colWidths=[7.5*inch])
    result_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1.5, risk_color),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(result_box)
    story.append(Spacer(1, 10))

    # 4. Key Clinical Parameters Table
    story.append(Paragraph("Key Clinical & Laboratory Measurements", section_heading))
    key_rows = [["Clinical Parameter", "Value", "Clinical Parameter", "Value"]]

    key_items = []
    for fkey, flabel in KEY_MARKERS:
        if fkey in input_features:
            val_fmt = format_feature_display(fkey, input_features[fkey])
            key_items.append((flabel, val_fmt))

    for i in range(0, len(key_items), 2):
        lbl1, val1 = key_items[i]
        lbl2, val2 = key_items[i+1] if (i+1) < len(key_items) else ("", "")
        key_rows.append([
            Paragraph(f"<b>{lbl1}</b>", body_style), Paragraph(str(val1), body_bold_style),
            Paragraph(f"<b>{lbl2}</b>", body_style), Paragraph(str(val2), body_bold_style)
        ])

    key_table = Table(key_rows, colWidths=[2.2*inch, 1.55*inch, 2.2*inch, 1.55*inch])
    key_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(key_table)
    story.append(Spacer(1, 10))

    # Page 2: Complete Feature List & SHAP Analysis
    story.append(PageBreak())

    # 5. Complete Model Input Feature Summary (All 51 Features)
    story.append(Paragraph("Complete Clinical Input Data Summary (51 Features)", section_heading))

    all_feat_items = []
    for feat in FEATURE_SCHEMA:
        fname = feat['name']
        flabel = feat['label']
        raw_val = input_features.get(fname)
        val_fmt = format_feature_display(fname, raw_val)
        all_feat_items.append((flabel, val_fmt))

    all_rows = [["Feature", "Value", "Feature", "Value"]]
    for i in range(0, len(all_feat_items), 2):
        lbl1, val1 = all_feat_items[i]
        lbl2, val2 = all_feat_items[i+1] if (i+1) < len(all_feat_items) else ("", "")
        all_rows.append([
            Paragraph(lbl1, body_style), Paragraph(str(val1), body_style),
            Paragraph(lbl2, body_style), Paragraph(str(val2), body_style)
        ])

    all_table = Table(all_rows, colWidths=[2.2*inch, 1.55*inch, 2.2*inch, 1.55*inch])
    all_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    story.append(all_table)
    story.append(Spacer(1, 6))

    # 6. SHAP AI Model Feature Attribution Explanation Section
    story.append(Paragraph("SHAP AI Model Feature Attribution Explanation", section_heading))
    story.append(Paragraph(
        "Top feature contributions influencing the AI model's output for this patient. "
        "Positive SHAP values indicate features contributing to higher predicted CKD risk.",
        body_style
    ))
    story.append(Spacer(1, 4))

    shap_rows = [["Feature Name", "Input Value", "SHAP Impact Score", "Contribution Direction"]]
    for item in shap_features:
        feat_name = item.get('feature', '')
        inp_val = item.get('input_value', '')
        s_val = item.get('shap_value', 0.0)
        direction = item.get('impact', '')

        feat_label = FEATURES_BY_NAME.get(feat_name, {}).get('label', feat_name)
        inp_fmt = format_feature_display(feat_name, inp_val)

        shap_rows.append([
            Paragraph(f"<b>{feat_label}</b>", body_style),
            Paragraph(str(inp_fmt), body_style),
            Paragraph(f"{s_val:+.4f}", body_style),
            Paragraph(direction, body_style)
        ])

    shap_table = Table(shap_rows, colWidths=[2.0*inch, 1.2*inch, 1.4*inch, 2.9*inch])
    shap_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(shap_table)
    story.append(Spacer(1, 6))

    # 7. Medical Disclaimer & Notice Box
    disclaimer_box_data = [
        [Paragraph("<b>IMPORTANT CLINICAL SAFETY NOTICE</b>", ParagraphStyle('DiscHead', parent=disclaimer_style, fontName='Helvetica-Bold', fontSize=8.5))],
        [Paragraph(MEDICAL_DISCLAIMER, disclaimer_style)]
    ]
    disclaimer_box = Table(disclaimer_box_data, colWidths=[7.5*inch])
    disclaimer_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#fca5a5")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(disclaimer_box)

    # Build PDF
    doc.build(story)

    return {
        "report_id": report_code,
        "report_path": pdf_path,
        "filename": pdf_filename
    }

if __name__ == '__main__':
    # Test generation
    test_pred = {
        'id': 1,
        'prediction_result': 'CKD Risk',
        'prediction_probability': 0.85,
        'input_features': {'Age': 60, 'BMI': 30.2, 'SerumCreatinine': 2.4, 'GFR': 38.0, 'SystolicBP': 142},
        'created_at': datetime.utcnow()
    }
    res = generate_pdf_report(test_pred)
    print("[SUCCESS] PDF Report Generated:", res)
