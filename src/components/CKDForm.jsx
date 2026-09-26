import React, { useState } from 'react';
import { 
  Activity, Sparkles, HelpCircle, CheckCircle, AlertTriangle, 
  RotateCcw, Sliders, Info, Zap
} from 'lucide-react';
import { calculateEGFR } from '../utils/ckdPredictor';

export default function CKDForm({ onSubmitPrediction, initialData = null }) {
  const defaultValues = {
    age: 56,
    gender: 'Male',
    sc: 2.1,
    hemo: 11.2,
    bu: 52,
    bp: 140,
    sg: 1.015,
    al: 2,
    su: 1,
    rbc: 'abnormal',
    pc: 'abnormal',
    pcc: 'present',
    ba: 'notpresent',
    bgr: 168,
    sod: 134,
    pot: 4.8,
    pcv: 35,
    wbcc: 9800,
    rbcc: 3.8,
    htn: 'yes',
    dm: 'yes',
    cad: 'no',
    appet: 'poor',
    pe: 'yes',
    ane: 'no'
  };

  const [formData, setFormData] = useState(initialData || defaultValues);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Preset Patient Templates
  const loadPreset = (presetType) => {
    if (presetType === 'normal') {
      setFormData({
        age: 38,
        gender: 'Female',
        sc: 0.8,
        hemo: 14.5,
        bu: 16,
        bp: 118,
        sg: 1.020,
        al: 0,
        su: 0,
        rbc: 'normal',
        pc: 'normal',
        pcc: 'notpresent',
        ba: 'notpresent',
        bgr: 95,
        sod: 140,
        pot: 4.1,
        pcv: 44,
        wbcc: 6800,
        rbcc: 4.9,
        htn: 'no',
        dm: 'no',
        cad: 'no',
        appet: 'good',
        pe: 'no',
        ane: 'no'
      });
    } else if (presetType === 'moderate') {
      setFormData({
        age: 52,
        gender: 'Male',
        sc: 1.5,
        hemo: 12.4,
        bu: 34,
        bp: 132,
        sg: 1.018,
        al: 1,
        su: 0,
        rbc: 'normal',
        pc: 'normal',
        pcc: 'notpresent',
        ba: 'notpresent',
        bgr: 138,
        sod: 137,
        pot: 4.4,
        pcv: 39,
        wbcc: 7800,
        rbcc: 4.2,
        htn: 'yes',
        dm: 'no',
        cad: 'no',
        appet: 'good',
        pe: 'no',
        ane: 'no'
      });
    } else if (presetType === 'high') {
      setFormData(defaultValues);
    }
  };

  const currentEGFR = calculateEGFR(formData.sc, formData.age, formData.gender);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitPrediction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Header & Quick Preset Selector */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Clinical Patient Data Entry</span>
            </div>
            <h2 className="text-xl font-bold text-white">CKD Patient Data Form</h2>
            <p className="text-xs text-slate-400">Fill in physiological & laboratory values to run machine learning prediction</p>
          </div>

          {/* Preset Fill Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium mr-1">Sample Data Presets:</span>
            <button
              type="button"
              onClick={() => loadPreset('normal')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
            >
              Normal / Low Risk
            </button>
            <button
              type="button"
              onClick={() => loadPreset('moderate')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
            >
              Stage 2/3a Moderate
            </button>
            <button
              type="button"
              onClick={() => loadPreset('high')}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              Stage 3b/4 High Risk
            </button>
          </div>
        </div>

        {/* eGFR Meter Banner */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Activity className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <p className="text-xs text-slate-400">eGFR Calculation Index</p>
              <p className="text-lg font-bold text-white font-mono">
                {currentEGFR} <span className="text-xs font-normal text-slate-400">mL/min/1.73m²</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium">Estimated Clearance</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Patient Demographics & Vitals */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          <span>Demographics & Vital Signs</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          
          {/* Age */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Age (Years)</label>
            <input
              type="number"
              min="1"
              max="120"
              required
              value={formData.age}
              onChange={(e) => handleChange('age', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Blood Pressure */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Systolic BP (mmHg)</span>
              <span className="text-[10px] text-slate-500">Norm: 120</span>
            </label>
            <input
              type="number"
              min="50"
              max="240"
              required
              value={formData.bp}
              onChange={(e) => handleChange('bp', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Blood Glucose Random */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Blood Glucose (mg/dL)</span>
              <span className="text-[10px] text-slate-500">Norm: 70-140</span>
            </label>
            <input
              type="number"
              min="40"
              max="600"
              value={formData.bgr}
              onChange={(e) => handleChange('bgr', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

        </div>
      </div>

      {/* SECTION 2: Blood Chemistry & Electrolytes */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
          <span>Blood Chemistry & Laboratory Markers</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          
          {/* Serum Creatinine */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span className="text-sky-400 font-bold">Serum Creatinine (mg/dL)</span>
              <span className="text-[10px] text-slate-500">0.6 - 1.2</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="15.0"
              required
              value={formData.sc}
              onChange={(e) => handleChange('sc', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-sky-500/50 rounded-xl text-white font-bold focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Blood Urea */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Blood Urea (mg/dL)</span>
              <span className="text-[10px] text-slate-500">7 - 25</span>
            </label>
            <input
              type="number"
              step="1"
              min="5"
              max="300"
              required
              value={formData.bu}
              onChange={(e) => handleChange('bu', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Hemoglobin */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span className="text-teal-400 font-bold">Hemoglobin (g/dL)</span>
              <span className="text-[10px] text-slate-500">13.0 - 17.5</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="3.0"
              max="20.0"
              required
              value={formData.hemo}
              onChange={(e) => handleChange('hemo', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Packed Cell Volume */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Packed Cell Volume (%)</span>
              <span className="text-[10px] text-slate-500">40 - 52%</span>
            </label>
            <input
              type="number"
              min="15"
              max="65"
              value={formData.pcv}
              onChange={(e) => handleChange('pcv', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sodium */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Sodium (mEq/L)</span>
              <span className="text-[10px] text-slate-500">135 - 145</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.sod}
              onChange={(e) => handleChange('sod', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Potassium */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Potassium (mEq/L)</span>
              <span className="text-[10px] text-slate-500">3.5 - 5.0</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.pot}
              onChange={(e) => handleChange('pot', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* WBC Count */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>WBC Count (cells/cumm)</span>
              <span className="text-[10px] text-slate-500">4500-11000</span>
            </label>
            <input
              type="number"
              value={formData.wbcc}
              onChange={(e) => handleChange('wbcc', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* RBC Count */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>RBC Count (millions/cmm)</span>
              <span className="text-[10px] text-slate-500">4.5 - 5.9</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.rbcc}
              onChange={(e) => handleChange('rbcc', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

        </div>
      </div>

      {/* SECTION 3: Urinalysis & Proteinuria */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>Urinalysis & Kidney Markers</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          
          {/* Specific Gravity */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Specific Gravity (sg)</label>
            <select
              value={formData.sg}
              onChange={(e) => handleChange('sg', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={1.005}>1.005 (Hyposthenuria)</option>
              <option value={1.010}>1.010 (Isosthenuria)</option>
              <option value={1.015}>1.015 (Mildly Low)</option>
              <option value={1.020}>1.020 (Normal)</option>
              <option value={1.025}>1.025 (Concentrated)</option>
            </select>
          </div>

          {/* Albumin */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Albumin / Proteinuria (al)</label>
            <select
              value={formData.al}
              onChange={(e) => handleChange('al', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={0}>Grade 0 (Absent / Normal)</option>
              <option value={1}>Grade 1 (Trace Protein)</option>
              <option value={2}>Grade 2 (Moderate Proteinuria)</option>
              <option value={3}>Grade 3 (Heavy Proteinuria)</option>
              <option value={4}>Grade 4 (Nephrotic Range)</option>
              <option value={5}>Grade 5 (Severe)</option>
            </select>
          </div>

          {/* Sugar */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Sugar / Glucosuria (su)</label>
            <select
              value={formData.su}
              onChange={(e) => handleChange('su', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={0}>0 (Negative)</option>
              <option value={1}>1 (+)</option>
              <option value={2}>2 (++)</option>
              <option value={3}>3 (+++)</option>
              <option value={4}>4 (++++)</option>
            </select>
          </div>

          {/* Red Blood Cells */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Red Blood Cells (RBC)</label>
            <select
              value={formData.rbc}
              onChange={(e) => handleChange('rbc', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal (Dysmorphic)</option>
            </select>
          </div>

          {/* Pus Cell */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Pus Cell (pc)</label>
            <select
              value={formData.pc}
              onChange={(e) => handleChange('pc', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal (Pyuria)</option>
            </select>
          </div>

          {/* Pus Cell Clumps */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Pus Cell Clumps (pcc)</label>
            <select
              value={formData.pcc}
              onChange={(e) => handleChange('pcc', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="notpresent">Not Present</option>
              <option value="present">Present</option>
            </select>
          </div>

          {/* Bacteria */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Bacteria (ba)</label>
            <select
              value={formData.ba}
              onChange={(e) => handleChange('ba', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="notpresent">Not Present</option>
              <option value="present">Present (Bacteriuria)</option>
            </select>
          </div>

        </div>
      </div>

      {/* SECTION 4: Co-morbidities & Symptoms */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>Clinical Symptoms & Co-morbidities</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          
          {/* Hypertension */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Hypertension</label>
            <select
              value={formData.htn}
              onChange={(e) => handleChange('htn', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {/* Diabetes Mellitus */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Diabetes Mellitus</label>
            <select
              value={formData.dm}
              onChange={(e) => handleChange('dm', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {/* Coronary Artery Disease */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Coronary Artery Disease</label>
            <select
              value={formData.cad}
              onChange={(e) => handleChange('cad', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {/* Appetite */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Appetite Status</label>
            <select
              value={formData.appet}
              onChange={(e) => handleChange('appet', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="good">Good</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          {/* Pedal Edema */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Pedal Edema</label>
            <select
              value={formData.pe}
              onChange={(e) => handleChange('pe', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {/* Anemia */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Anemia</label>
            <select
              value={formData.ane}
              onChange={(e) => handleChange('ane', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

        </div>
      </div>

      {/* Submit Action Bar */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => loadPreset('high')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition-all flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Form</span>
        </button>

        <button
          type="submit"
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-sky-500/25 transition-all flex items-center space-x-2 transform hover:-translate-y-0.5"
        >
          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
          <span>Run CKD Prediction</span>
        </button>
      </div>

    </form>
  );
}
