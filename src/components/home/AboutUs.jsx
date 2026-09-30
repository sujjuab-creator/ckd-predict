import React from 'react';
import { GraduationCap, Users, UserCheck, Building2, BookOpen } from 'lucide-react';

const TEAM_MEMBERS = [
  { name: 'Miss. Shreya M. Angadi' },
  { name: 'Mr. Sheetal A. Sankannavar' },
  { name: 'Miss. Sanjana Kanatti' },
  { name: 'Mr. Sanket K. Yeshi' },
];

export default function AboutUs() {
  return (
    <section className="section section-alt about-us-section" id="about-us">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">About Us</span>
          <h2>About Us</h2>
          <p>Chronic Kidney Disease Prediction Using Machine Learning</p>
        </div>

        <div className="about-us-grid">
          {/* 1. COLLEGE */}
          <div className="card card-hover college-card">
            <div className="college-card-header">
              <span className="ic tone-green">
                <GraduationCap />
              </span>
              <div>
                <span className="card-badge">COLLEGE</span>
                <h3>Hirasugar Institute of Technology</h3>
                <p className="college-location">Nidasoshi – 591236</p>
              </div>
            </div>
            <div className="college-card-body">
              <div className="college-info-item">
                <span className="ic-sm tone-navy">
                  <BookOpen />
                </span>
                <div>
                  <strong>Department</strong>
                  <p>Department of Computer Science & Engineering</p>
                </div>
              </div>
              <div className="college-info-item">
                <span className="ic-sm tone-blue">
                  <Building2 />
                </span>
                <div>
                  <strong>Affiliation</strong>
                  <p>Affiliated to Visvesvaraya Technological University, Belagavi</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DEVELOPMENT TEAM */}
          <div className="team-container">
            <div className="area-title center">
              <span className="ic tone-blue">
                <Users />
              </span>
              <h3>DEVELOPMENT TEAM</h3>
            </div>
            <div className="team-grid">
              {TEAM_MEMBERS.map((member) => (
                <div key={member.name} className="card card-hover team-card">
                  <div className="team-avatar">
                    <Users />
                  </div>
                  <h4 className="team-name">{member.name}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* 3. PROJECT MENTOR */}
          <div className="mentor-container">
            <div className="card card-hover mentor-card">
              <span className="ic tone-navy mentor-ic">
                <UserCheck />
              </span>
              <div className="mentor-content">
                <span className="mentor-badge">PROJECT MENTOR</span>
                <p className="mentor-guidance">Under the Guidance of</p>
                <h3 className="mentor-name">Dr. Shivanand V. Manjaragi</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
