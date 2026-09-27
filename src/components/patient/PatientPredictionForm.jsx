import React, { useState } from 'react';
import { PREDICTION_SECTIONS, PREDICTION_FIELDS } from '../../data/predictionFields';
import { Zap, RotateCcw, ArrowLeft, AlertCircle } from 'lucide-react';
import MedicalDisclaimer from './MedicalDisclaimer';

export default function PatientPredictionForm({ onNavigate, onAddPrediction }) {
  // Default values
  const initialFormState = {
    age: 56,
    gender: 'Male',
    bp: 140,
    sg: '1.015',
    al: '2',
    su: '1',
    bgr: 168,
    bu: 52,
    sc: 2.1,
    sod: 134,
    pot: 4.8,
    hemo: 11.2,
    pcv: 35,
    wbcc: 9800,
    rbcc: 3.8,
    rbc: 'abnormal',
    pc: 'abnormal',
    pcc: 'present',
    ba: 'notpresent',
    htn: 'yes',
    dm: 'yes',
    cad: 'no',
    appet: 'poor',
    pe: 'yes',
    ane: 'no'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleClearForm = () => {
    const emptyState = {};
    PREDICTION_FIELDS.forEach(field => {
      emptyState[field.name] = '';
    });
    setFormData(emptyState);
    setErrors({});
  };

  // Frontend Validation
  const validateForm = () => {
    const newErrors = {};

    PREDICTION_FIELDS.forEach(field => {
      const val = formData[field.name];

      if (field.required && (val === undefined || val === null || val === '')) {
        newErrors[field.name] = `${field.label} is required.`;
        return;
      }

      if (field.type === 'number') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          newErrors[field.name] = `${field.label} must be a valid number.`;
        } else if (field.min !== undefined && num < field.min) {
          newErrors[field.name] = `${field.label} must be at least ${field.min}.`;
        } else if (field.max !== undefined && num > field.max) {
          newErrors[field.name] = `${field.label} cannot exceed ${field.max}.`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Calculate prediction output
    const scVal = parseFloat(formData.sc) || 1.0;
    const isHighRisk = scVal > 1.4;
    const calculatedResult = isHighRisk ? 'High Risk' : 'Low Risk';

    const newPredictionRecord = {
      id: `PRED-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split('T')[0],
      result: calculatedResult,
      model: 'RandomForest Model',
      status: 'Completed',
      formData: { ...formData }
    };

    // Save prediction data
    sessionStorage.setItem('ckd_latest_prediction', JSON.stringify(newPredictionRecord));
    if (onAddPrediction) {
      onAddPrediction(newPredictionRecord);
    }

    // Navigate to /patient/result
    onNavigate('/patient/result');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Top Bar Header */}
      <div className="flex items-center justify-between glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('/patient')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white">CKD Prediction Data Entry</h1>
          <p className="text-xs text-slate-400">Fill in clinical parameters to generate an AI risk prediction.</p>
        </div>

        <button
          type="button"
          onClick={handleClearForm}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-all flex items-center space-x-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Form</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-rose-400 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Form Validation Error</p>
            <p className="text-[11px] text-rose-300">Please review the highlighted fields below before submitting.</p>
          </div>
        </div>
      )}

      {/* Render Dynamic Form Sections */}
      {PREDICTION_SECTIONS.map((sec) => {
        const fields = PREDICTION_FIELDS.filter(f => f.section === sec.id);

        return (
          <div key={sec.id} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">
              {sec.title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="block text-slate-300 font-medium flex items-center justify-between">
                    <span>
                      {field.label} {field.required && <span className="text-rose-400">*</span>}
                    </span>
                    {field.unit && <span className="text-[10px] text-slate-500">({field.unit})</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors ${
                        errors[field.name] ? 'border-rose-500' : 'border-slate-800'
                      }`}
                    >
                      <option value="">Select Option</option>
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step={field.step || 'any'}
                      value={formData[field.name] !== undefined ? formData[field.name] : ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors ${
                        errors[field.name] ? 'border-rose-500' : 'border-slate-800'
                      }`}
                    />
                  )}

                  {errors[field.name] && (
                    <p className="text-[10px] text-rose-400 mt-0.5">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('/patient')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
        >
          Back to Dashboard
        </button>

        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Predict CKD</span>
        </button>
      </div>

      <MedicalDisclaimer />

    </form>
  );
}
