'use client';
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  Search,
  Settings,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
const nav = [
  [LayoutDashboard, 'Dashboard'],
  [Users, 'Prospects'],
  [Target, 'Campaigns'],
  [Inbox, 'Replies'],
  [Mail, 'Email Accounts'],
  [Globe2, 'Domains'],
  [CalendarDays, 'Meetings'],
  [TrendingUp, 'Analytics'],
  [FileText, 'Files'],
  [Users, 'Team'],
  [Settings, 'Settings'],
] as const;
const seedMetrics = [
  ['Active campaigns', '4', '+1', 'vs previous period'],
  ['Emails sent', '12,840', '+14.8%', 'vs previous period'],
  ['Replies', '318', '+8.2%', '2.6% reply rate'],
  ['Positive replies', '74', '+19.4%', '0.6% positive rate'],
  ['Meetings booked', '12', '+20.0%', '3 added this week'],
] as const;
const funnel = [
  ['Prospects', '18,420', 100],
  ['Contacted', '12,840', 82],
  ['Delivered', '12,370', 73],
  ['Replies', '318', 58],
  ['Interested', '74', 46],
  ['Meetings', '21', 35],
  ['Opportunities', '8', 25],
] as const;
const seedCampaigns = [
  ['Industrial Automation USA', 'Active', '3,810', '141', '37', '8', '3.7%'],
  ['Logistics Leaders — Q3', 'Active', '2,460', '92', '21', '4', '3.8%'],
  ['Manufacturing UK', 'Paused', '1,920', '48', '9', '2', '2.5%'],
] as const;
export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] =
    useState<readonly (readonly string[])[]>(seedMetrics);
  const [campaigns, setCampaigns] =
    useState<readonly (readonly string[])[]>(seedCampaigns);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [liveTotals, setLiveTotals] = useState<{
    prospects: number;
    sent: number;
    delivered: number;
    replies: number;
    positiveReplies: number;
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState('Demo data');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<{
    dailyLimit: number | null;
    dailyLimitPer: string | null;
    scheduleSending: boolean | null;
    scheduleTimeZone: string | null;
    delayMinMinutes: number | null;
    delayMinSeconds: number | null;
    days: Array<[string, boolean | null, number | null, number | null]>;
  } | null>(null);
  useEffect(() => {
    const campaignId = new URLSearchParams(window.location.search).get(
      'campaign',
    );
    const endpoint = campaignId
      ? `/api/dashboard?campaign=${encodeURIComponent(campaignId)}`
      : '/api/dashboard';
    void fetch(endpoint).then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        metrics: {
          activeCampaigns: number;
          prospects: number;
          sent: number;
          delivered: number;
          replies: number;
          positiveReplies: number;
        };
        campaigns: Array<{
          id: string;
          name: string;
          status: string;
          contacted: number;
          replies: number;
          positiveReplies: number;
          replyRate: number;
        }>;
        lastUpdatedAt: string | null;
        selectedCampaign: {
          id: string;
          name: string;
          status: string;
          settings: {
            dailyLimit: number | null;
            dailyLimitPer: string | null;
            scheduleSending: boolean | null;
            scheduleTimeZone: string | null;
            delayMinMinutes: number | null;
            delayMinSeconds: number | null;
            days: Array<[string, boolean | null, number | null, number | null]>;
          } | null;
        } | null;
      };
      if (!data.lastUpdatedAt) return;
      const format = new Intl.NumberFormat();
      setLiveTotals({
        prospects: data.metrics.prospects,
        sent: data.metrics.sent,
        delivered: data.metrics.delivered,
        replies: data.metrics.replies,
        positiveReplies: data.metrics.positiveReplies,
      });
      setMetrics([
        [
          'Active campaigns',
          format.format(data.metrics.activeCampaigns),
          'Live',
          'current status',
        ],
        [
          'Emails sent',
          format.format(data.metrics.sent),
          'Live',
          'all synchronized campaigns',
        ],
        [
          'Replies',
          format.format(data.metrics.replies),
          'Live',
          'confirmed campaign total',
        ],
        [
          'Positive replies',
          format.format(data.metrics.positiveReplies),
          'Live',
          'interested prospects',
        ],
        ['Meetings booked', '12', 'Manual', 'stored in workspace'],
      ]);
      setCampaigns(
        data.campaigns.map((campaign) => [
          campaign.name,
          campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
          format.format(campaign.contacted),
          format.format(campaign.replies),
          format.format(campaign.positiveReplies),
          '—',
          `${campaign.replyRate.toFixed(1)}%`,
        ]),
      );
      setCampaignIds(data.campaigns.map((campaign) => campaign.id));
      setLastUpdated(
        `Last updated ${new Date(data.lastUpdatedAt).toLocaleString()}`,
      );
      setSelectedCampaign(data.selectedCampaign?.name ?? null);
      setCampaignSettings(data.selectedCampaign?.settings ?? null);
    });
  }, []);
  const liveFunnel = liveTotals
    ? [
        ['Prospects', liveTotals.prospects],
        ['Contacted', liveTotals.sent],
        ['Delivered', liveTotals.delivered],
        ['Replies', liveTotals.replies],
        ['Interested', liveTotals.positiveReplies],
      ]
    : null;
  const snapshot = liveTotals
    ? ([
        ['Sent', liveTotals.sent, 'sent'],
        ['Delivered', liveTotals.delivered, 'delivered'],
        ['Replies', liveTotals.replies, 'replies'],
        ['Positive', liveTotals.positiveReplies, 'positive'],
      ] as const)
    : null;
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#142033]">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>Reliant</strong>
            <span>OUTREACH</span>
          </div>
        </div>
        <button className="workspace" aria-label="Switch workspace">
          <span className="workspace-logo">AA</span>
          <span>
            <b>Acme Automation</b>
            <small>Growth workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav aria-label="Main navigation">
          <p className="nav-label">WORKSPACE</p>
          {nav.map(([Icon, label]) => (
            <a
              href={`/${label.toLowerCase().replace(' ', '-')}`}
              className={label === 'Dashboard' ? 'active' : ''}
              key={label}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Replies' && <em>12</em>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="mailto:support@reliantoutreach.com">
            <CircleHelp size={18} /> Support
          </a>
          <div className="capacity">
            <span>
              <b>Monthly email usage</b>
              <small>32,845 of 50,000</small>
            </span>
            <strong>65.7%</strong>
            <i>
              <u />
            </i>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <section className="app-shell">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Open navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Global search"
              placeholder="Search prospects and campaigns…"
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <button aria-label="Notifications" className="icon-button">
              <Bell size={18} />
              <i />
            </button>
            <span className="divider" />
            <div className="avatar">FM</div>
            <div className="user">
              <b>Farhan Malik</b>
              <small>Client Admin</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </header>
        <div className="content">
          <div className="page-head">
            <div>
              <p>THURSDAY, SEPTEMBER 4</p>
              <h1>Good afternoon, Farhan</h1>
              <span>
                {selectedCampaign
                  ? `Showing live performance for ${selectedCampaign}.`
                  : 'Here’s how your outbound operation is performing.'}
              </span>
              {selectedCampaign && (
                <a className="campaign-filter" href="/dashboard">
                  {selectedCampaign} <b>×</b>
                </a>
              )}
              <small className="data-freshness">{lastUpdated}</small>
            </div>
            <label className="period">
              <CalendarDays size={16} />
              <select aria-label="Dashboard date range">
                <option>Last 30 days</option>
                <option>Today</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
              </select>
            </label>
          </div>
          <section
            className="metric-grid"
            aria-label="Key performance indicators"
          >
            {metrics.map(([label, value, change, note], i) => (
              <article className="metric" key={label}>
                <div className="metric-title">
                  <span>{label}</span>
                  <div className={`metric-icon m${i}`}>
                    <Activity size={17} />
                  </div>
                </div>
                <strong>{value}</strong>
                <p>
                  <b>{change}</b> {note}
                </p>
              </article>
            ))}
          </section>
          {selectedCampaign && campaignSettings && (
            <section
              className="campaign-settings-card"
              aria-label="Campaign sending settings"
            >
              <div>
                <p>CAMPAIGN SETTINGS</p>
                <h2>Sending schedule</h2>
                <span>Current synchronized configuration</span>
              </div>
              <dl>
                <div>
                  <dt>Daily limit</dt>
                  <dd>{campaignSettings.dailyLimit ?? 'Not set'}</dd>
                </div>
                <div>
                  <dt>Limit period</dt>
                  <dd>{campaignSettings.dailyLimitPer || 'Daily'}</dd>
                </div>
                <div>
                  <dt>Timezone</dt>
                  <dd>{campaignSettings.scheduleTimeZone || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Delay between sends</dt>
                  <dd>
                    {campaignSettings.delayMinMinutes ?? 0}m{' '}
                    {campaignSettings.delayMinSeconds ?? 0}s
                  </dd>
                </div>
              </dl>
              <div className="sending-days">
                {campaignSettings.days
                  ?.filter((day) => day[1])
                  .map(([name, , after, before]) => (
                    <span key={name}>
                      <b>{name.slice(0, 3)}</b>
                      {after != null && before != null
                        ? `${after}–${before}`
                        : 'Enabled'}
                    </span>
                  ))}
              </div>
            </section>
          )}
          <section className="active-package" aria-label="Active package">
            <div className="package-identity">
              <span className="package-icon">
                <CreditCard size={20} />
              </span>
              <div>
                <p>ACTIVE PACKAGE</p>
                <h2>Growth Outreach</h2>
                <span>Renews October 4, 2026</span>
              </div>
            </div>
            <div className="package-price">
              <span>Monthly price</span>
              <strong>
                $2,500<small>/month</small>
              </strong>
            </div>
            <div className="package-credits">
              <div>
                <span>Monthly credits</span>
                <b>50,000</b>
              </div>
              <div className="credits-track">
                <i style={{ width: '65.7%' }} />
              </div>
              <p>
                <b>32,845 used</b>
                <span>17,155 remaining</span>
              </p>
            </div>
            <a href="/settings">View package details →</a>
          </section>
          <section className="dashboard-grid">
            <article className="panel activity-panel">
              <div className="panel-head">
                <div>
                  <h2>Outreach activity</h2>
                  <p>Delivery and engagement over time</p>
                </div>
                <button>
                  Daily <ChevronDown size={14} />
                </button>
              </div>
              <div className="legend">
                <span>
                  <i />
                  Sent
                </span>
                <span>
                  <i className="delivered" />
                  Delivered
                </span>
                <span>
                  <i className="replies" />
                  Replies
                </span>
              </div>
              {snapshot ? (
                <div
                  className="snapshot-chart"
                  aria-label="Current campaign totals"
                >
                  {snapshot.map(([label, value, tone]) => {
                    const max = Math.max(liveTotals?.sent ?? 0, 1);
                    return (
                      <div className="snapshot-row" key={label}>
                        <span>{label}</span>
                        <div className="snapshot-track">
                          <i
                            className={tone}
                            style={{
                              width: `${Math.max((value / max) * 100, value ? 2 : 0)}%`,
                            }}
                          />
                        </div>
                        <b>{new Intl.NumberFormat().format(value)}</b>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="chart-wrap">
                  <div className="yaxis">
                    <span>600</span>
                    <span>450</span>
                    <span>300</span>
                    <span>150</span>
                    <span>0</span>
                  </div>
                  <svg
                    viewBox="0 0 800 240"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Outreach volume trend"
                  >
                    <defs>
                      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0"
                          stopColor="#2563eb"
                          stopOpacity=".14"
                        />
                        <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      className="gridline"
                      d="M0 10H800M0 65H800M0 120H800M0 175H800M0 230H800"
                    />
                    <path
                      className="area"
                      d="M0 196L55 175L110 184L165 142L220 155L275 108L330 126L385 96L440 118L495 69L550 88L605 45L660 73L715 31L770 51L800 32L800 230L0 230Z"
                    />
                    <path
                      className="line sent-line"
                      d="M0 196L55 175L110 184L165 142L220 155L275 108L330 126L385 96L440 118L495 69L550 88L605 45L660 73L715 31L770 51L800 32"
                    />
                    <path
                      className="line delivered-line"
                      d="M0 205L55 185L110 193L165 153L220 165L275 119L330 137L385 108L440 129L495 81L550 99L605 58L660 84L715 44L770 64L800 45"
                    />
                    <path
                      className="line replies-line"
                      d="M0 221L55 216L110 219L165 209L220 214L275 201L330 206L385 197L440 204L495 190L550 196L605 184L660 192L715 179L770 187L800 179"
                    />
                  </svg>
                  <div className="xaxis">
                    <span>Aug 6</span>
                    <span>Aug 12</span>
                    <span>Aug 18</span>
                    <span>Aug 24</span>
                    <span>Aug 30</span>
                    <span>Sep 4</span>
                  </div>
                </div>
              )}
            </article>
            <article className="panel funnel-panel">
              <div className="panel-head">
                <div>
                  <h2>Revenue funnel</h2>
                  <p>From prospect to pipeline</p>
                </div>
              </div>
              <div className="funnel">
                {(liveFunnel ?? funnel).map((entry, i) => {
                  const [label, rawValue, seedWidth] = entry;
                  const numericValue =
                    typeof rawValue === 'number'
                      ? rawValue
                      : Number(rawValue.replaceAll(',', ''));
                  const width = liveFunnel
                    ? Math.max(
                        (numericValue /
                          Math.max(liveTotals?.prospects ?? 0, 1)) *
                          100,
                        numericValue ? 4 : 0,
                      )
                    : Number(seedWidth);
                  return (
                    <div className="funnel-row" key={label}>
                      <span>
                        {label}
                        <b>{new Intl.NumberFormat().format(numericValue)}</b>
                      </span>
                      <div
                        style={{ width: `${width}%` }}
                        className={`funnel-bar f${i}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="pipeline">
                <span>
                  <Building2 size={18} />
                  <b>Pipeline generated</b>
                </span>
                <strong>{liveTotals ? 'Not tracked' : '$85,000'}</strong>
              </div>
            </article>
          </section>
          <section className="panel campaigns">
            <div className="panel-head">
              <div>
                <h2>Campaign performance</h2>
                <p>Your active outreach at a glance</p>
              </div>
              <a href="/campaigns">View all campaigns →</a>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Contacted</th>
                    <th>Replies</th>
                    <th>Positive</th>
                    <th>Meetings</th>
                    <th>Reply rate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(([name, status, ...data], rowIndex) => (
                    <tr
                      key={name}
                      className={campaignIds[rowIndex] ? 'clickable-row' : ''}
                      tabIndex={campaignIds[rowIndex] ? 0 : undefined}
                      onClick={() => {
                        if (campaignIds[rowIndex])
                          window.location.href = `/dashboard?campaign=${encodeURIComponent(campaignIds[rowIndex])}`;
                      }}
                      onKeyDown={(event) => {
                        if (
                          campaignIds[rowIndex] &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          window.location.href = `/dashboard?campaign=${encodeURIComponent(campaignIds[rowIndex])}`;
                        }
                      }}
                    >
                      <td>
                        <span className="campaign-name">
                          {name.slice(0, 2)}
                        </span>
                        <b>{name}</b>
                      </td>
                      <td>
                        <span className={`status ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                      {data.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                      <td>
                        <button aria-label={`Open ${name}`}>•••</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
