'use client';

import { Eye, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function ClientPreviewBanner({
  active,
  workspaceName,
}: {
  active: boolean;
  workspaceName: string;
}) {
  const [exiting, setExiting] = useState(false);
  if (!active) return null;

  async function exitPreview() {
    setExiting(true);
    const response = await fetch('/api/admin/workspace', { method: 'DELETE' });
    if (response.ok) window.location.assign('/clients');
    else setExiting(false);
  }

  return (
    <div className="client-preview-banner" role="status">
      <span>
        <Eye size={17} />
        Viewing <b>{workspaceName}</b> as a client
      </span>
      <button onClick={() => void exitPreview()} disabled={exiting}>
        <LogOut size={15} /> {exiting ? 'Exiting…' : 'Exit client view'}
      </button>
    </div>
  );
}
