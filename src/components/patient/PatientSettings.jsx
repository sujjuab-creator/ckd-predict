import React from 'react';
import { Bell, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../shared/ProfilePanel';
import { PageHeader, Card } from '../ui/UI';

/**
 * Account settings for patients: account details, change password
 * (POST /api/auth/change-password) and logout. No admin settings are exposed.
 */
export default function PatientSettings({ onNavigate }) {
  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    onNavigate('/');
  };

  return (
    <div className="stack-lg">
      <PageHeader title="Settings" subtitle="Manage your account, password and sign-in." />
      <ProfilePanel
        extra={(
          <Card title="Notifications" icon={Bell}>
            <p className="small">
              You automatically receive in-app notifications when a new report is added to your record, when your
              doctor reviews your results, and when your password changes. Notification preferences can&apos;t be
              customised yet.
            </p>
            <button className="btn btn-sm btn-outline mt-16" onClick={() => onNavigate('/patient/notifications')}>View notifications</button>
          </Card>
        )}
        roleNote={(
          <Card title="Sign out" icon={ShieldCheck}>
            <p className="small muted">Sign out when you finish, especially on a shared or public device.</p>
            <button className="btn btn-danger btn-block mt-16" onClick={handleLogout}><LogOut /> Logout</button>
          </Card>
        )}
      />
    </div>
  );
}
