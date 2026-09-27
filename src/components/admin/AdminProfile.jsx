import React from 'react';
import { ShieldCheck } from 'lucide-react';
import ProfilePanel from '../shared/ProfilePanel';
import { PageHeader, Card } from '../ui/UI';

export default function AdminProfile() {
  return (
    <div className="stack-lg">
      <PageHeader title="Settings" subtitle="Administrator account details and password." />
      <ProfilePanel
        roleNote={(
          <Card title="Administrator policy" icon={ShieldCheck}>
            <ul className="stack small" style={{ color: 'var(--text-2)' }}>
              <li>Exactly one Administrator account exists; it is created from server configuration.</li>
              <li>There is no public admin registration and additional admins cannot be created.</li>
              <li>The Administrator account cannot be deactivated or deleted.</li>
              <li>Admin credentials are never stored in the frontend source code.</li>
            </ul>
          </Card>
        )}
      />
    </div>
  );
}
