'use client';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { responseJson } from '@/lib/response-json';

type Client = {
  id: string;
  name: string;
  primaryContactEmail: string | null;
  slug: string;
  status: string;
  packageName: string;
  monthlyCredits: number;
  monthlyEmailCapacity: number;
  priceCents: number;
  renewalDate: string | null;
  accountManager: string | null;
  campaigns: number;
  prospects: number;
  members: number;
  integrationStatus: string;
  lastSyncedAt: string | null;
  pendingInvite: string | null;
  createdAt: string;
};
const emptyForm = {
  name: '',
  clientEmail: '',
  packageName: 'Launch',
  monthlyCredits: 10000,
  monthlyEmailCapacity: 10000,
  price: 0,
  renewalDate: '',
  accountManager: '',
};

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentId, setCurrentId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [onboarding, setOnboarding] = useState<Client | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [onboardingStep, setOnboardingStep] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/clients', { cache: 'no-store' });
    if (!response.ok) {
      setError('Client records are unavailable.');
      return [] as Client[];
    }
    const data = (await response.json()) as {
      clients: Client[];
      currentWorkspaceId: string;
    };
    setClients(data.clients);
    setCurrentId(data.currentWorkspaceId);
    return data.clients;
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const visible = useMemo(
    () =>
      clients.filter((client) =>
        `${client.name} ${client.primaryContactEmail ?? ''} ${client.pendingInvite ?? ''} ${client.packageName} ${client.accountManager ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [clients, search],
  );
  const totals = useMemo(
    () => ({
      active: clients.filter((client) => client.status === 'active').length,
      campaigns: clients.reduce((sum, client) => sum + client.campaigns, 0),
      prospects: clients.reduce((sum, client) => sum + client.prospects, 0),
      connected: clients.filter(
        (client) => client.integrationStatus === 'connected',
      ).length,
    }),
    [clients],
  );
  async function createClient(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const response = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = (await responseJson(response)) as {
      error?: string;
      message?: string;
      id?: string;
    };
    if (response.ok) {
      setOpen(false);
      setForm({ ...emptyForm });
      const records = await load();
      const created = records.find((client) => client.id === result.id);
      setNotice(result.message || 'Client workspace created.');
      if (created) {
        setInviteEmail(created.primaryContactEmail || '');
        setOnboarding(created);
      }
    } else setError(result.error || 'Client could not be created.');
    setSaving(false);
  }
  async function setupAndInvite(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onboarding) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter the client’s valid email address.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    let previewSelected = false;
    try {
      if (normalizedEmail !== onboarding.primaryContactEmail) {
        setOnboardingStep('Saving the client email address…');
        const emailResponse = await fetch('/api/admin/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: onboarding.id,
            primaryContactEmail: normalizedEmail,
          }),
        });
        const emailResult = (await responseJson(emailResponse)) as {
          error?: string;
        };
        if (!emailResponse.ok)
          throw new Error(
            emailResult.error || 'Client email address could not be saved.',
          );
      }
      setOnboardingStep('Opening the client workspace…');
      const selectResponse = await fetch('/api/admin/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: onboarding.id }),
      });
      if (!selectResponse.ok) throw new Error('WORKSPACE_SELECT_FAILED');
      previewSelected = true;

      if (apiKey.trim()) {
        setOnboardingStep('Saving the encrypted connection…');
        const connectionResponse = await fetch('/api/integrations/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });
        const connectionResult = (await responseJson(connectionResponse)) as {
          error?: string;
        };
        if (!connectionResponse.ok)
          throw new Error(
            connectionResult.error || 'Connection could not be saved.',
          );
      } else if (
        !['configured', 'connected'].includes(onboarding.integrationStatus)
      ) {
        throw new Error('Enter this client’s outreach API key.');
      }

      if (onboarding.integrationStatus !== 'connected' || apiKey.trim()) {
        setOnboardingStep(
          'Synchronizing campaigns, prospects, replies and email accounts…',
        );
        const syncResponse = await fetch('/api/sync/outreach', {
          method: 'POST',
        });
        const syncResult = (await responseJson(syncResponse)) as {
          error?: string;
        };
        if (!syncResponse.ok)
          throw new Error(
            syncResult.error || 'Initial synchronization could not complete.',
          );
      }

      if (onboarding.members === 0) {
        setOnboardingStep('Sending the private portal invitation…');
        const invitationResponse = await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            role: 'client_admin',
          }),
        });
        const invitationResult = (await responseJson(invitationResponse)) as {
          error?: string;
        };
        if (!invitationResponse.ok)
          throw new Error(
            invitationResult.error || 'Invitation email could not be sent.',
          );
        setNotice(
          `${onboarding.name} is synchronized and the client invitation was sent to ${normalizedEmail}.`,
        );
      } else {
        setNotice(`${onboarding.name} is connected and synchronized.`);
      }
      setOnboarding(null);
      setInviteEmail('');
      setApiKey('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Client onboarding could not be completed.',
      );
    } finally {
      if (previewSelected)
        await fetch('/api/admin/workspace', { method: 'DELETE' }).catch(
          () => null,
        );
      setOnboardingStep('');
      setSaving(false);
      await load();
    }
  }
  async function previewWorkspace(id: string) {
    setSaving(true);
    const response = await fetch('/api/admin/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (response.ok) window.location.assign('/dashboard');
    else {
      setError('Workspace could not be opened.');
      setSaving(false);
    }
  }
  return (
    <>
      <div className="admin-kpis">
        <div>
          <Building2 />
          <span>Active clients</span>
          <b>{totals.active}</b>
        </div>
        <div>
          <CheckCircle2 />
          <span>Connected accounts</span>
          <b>{totals.connected}</b>
        </div>
        <div>
          <ChevronRight />
          <span>Campaigns</span>
          <b>{totals.campaigns.toLocaleString()}</b>
        </div>
        <div>
          <Users />
          <span>Prospects</span>
          <b>{totals.prospects.toLocaleString()}</b>
        </div>
      </div>
      <div className="client-toolbar">
        <label>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients, packages, managers…"
          />
        </label>
        <button className="primary-action" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add client
        </button>
      </div>
      {error && <p className="domain-error">{error}</p>}
      {notice && <p className="domain-success">{notice}</p>}
      <section className="client-table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Package & usage</th>
                <th>Workspace data</th>
                <th>Connection</th>
                <th>Account manager</th>
                <th>Setup</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => (
                <tr key={client.id}>
                  <td>
                    <b className="client-summary-name">{client.name}</b>
                    <a
                      className="client-summary-email"
                      href={`mailto:${client.primaryContactEmail || client.pendingInvite || ''}`}
                    >
                      {client.primaryContactEmail || client.pendingInvite || 'Email not added'}
                    </a>
                    <small>
                      Onboarded{' '}
                      {new Date(client.createdAt).toLocaleDateString()}
                    </small>
                  </td>
                  <td>
                    <span className={`client-status ${client.status}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="client-package-summary">
                    <b>{client.packageName}</b>
                    <small>
                      {client.monthlyCredits.toLocaleString()} credits ·{' '}
                      {client.monthlyEmailCapacity.toLocaleString()} emails
                    </small>
                    <small>
                      {client.priceCents
                        ? `$${(client.priceCents / 100).toLocaleString()}/month`
                        : 'Price not set'}
                    </small>
                  </td>
                  <td className="client-data-summary">
                    <b>{client.campaigns} campaigns</b>
                    <small>{client.prospects.toLocaleString()} prospects</small>
                    <small>{client.members} users</small>
                  </td>
                  <td>
                    <span
                      className={`connection-dot ${client.integrationStatus}`}
                    />{' '}
                    {client.integrationStatus.replaceAll('_', ' ')}
                  </td>
                  <td>{client.accountManager || 'Unassigned'}</td>
                  <td>
                    <div className="client-row-actions">
                      {client.id !== currentId &&
                        (client.integrationStatus !== 'connected' ||
                          client.members === 0) && (
                          <button
                            className="row-action setup"
                            disabled={saving}
                            onClick={() => {
                              setError('');
                              setInviteEmail(
                                client.primaryContactEmail ||
                                  client.pendingInvite ||
                                  '',
                              );
                              setApiKey('');
                              setOnboarding(client);
                            }}
                          >
                            <KeyRound size={14} />
                            {client.integrationStatus === 'connected'
                              ? 'Invite client'
                              : 'Set up & invite'}
                          </button>
                        )}
                      <button
                        className="row-action"
                        disabled={saving || currentId === client.id}
                        onClick={() => void previewWorkspace(client.id)}
                      >
                        {currentId === client.id
                          ? 'Current'
                          : 'Preview as client'}{' '}
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="table-empty">No matching clients found.</div>
        )}
      </section>
      {open && (
        <div className="followup-modal-backdrop">
          <button
            className="followup-modal-dismiss"
            onClick={() => setOpen(false)}
            aria-label="Close client form"
          />
          <form
            className="followup-modal client-form"
            onSubmit={(event) => void createClient(event)}
          >
            <header>
              <div>
                <p className="eyebrow">CLIENT ONBOARDING</p>
                <h2>Create client workspace</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>
            <div className="editor-grid">
              <label>
                Client name
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Acme Automation"
                />
              </label>
              <label>
                Client email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.clientEmail}
                  onChange={(event) =>
                    setForm({ ...form, clientEmail: event.target.value })
                  }
                  placeholder="client@company.com"
                />
              </label>
            </div>
            <div className="editor-grid">
              <label>
                Package
                <select
                  value={form.packageName}
                  onChange={(event) =>
                    setForm({ ...form, packageName: event.target.value })
                  }
                >
                  <option>Launch</option>
                  <option>Growth</option>
                  <option>Enterprise</option>
                </select>
              </label>
              <label>
                Monthly credits
                <input
                  type="number"
                  min="0"
                  value={form.monthlyCredits}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      monthlyCredits: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Monthly email allowance
                <input
                  type="number"
                  min="0"
                  value={form.monthlyEmailCapacity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      monthlyEmailCapacity: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Monthly price ($)
                <div className="money-input">
                  <CircleDollarSign size={17} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: Number(event.target.value) })
                    }
                  />
                </div>
              </label>
              <label>
                Renewal date
                <input
                  type="date"
                  value={form.renewalDate}
                  onChange={(event) =>
                    setForm({ ...form, renewalDate: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Account manager
              <input
                value={form.accountManager}
                onChange={(event) =>
                  setForm({ ...form, accountManager: event.target.value })
                }
                placeholder="Team member name"
              />
            </label>
            <p>
              The workspace will be created first. You will securely connect and
              synchronize its outreach data before the invitation is sent.
            </p>
            <footer>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? 'Creating workspace…' : 'Create & continue setup'}
              </button>
            </footer>
          </form>
        </div>
      )}
      {onboarding && (
        <div className="followup-modal-backdrop">
          <button
            className="followup-modal-dismiss"
            onClick={() => !saving && setOnboarding(null)}
            aria-label="Close onboarding"
          />
          <form
            className="followup-modal client-form onboarding-form"
            onSubmit={(event) => void setupAndInvite(event)}
          >
            <header>
              <div>
                <p className="eyebrow">PRIVATE CLIENT ONBOARDING</p>
                <h2>Set up {onboarding.name}</h2>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setOnboarding(null)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>
            <div className="onboarding-steps">
              <span className="done">
                <CheckCircle2 /> Workspace created
              </span>
              <span
                className={
                  onboarding.integrationStatus === 'connected' ? 'done' : ''
                }
              >
                <RefreshCw /> Data synchronized
              </span>
              <span
                className={
                  onboarding.members > 0 || onboarding.pendingInvite
                    ? 'done'
                    : ''
                }
              >
                <Send />
                {onboarding.members > 0
                  ? 'Client joined'
                  : onboarding.pendingInvite
                    ? 'Invitation sent'
                    : 'Invite client'}
              </span>
            </div>
            <label>
              Client email
              <input
                type="email"
                required
                autoComplete="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="client@company.com"
              />
            </label>
            <div className="setup-guide" aria-label="Client setup steps">
              <b>Simple setup</b>
              <ol>
                <li>Open the API website and copy this client account’s API key.</li>
                <li>Paste the key below.</li>
                <li>We will sync the data first, then email the invitation.</li>
              </ol>
              <a
                href="https://app.manyreach.com/api#v2/description/introduction"
                target="_blank"
                rel="noreferrer"
              >
                Open API website <ExternalLink />
              </a>
            </div>
            <label>
              Outreach API key
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                placeholder={
                  ['configured', 'connected'].includes(
                    onboarding.integrationStatus,
                  )
                    ? 'Saved securely — leave blank to use it'
                    : 'Paste this client’s API key'
                }
                required={
                  !['configured', 'connected'].includes(
                    onboarding.integrationStatus,
                  )
                }
              />
            </label>
            <p>
              The key is encrypted and never shown to the client. Invitation is
              sent only after the initial synchronization succeeds.
            </p>
            {onboardingStep && (
              <p className="onboarding-progress">
                <RefreshCw /> {onboardingStep}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="secondary-action"
                disabled={saving}
                onClick={() => setOnboarding(null)}
              >
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving
                  ? 'Completing onboarding…'
                  : onboarding.pendingInvite
                    ? 'Resend client invite'
                    : onboarding.members === 0
                    ? 'Sync data & send invite'
                    : 'Sync client data'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
