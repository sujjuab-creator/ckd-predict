import React from 'react';
import Logo from './brand/Logo';
import { PUBLIC_SECTIONS, scrollToSection } from './Navbar';

export default function Footer({ currentPath = '/', onNavigate }) {
  const go = (id) => scrollToSection(id, currentPath, onNavigate);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo light />
            <p style={{ marginTop: 16, maxWidth: 340 }}>
              AI-assisted Chronic Kidney Disease risk prediction with explainable results,
              built to support — not replace — clinical judgement.
            </p>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><button onClick={() => go('about')}>About CKD</button></li>
              <li><button onClick={() => go('stages')}>CKD Stages</button></li>
              <li><button onClick={() => go('prevention')}>Healthy Kidney Habits</button></li>
              <li><button onClick={() => go('faq')}>FAQ</button></li>
            </ul>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              {PUBLIC_SECTIONS.filter((s) => ['features', 'how-it-works', 'contact'].includes(s.id)).map((s) => (
                <li key={s.id}><button onClick={() => go(s.id)}>{s.label}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><button onClick={() => onNavigate('/login')}>Sign In</button></li>
              <li><button onClick={() => onNavigate('/signup/patient')}>Patient Sign Up</button></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} CKD PREDICT. For educational and decision-support purposes.</span>
          <span>AI-assisted risk prediction — not a medical diagnosis.</span>
        </div>
      </div>
    </footer>
  );
}
