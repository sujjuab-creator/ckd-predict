import React from 'react';
import ProfilePanel from '../shared/ProfilePanel';
import { PageHeader } from '../ui/UI';

export default function DoctorProfile() {
  return (
    <div className="stack-lg">
      <PageHeader title="My Profile" subtitle="Your doctor account details and password." />
      <ProfilePanel />
    </div>
  );
}
