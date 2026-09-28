import React from 'react';
import { LogOut, ShieldCheck, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordCard from '../shared/ChangePasswordCard';
import { PageHeader, Card } from '../ui/UI';

/** Doctor account settings: password and sign-out. Doctor accounts are managed by the administrator. */
export default function DoctorSettings({ onNavigate }) {
  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    onNavigate('/');
  };
  return (
    <div className="stack-lg">
      <PageHeader title="Settings" subtitle="Password and sign-in security for your doctor account." />
      <div className="grid-main-side">
        <ChangePasswordCard />
        <div className="stack-lg">
          <Card title="Account management" icon={ShieldCheck}>
            <p className="small">
              Your name, Doctor ID, specialty and patient assignments are managed by the hospital administrator.
              Contact the administrator if any of these details need to change.
            </p>
          </Card>
          <Card title="Notifications" icon={Bell}>
            <p className="small muted">You receive an in-app security notification whenever your password is changed or reset.</p>
          </Card>
          <Card title="Sign out" icon={LogOut}>
            <p className="small muted">Sign out when you finish, especially on a shared computer.</p>
            <button className="btn btn-danger btn-block mt-16" onClick={handleLogout}><LogOut /> Logout</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
