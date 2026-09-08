'use client';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
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
        `${client.name} ${client.packageName} ${client.accountManager ?? ''}`
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
      if (created) setOnboarding(created);
    } else setError(result.error || 'Client could not be created.');
    setSaving(false);
  }
  async function setupAndInvite(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onboarding?.primaryContactEmail) return;
    setSaving(true);
    setError('');
    setNotice('');
    let previewSelected = false;
    try {
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
            email: onboarding.primaryContactEmail,
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
          `${onboarding.name} is synchronized and the client invitation was sent to ${onboarding.primaryContactEmail}.`,
        );
      } else {
        setNotice(`${onboarding.name} is connected and synchronized.`);
      }
      setOnboarding(null);
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
                <th>Client email</th>
                <th>Status</th>
                <th>Package</th>
                <th>Monthly credits</th>
                <th>Monthly emails</th>
                <th>Price</th>
                <th>Campaigns</th>
                <th>Prospects</th>
                <th>Users</th>
                <th>Connection</th>
                <th>Account manager</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => (
                <tr key={client.id}>
                  <td>
                    <b>{client.name}</b>
                    <small>
                      Onboarded{' '}
                      {new Date(client.createdAt).toLocaleDateString()}
                    </small>
                  </td>
                  <td>
                    {client.primaryContactEmail || client.pendingInvite || '—'}
                  </td>
                  <td>
                    <span className={`client-status ${client.status}`}>
                      {client.status}
                    </span>
                  </td>
                  <td>{client.packageName}</td>
                  <td>{client.monthlyCredits.toLocaleString()}</td>
                  <td>{client.monthlyEmailCapacity.toLocaleString()}</td>
                  <td>
                    {client.priceCents
                      ? `$${(client.priceCents / 100).toLocaleString()}`
                      : '—'}
                  </td>
                  <td>{client.campaigns}</td>
                  <td>{client.prospects.toLocaleString()}</td>
                  <td>{client.members}</td>
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
              <span className={onboarding.members > 0 ? 'done' : ''}>
                <Send /> Client invited
              </span>
            </div>
            <label>
              Client email
              <input
                type="email"
                readOnly
                value={onboarding.primaryContactEmail || ''}
              />
            </label>
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
