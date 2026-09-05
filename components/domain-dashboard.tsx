'use client';

import { Globe2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type DomainRow = {
  domain: string;
  status: string;
  spfStatus: string | null;
  dkimStatus: string | null;
  dmarcStatus: string | null;
  mxStatus: string | null;
  mailboxCount: number;
  sent14d: number;
  opened14d: number;
  sent7d: number;
  opened7d: number;
  sent24h: number;
  opened24h: number;
};

const format = new Intl.NumberFormat();
const rate = (opened: number, sent: number) =>
  sent ? `${Math.round((opened / sent) * 100)}%` : '—';
const isGood = (value: string | null) =>
  ['healthy', 'found', 'valid', 'active'].includes((value ?? '').toLowerCase());
const label = (kind: string, value: string | null) => {
  if (kind === 'DKIM' && value === 'selector_needed')
    return 'DKIM selector needed';
  if (!value || value === 'pending') return `${kind} pending`;
  return `${kind} ${isGood(value) ? 'ok' : value.replaceAll('_', ' ')}`;
};

export default function DomainDashboard({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    void fetch('/api/domains')
      .then(async (response) => {
        if (!response.ok) throw new Error('load_failed');
        const data = (await response.json()) as { domains: DomainRow[] };
        setRows(data.domains);
      })
      .finally(() => setLoading(false));
  }, [refreshKey, reload]);

  const checkDns = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/domains/check', { method: 'POST' });
      if (response.ok) setReload((value) => value + 1);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="domain-dashboard">
      <div className="domain-controls">
        <button onClick={checkDns} disabled={checking}>
          <ShieldCheck size={17} />
          {checking ? 'Checking DNS…' : 'Check DNS settings'}
        </button>
        <button
          onClick={() => setReload((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} /> Refresh data
        </button>
        <span>Last updated from synchronized outreach data</span>
      </div>
      <div className="domain-info">
        <Globe2 size={18} />
        <p>
          Sending activity grouped by domain for the last 14 days, 7 days and 24
          hours. Warm-up traffic is excluded where the synchronized source
          identifies it.
        </p>
      </div>
      <section className="panel domain-performance">
        <div className="table-scroll">
          <table>
            <thead>
              <tr className="domain-group-head">
                <th rowSpan={2}>Domain</th>
                <th rowSpan={2}>DNS status</th>
                <th colSpan={3}>Last 14 days</th>
                <th colSpan={3}>Last 7 days</th>
                <th colSpan={3}>Last 24 hours</th>
              </tr>
              <tr>
                {[0, 1, 2].flatMap((group) => [
                  <th key={`${group}-sent`}>Sent</th>,
                  <th key={`${group}-opened`}>Opened</th>,
                  <th key={`${group}-bounced`}>Bounced</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="domain-empty">
                    Loading domain activity…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.domain}>
                    <td>
                      <strong>{row.domain}</strong>
                      <small>
                        {row.mailboxCount} email{' '}
                        {row.mailboxCount === 1 ? 'account' : 'accounts'}
                      </small>
                    </td>
                    <td>
                      <div className="dns-chips">
                        {(['SPF', 'DKIM', 'DMARC', 'MX'] as const).map(
                          (kind) => {
                            const value =
                              kind === 'SPF'
                                ? row.spfStatus
                                : kind === 'DKIM'
                                  ? row.dkimStatus
                                  : kind === 'DMARC'
                                    ? row.dmarcStatus
                                    : row.mxStatus;
                            return (
                              <span
                                key={kind}
                                className={isGood(value) ? 'ok' : 'pending'}
                              >
                                {label(kind, value)}
                              </span>
                            );
                          },
                        )}
                      </div>
                    </td>
                    <td>{format.format(row.sent14d)}</td>
                    <td className="open-rate">
                      {rate(row.opened14d, row.sent14d)}
                    </td>
                    <td
                      className="metric-unavailable"
                      title="Domain-level bounce data is unavailable from the connected source"
                    >
                      —
                    </td>
                    <td>{format.format(row.sent7d)}</td>
                    <td className="open-rate">
                      {rate(row.opened7d, row.sent7d)}
                    </td>
                    <td
                      className="metric-unavailable"
                      title="Domain-level bounce data is unavailable from the connected source"
                    >
                      —
                    </td>
                    <td>{format.format(row.sent24h)}</td>
                    <td className="open-rate">
                      {rate(row.opened24h, row.sent24h)}
                    </td>
                    <td
                      className="metric-unavailable"
                      title="Domain-level bounce data is unavailable from the connected source"
                    >
                      —
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="domain-empty">
                    <Globe2 size={24} />
                    No synchronized domains yet. Add a domain or synchronize
                    email accounts to see activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer>
          Showing {rows.length} domains · DNS checks are performed independently
          by ReliantOutreach
        </footer>
      </section>
    </div>
  );
}
