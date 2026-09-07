'use client';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export default function IntegrationSettings() {
  const [apiKey, setApiKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<null | {
    status: string;
    lastFour: string | null;
    updatedAt: string;
  }>(null);
  const [emailApiKey, setEmailApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('info@reliantoutreach.com');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailConnection, setEmailConnection] = useState<null | {
    status: string;
    lastFour: string | null;
  }>(null);
  useEffect(() => {
    void fetch('/api/integrations/outreach').then(async (response) => {
      if (response.ok)
        setConnection(
          ((await response.json()) as { connection: typeof connection })
            .connection,
        );
    });
  }, []);
  useEffect(() => {
    void fetch('/api/integrations/email').then(async (response) => {
      if (response.ok)
        setEmailConnection(
          ((await response.json()) as { connection: typeof emailConnection })
            .connection,
        );
    });
  }, []);
  async function saveEmail(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailSaving(true);
    setEmailMessage('');
    const response = await fetch('/api/integrations/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: emailApiKey, fromEmail }),
    });
    const result = (await response.json()) as {
      error?: string;
      connection?: NonNullable<typeof emailConnection>;
    };
    if (response.ok && result.connection) {
      setEmailConnection(result.connection);
      setEmailApiKey('');
      setEmailMessage('Invitation email delivery is connected.');
    } else setEmailMessage(result.error || 'Email setup could not be saved.');
    setEmailSaving(false);
  }
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = (await response.json()) as {
        error?: string;
        connection?: NonNullable<typeof connection>;
      };
      if (!response.ok || !data.connection) {
        setError(data.error || 'Connection could not be saved.');
        return;
      }
      setConnection(data.connection);
      setApiKey('');
    } catch {
      setError('Connection could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  }
  async function syncNow(mode: 'quick' | 'full') {
    setSyncing(true);
    setError('');
    setSyncResult('');
    try {
      const response = await fetch(
        `/api/sync/outreach${mode === 'quick' ? '?mode=quick' : ''}`,
        { method: 'POST' },
      );
      const data = (await response.json()) as {
        error?: string;
        campaigns?: number;
        emailAccounts?: number;
        prospects?: number;
        messages?: number;
        warnings?: string[];
      };
      if (!response.ok) {
        setError(data.error || 'Data could not be synchronized.');
        return;
      }
      const summary =
        mode === 'quick'
          ? `${data.campaigns ?? 0} campaigns and ${data.emailAccounts ?? 0} email accounts refreshed.`
          : `${data.campaigns ?? 0} campaigns, ${data.emailAccounts ?? 0} email accounts, ${data.prospects ?? 0} prospects and ${data.messages ?? 0} messages synchronized.`;
      setSyncResult(
        data.warnings?.length
          ? `${summary} Some additional records are temporarily unavailable; run sync again shortly.`
          : summary,
      );
      const status = await fetch('/api/integrations/outreach');
      if (status.ok)
        setConnection(
          ((await status.json()) as { connection: typeof connection })
            .connection,
        );
    } catch {
      setError('Data could not be synchronized. Try again.');
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="integration-layout">
      <section className="integration-card">
        <div className="integration-card-head">
          <span>
            <KeyRound />
          </span>
          <div>
            <h2>Outreach infrastructure</h2>
            <p>Connect your sending workspace securely.</p>
          </div>
          {connection && (
            <em>
              <CheckCircle2 />{' '}
              {connection.status === 'connected' ? 'Connected' : 'Configured'}
            </em>
          )}
        </div>
        <form onSubmit={(e) => void submit(e)}>
          <label htmlFor="outreach-key">API key</label>
          <div className="secret-input">
            <input
              id="outreach-key"
              type={visible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                connection
                  ? `Saved key ending in ••••${connection.lastFour || ''}`
                  : 'Paste your new API key'
              }
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? 'Hide API key' : 'Show API key'}
            >
              {visible ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {error && <p className="domain-error">{error}</p>}
          {syncResult && <p className="sync-success">{syncResult}</p>}
          <div className="integration-form-foot">
            <p>
              <ShieldCheck />
              Encrypted before storage. The saved key is never displayed again.
            </p>
            <button
              className="primary-action"
              disabled={saving || apiKey.trim().length < 20}
            >
              {saving
                ? 'Saving securely…'
                : connection
                  ? 'Replace connection'
                  : 'Connect account'}
            </button>
            {connection && (
              <button
                type="button"
                className="primary-action"
                disabled={syncing}
                onClick={() => void syncNow('quick')}
              >
                {syncing ? 'Refreshing…' : 'Quick sync'}
              </button>
            )}
            {connection && (
              <button
                type="button"
                className="secondary-action"
                disabled={syncing}
                onClick={() => void syncNow('full')}
              >
                {syncing ? 'Synchronizing…' : 'Full sync'}
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="integration-card email-integration-card">
        <div className="integration-card-head">
          <span>
            <Mail />
          </span>
          <div>
            <h2>Invitation email delivery</h2>
            <p>Send branded client invitations from your verified email.</p>
          </div>
          {emailConnection && (
            <em>
              <CheckCircle2 /> Connected
            </em>
          )}
        </div>
        <form onSubmit={(event) => void saveEmail(event)}>
          <label htmlFor="invitation-from">Verified sender email</label>
          <input
            id="invitation-from"
            type="email"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
            placeholder="info@reliantoutreach.com"
          />
          <label htmlFor="email-api-key">Resend API key</label>
          <div className="secret-input">
            <input
              id="email-api-key"
              type="password"
              value={emailApiKey}
              onChange={(event) => setEmailApiKey(event.target.value)}
              placeholder={
                emailConnection
                  ? `Saved key ending in ••••${emailConnection.lastFour || ''}`
                  : 'Paste re_… key'
              }
              autoComplete="off"
            />
          </div>
          {emailMessage && (
            <p className={emailConnection ? 'sync-success' : 'domain-error'}>
              {emailMessage}
            </p>
          )}
          <div className="integration-form-foot">
            <p>
              <ShieldCheck /> Encrypted before storage and never shown to
              clients.
            </p>
            <button
              className="primary-action"
              disabled={emailSaving || emailApiKey.length < 20 || !fromEmail}
            >
              {emailSaving
                ? 'Saving securely…'
                : emailConnection
                  ? 'Replace email connection'
                  : 'Connect invitation email'}
            </button>
          </div>
        </form>
      </section>
      <aside className="integration-status">
        <h3>Setup status</h3>
        <ol>
          <li className="done">
            <b>1</b>
            <span>
              <strong>Workspace created</strong>
              <small>Your outreach workspace is ready.</small>
            </span>
          </li>
          <li className={connection ? 'done' : ''}>
            <b>2</b>
            <span>
              <strong>Secure connection</strong>
              <small>
                {connection
                  ? 'API credentials are encrypted and saved.'
                  : 'Add a fresh API key to continue.'}
              </small>
            </span>
          </li>
          <li className={connection?.status === 'connected' ? 'done' : ''}>
            <b>3</b>
            <span>
              <strong>Data synchronization</strong>
              <small>
                {connection?.status === 'connected'
                  ? 'Campaigns and email accounts are synchronized.'
                  : 'Run the first synchronization after saving your key.'}
              </small>
            </span>
          </li>
        </ol>
      </aside>
    </div>
  );
}
