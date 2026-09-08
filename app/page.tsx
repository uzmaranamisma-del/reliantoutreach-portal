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
import ClientPreviewBanner from '@/components/client-preview-banner';
const nav = [
  [Building2, 'Clients'],
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
const emptyMetrics = [
  ['Active campaigns', '0', '—', 'No synchronized data'],
  ['Emails sent', '0', '—', 'No synchronized data'],
  ['Replies', '0', '—', 'No synchronized data'],
  ['Positive replies', '0', '—', 'No synchronized data'],
  ['Meetings booked', '0', '—', 'No meetings recorded'],
] as const;
const funnel = [
  ['Prospects', '0', 100],
  ['Contacted', '0', 82],
  ['Delivered', '0', 73],
  ['Replies', '0', 58],
  ['Interested', '0', 46],
  ['Meetings', '0', 35],
  ['Opportunities', '0', 25],
] as const;
export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState({
    name: 'Workspace member',
    workspaceName: 'Your Workspace',
    role: 'client_viewer',
    isImpersonating: false,
  });
  const [metrics, setMetrics] =
    useState<readonly (readonly string[])[]>(emptyMetrics);
  const [campaigns, setCampaigns] = useState<readonly (readonly string[])[]>(
    [],
  );
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
  const [activePackage, setActivePackage] = useState<{
    name: string;
    monthlyCredits: number;
    monthlyEmailCapacity: number;
    priceCents: number;
    renewalDate: string | null;
    usedCredits: number;
    usedEmails: number;
  } | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<{
    initialEmail: {
      subject: string | null;
      body: string | null;
      textOnly: boolean | null;
      openCount: number;
      clickCount: number;
      replyCount: number;
      bounceCount: number;
      interestedCount: number;
    } | null;
    dailyLimit: number | null;
    dailyLimitPer: string | null;
    scheduleSending: boolean | null;
    scheduleTimeZone: string | null;
    delayMinMinutes: number | null;
    delayMinSeconds: number | null;
    days: Array<[string, boolean | null, number | null, number | null]>;
  } | null>(null);
  const [campaignSequence, setCampaignSequence] = useState<
    Array<{
      id: string;
      stepNumber: number;
      sequenceName: string | null;
      sequenceCondition: string | null;
      waitAmount: number | null;
      waitUnit: string | null;
      subject: string | null;
      body: string | null;
      settings: {
        useOriginalSubject?: boolean;
        sendInSameThread?: boolean;
        sentCount?: number;
        replyCount?: number;
      } | null;
    }>
  >([]);
  const [selectedSequenceStep, setSelectedSequenceStep] = useState(0);
  useEffect(() => {
    void fetch('/api/session').then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) window.location.href = '/login';
        return;
      }
      const data = (await response.json()) as {
        user: { name: string };
        workspace: {
          name: string;
          role: string;
          isImpersonating: boolean;
        };
      };
      setSession({
        name: data.user.name,
        workspaceName: data.workspace.name,
        role: data.workspace.role,
        isImpersonating: data.workspace.isImpersonating,
      });
      if (
        data.workspace.role === 'super_admin' &&
        window.location.pathname === '/'
      ) {
        window.location.replace('/clients');
      }
    });
  }, []);
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
        package: {
          name: string;
          monthlyCredits: number;
          monthlyEmailCapacity: number;
          priceCents: number;
          renewalDate: string | null;
          usedCredits: number;
          usedEmails: number;
        } | null;
        selectedCampaign: {
          id: string;
          name: string;
          status: string;
          settings: {
            initialEmail: {
              subject: string | null;
              body: string | null;
              textOnly: boolean | null;
              openCount: number;
              clickCount: number;
              replyCount: number;
              bounceCount: number;
              interestedCount: number;
            } | null;
            dailyLimit: number | null;
            dailyLimitPer: string | null;
            scheduleSending: boolean | null;
            scheduleTimeZone: string | null;
            delayMinMinutes: number | null;
            delayMinSeconds: number | null;
            days: Array<[string, boolean | null, number | null, number | null]>;
          } | null;
          sequence: Array<{
            id: string;
            stepNumber: number;
            sequenceName: string | null;
            sequenceCondition: string | null;
            waitAmount: number | null;
            waitUnit: string | null;
            subject: string | null;
            body: string | null;
            settings: {
              useOriginalSubject?: boolean;
              sendInSameThread?: boolean;
              sentCount?: number;
              replyCount?: number;
            } | null;
          }>;
        } | null;
      };
      setActivePackage(data.package);
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
        ['Meetings booked', '0', 'Manual', 'stored in workspace'],
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
        data.lastUpdatedAt
          ? `Last updated ${new Date(data.lastUpdatedAt).toLocaleString()}`
          : 'No synchronized data yet',
      );
      setSelectedCampaign(data.selectedCampaign?.name ?? null);
      setCampaignSettings(data.selectedCampaign?.settings ?? null);
      setCampaignSequence(data.selectedCampaign?.sequence ?? []);
      setSelectedSequenceStep(0);
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
  const initialEmail = campaignSettings?.initialEmail;
  const workspaceSteps = selectedCampaign
    ? [
        ...(initialEmail
          ? [
              {
                id: 'initial-email',
                label: 'Initial Email',
                sequence: 'Initial outreach',
                condition: 'All campaign prospects',
                wait: 'Sends first',
                subject: initialEmail.subject || 'No subject',
                body: initialEmail.body || '',
                thread: 'New message',
                sent: null,
                replies: initialEmail.replyCount,
                opens: initialEmail.openCount,
              },
            ]
          : []),
        ...campaignSequence.map((step, index) => ({
          id: step.id,
          label: `Follow-up ${index + 1}`,
          sequence: step.sequenceName || 'Sequence',
          condition: step.sequenceCondition || 'Not replied',
          wait: `Send after ${step.waitAmount ?? 0} ${step.waitUnit || 'days'}`,
          subject: step.settings?.useOriginalSubject
            ? 'Subject from previous email'
            : step.subject || 'No subject',
          body: step.body || '',
          thread: step.settings?.sendInSameThread
            ? 'Same thread'
            : 'New message',
          sent: step.settings?.sentCount ?? 0,
          replies: step.settings?.replyCount ?? 0,
          opens: 0,
        })),
      ]
    : [];
  const activeWorkspaceStep =
    workspaceSteps[selectedSequenceStep] ?? workspaceSteps[0] ?? null;
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
            <b>{session.workspaceName}</b>
            <small>Private client workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav aria-label="Main navigation">
          <p className="nav-label">WORKSPACE</p>
          {nav
            .filter(
              ([, label]) =>
                label !== 'Clients' || session.role === 'super_admin',
            )
            .map(([Icon, label]) => (
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
            <div className="avatar">
              {session.name
                .split(/\s+/)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="user">
              <b>{session.name}</b>
              <small>{session.role.replaceAll('_', ' ')}</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </header>
        <ClientPreviewBanner
          active={session.isImpersonating}
          workspaceName={session.workspaceName}
        />
        <div className="content">
          <div className="page-head">
            <div>
              <p>THURSDAY, SEPTEMBER 4</p>
              <h1>Welcome, {session.name.split(' ')[0]}</h1>
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
          {selectedCampaign && (
            <section
              className="panel campaign-sequence-card"
              aria-label="Campaign sequence"
            >
              <div className="sequence-heading">
                <div>
                  <p>CAMPAIGN WORKSPACE</p>
                  <h2>Steps</h2>
                  <span>
                    Read-only configuration synchronized from outreach
                    infrastructure
                  </span>
                </div>
                <span>{workspaceSteps.length} steps</span>
              </div>
              {activeWorkspaceStep ? (
                <div className="sequence-workspace">
                  <aside className="sequence-rail" aria-label="Campaign steps">
                    {workspaceSteps.map((step, index) => (
                      <button
                        key={step.id}
                        className={
                          index === selectedSequenceStep ? 'active' : ''
                        }
                        onClick={() => setSelectedSequenceStep(index)}
                      >
                        <span>{index + 1}</span>
                        <div>
                          <b>{step.label}</b>
                          <small>{step.subject}</small>
                          <em>{step.wait}</em>
                        </div>
                      </button>
                    ))}
                  </aside>
                  <article className="sequence-preview">
                    <div className="preview-toolbar">
                      <div>
                        <span>{activeWorkspaceStep.sequence}</span>
                        <b>{activeWorkspaceStep.condition}</b>
                      </div>
                      <span className="readonly-badge">Read only</span>
                    </div>
                    <div className="preview-field">
                      <span className="field-label">Subject</span>
                      <div>{activeWorkspaceStep.subject}</div>
                    </div>
                    <div className="preview-field body-field">
                      <span className="field-label">Body</span>
                      <div>
                        {activeWorkspaceStep.body
                          .replace(/<br\s*\/?\s*>/gi, '\n')
                          .replace(/<\/p>/gi, '\n\n')
                          .replace(/<[^>]*>/g, '')
                          .replace(/&nbsp;/g, ' ')
                          .trim() || 'No message body available.'}
                      </div>
                    </div>
                    <footer className="preview-stats">
                      <span>{activeWorkspaceStep.wait}</span>
                      <span>{activeWorkspaceStep.thread}</span>
                      <span>
                        {activeWorkspaceStep.sent == null
                          ? 'Sent total unavailable'
                          : `${new Intl.NumberFormat().format(activeWorkspaceStep.sent)} sent`}
                      </span>
                      <span>
                        {new Intl.NumberFormat().format(
                          activeWorkspaceStep.replies,
                        )}{' '}
                        replies
                      </span>
                    </footer>
                  </article>
                </div>
              ) : (
                <div className="sequence-empty">
                  No synchronized sequence steps yet. Run Sync Now from Settings
                  to import them.
                </div>
              )}
            </section>
          )}
          <section className="active-package" aria-label="Active package">
            <div className="package-identity">
              <span className="package-icon">
                <CreditCard size={20} />
              </span>
              <div>
                <p>ACTIVE PACKAGE</p>
                <h2>{activePackage?.name || 'Package not assigned'}</h2>
                <span>
                  {activePackage?.renewalDate
                    ? `Renews ${new Date(activePackage.renewalDate).toLocaleDateString()}`
                    : 'Renewal date not set'}
                </span>
              </div>
            </div>
            <div className="package-price">
              <span>Monthly price</span>
              <strong>
                {activePackage?.priceCents
                  ? `$${(activePackage.priceCents / 100).toLocaleString()}`
                  : '—'}
                <small>/month</small>
              </strong>
            </div>
            <div className="package-credits">
              <div>
                <span>Monthly credits</span>
                <b>{(activePackage?.monthlyCredits ?? 0).toLocaleString()}</b>
              </div>
              <div className="credits-track">
                <i
                  style={{
                    width: `${activePackage?.monthlyCredits ? Math.min(100, (activePackage.usedCredits / activePackage.monthlyCredits) * 100) : 0}%`,
                  }}
                />
              </div>
              <p>
                <b>{(activePackage?.usedCredits ?? 0).toLocaleString()} used</b>
                <span>
                  {Math.max(
                    0,
                    (activePackage?.monthlyCredits ?? 0) -
                      (activePackage?.usedCredits ?? 0),
                  ).toLocaleString()}{' '}
                  remaining
                </span>
              </p>
            </div>
            <div className="package-credits package-emails">
              <div>
                <span>Monthly emails</span>
                <b>
                  {(activePackage?.monthlyEmailCapacity ?? 0).toLocaleString()}
                </b>
              </div>
              <div className="credits-track">
                <i
                  style={{
                    width: `${activePackage?.monthlyEmailCapacity ? Math.min(100, (activePackage.usedEmails / activePackage.monthlyEmailCapacity) * 100) : 0}%`,
                  }}
                />
              </div>
              <p>
                <b>{(activePackage?.usedEmails ?? 0).toLocaleString()} sent</b>
                <span>
                  {Math.max(
                    0,
                    (activePackage?.monthlyEmailCapacity ?? 0) -
                      (activePackage?.usedEmails ?? 0),
                  ).toLocaleString()}{' '}
                  remaining
                </span>
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
                          window.location.href = `/campaigns/${encodeURIComponent(campaignIds[rowIndex])}`;
                      }}
                      onKeyDown={(event) => {
                        if (
                          campaignIds[rowIndex] &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          window.location.href = `/campaigns/${encodeURIComponent(campaignIds[rowIndex])}`;
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
