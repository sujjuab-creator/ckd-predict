import React from 'react';
import { Activity, FileText } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
              <span className="text-lg font-bold text-white font-mono">CKD<span className="gradient-text">PREDICT</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chronic Kidney Disease Prediction System. An AI-assisted platform for analyzing clinical patient data and supporting CKD prediction.
            </p>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Platform Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('/')} className="hover:text-sky-400 transition-colors">
                  Home Page
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/patient')} className="hover:text-sky-400 transition-colors">
                  Patient Dashboard Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/doctor')} className="hover:text-sky-400 transition-colors">
                  Doctor Clinical Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/admin')} className="hover:text-sky-400 transition-colors">
                  Admin & Analytics Console
                </button>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Core Modules</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('/assessment')} className="hover:text-sky-400 transition-colors">
                  CKD Prediction
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/patient')} className="hover:text-sky-400 transition-colors">
                  Patient Data Management
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/patient')} className="hover:text-sky-400 transition-colors">
                  Prediction History
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/assessment')} className="hover:text-sky-400 transition-colors">
                  Explainable AI
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/admin')} className="hover:text-sky-400 transition-colors">
                  Medical Reports & Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Medical Disclaimer */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <FileText className="w-4 h-4" />
              <span>Medical Disclaimer</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.
            </p>
          </div>

        </div>

        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CKD PREDICT System. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <span className="flex items-center space-x-1">
              <span>Chronic Kidney Disease Prediction System</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
