'use client';

import { Copy, Plus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type TeamData = {
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    updatedAt: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
  }>;
};

const roleName = (role: string) =>
  role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function TeamManager() {
  const [data, setData] = useState<TeamData | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client_viewer');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    void fetch('/api/team')
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED');
        setData((await response.json()) as TeamData);
      })
      .catch(() => setMessage('Team information could not be loaded.'));
  }, []);
  useEffect(load, [load]);

  const invite = async () => {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setMessage(`Invitation email sent to ${email}.`);
      setEmail('');
      setOpen(false);
      load();
    } else setMessage(result.error || 'Invitation could not be created.');
    setSaving(false);
  };

  return (
    <section className="team-manager">
      <div className="team-actions">
        <div>
          <h2>Workspace team</h2>
          <p>Only invited people can join this client workspace.</p>
        </div>
        <button className="primary-action" onClick={() => setOpen(true)}>
          <Plus size={16} /> Invite member
        </button>
      </div>
      {message && <div className="team-message">{message}</div>}
      {!data ? (
        <div className="table-loading">
          <span /> Loading team…
        </div>
      ) : (
        <div className="panel section-table table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <b>{member.name || member.email.split('@')[0]}</b>
                  </td>
                  <td>{member.email}</td>
                  <td>{roleName(member.role)}</td>
                  <td>Active</td>
                </tr>
              ))}
              {data.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>
                    <b>Invitation pending</b>
                  </td>
                  <td>{invitation.email}</td>
                  <td>{roleName(invitation.role)}</td>
                  <td>Invited</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="invite-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <button
              className="modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <Users size={24} />
            <h2 id="invite-title">Invite a client member</h2>
            <p>They will join this workspace using the same email address.</p>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="client@company.com"
              />
            </label>
            <label>
              Workspace role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="client_viewer">Client Viewer</option>
                <option value="client_admin">Client Admin</option>
              </select>
            </label>
            <div className="invite-note">
              <Copy size={15} /> Invitation remains valid for 7 days.
            </div>
            <button
              className="primary-action"
              disabled={saving || !email.trim()}
              onClick={invite}
            >
              {saving ? 'Sending invitation…' : 'Send invitation email'}
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
