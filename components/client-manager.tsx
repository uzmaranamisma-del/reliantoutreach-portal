'use client';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/clients', { cache: 'no-store' });
    if (!response.ok) {
      setError('Client records are unavailable.');
      return;
    }
    const data = (await response.json()) as {
      clients: Client[];
      currentWorkspaceId: string;
    };
    setClients(data.clients);
    setCurrentId(data.currentWorkspaceId);
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
    const result = (await response.json()) as {
      error?: string;
      warning?: string;
    };
    if (response.ok) {
      setOpen(false);
      setForm({ ...emptyForm });
      setNotice(
        result.warning || 'Client workspace created and invitation email sent.',
      );
      await load();
    } else setError(result.error || 'Client could not be created.');
    setSaving(false);
  }
  async function viewWorkspace(id: string) {
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
                    <button
                      className="row-action"
                      disabled={saving || currentId === client.id}
                      onClick={() => void viewWorkspace(client.id)}
                    >
                      {currentId === client.id ? 'Current' : 'View'}{' '}
                      <ChevronRight size={15} />
                    </button>
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
              The client will receive a Client Admin invitation as soon as the
              workspace is created.
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
                {saving ? 'Creating & inviting…' : 'Create workspace & invite'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
