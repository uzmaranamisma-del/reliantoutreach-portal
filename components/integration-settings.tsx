'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

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
  useEffect(() => {
    void fetch('/api/integrations/outreach').then(async (response) => {
      if (response.ok)
        setConnection(
          ((await response.json()) as { connection: typeof connection })
            .connection,
        );
    });
  }, []);
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
  async function syncNow() {
    setSyncing(true);
    setError('');
    setSyncResult('');
    try {
      const response = await fetch('/api/sync/outreach', { method: 'POST' });
      const data = (await response.json()) as {
        error?: string;
        campaigns?: number;
        emailAccounts?: number;
        prospects?: number;
        messages?: number;
      };
      if (!response.ok) {
        setError(data.error || 'Data could not be synchronized.');
        return;
      }
      setSyncResult(
        `${data.campaigns ?? 0} campaigns, ${data.emailAccounts ?? 0} email accounts, ${data.prospects ?? 0} prospects and ${data.messages ?? 0} messages synchronized.`,
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
                className="secondary-action"
                disabled={syncing}
                onClick={() => void syncNow()}
              >
                {syncing ? 'Synchronizing…' : 'Sync now'}
              </button>
            )}
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
