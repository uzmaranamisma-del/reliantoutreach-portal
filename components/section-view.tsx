'use client';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Download,
  FileText,
  Filter,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CsvImport from '@/components/csv-import';
import AddDomain from '@/components/add-domain';
import DomainImport from '@/components/domain-import';
import ReplyCenter from '@/components/reply-center';
import {
  AddEmailAccount,
  ImportEmailAccounts,
} from '@/components/email-account-manager';
import IntegrationSettings from '@/components/integration-settings';
import DomainDashboard from '@/components/domain-dashboard';
const nav = [
  [LayoutDashboard, 'Dashboard', 'dashboard'],
  [Users, 'Prospects', 'prospects'],
  [Target, 'Campaigns', 'campaigns'],
  [Inbox, 'Replies', 'replies'],
  [Mail, 'Email Accounts', 'email-accounts'],
  [Globe2, 'Domains', 'domains'],
  [CalendarDays, 'Meetings', 'meetings'],
  [TrendingUp, 'Analytics', 'analytics'],
  [FileText, 'Files', 'files'],
  [Users, 'Team', 'team'],
  [Settings, 'Settings', 'settings'],
] as const;
const content: Record<
  string,
  {
    title: string;
    subtitle: string;
    action?: string;
    headers: string[];
    rows: string[][];
  }
> = {
  prospects: {
    title: 'Prospects',
    subtitle: 'Manage contacts across your outreach operation.',
    action: 'Import prospects',
    headers: [
      'Prospect',
      'Company',
      'Title',
      'Campaign',
      'Status',
      'Last activity',
    ],
    rows: [
      [
        'Maya Chen',
        'Novatek Systems',
        'VP Operations',
        'Industrial Automation USA',
        'Interested',
        '2 hours ago',
      ],
      [
        'Daniel Brooks',
        'Atlas Robotics',
        'Plant Director',
        'Industrial Automation USA',
        'Contacted',
        'Yesterday',
      ],
      [
        'Sofia Ahmed',
        'Kinetic Labs',
        'Head of Growth',
        'Logistics Leaders — Q3',
        'Meeting booked',
        'Sep 2',
      ],
      [
        'Lucas Martin',
        'ForgeWorks',
        'COO',
        'Manufacturing UK',
        'Follow up',
        'Aug 30',
      ],
    ],
  },
  campaigns: {
    title: 'Campaigns',
    subtitle: 'Monitor campaign progress and engagement.',
    action: 'New campaign',
    headers: ['Campaign', 'Status', 'Prospects', 'Sent', 'Replies', 'Meetings'],
    rows: [
      ['Industrial Automation USA', 'Active', '5,420', '3,810', '141', '8'],
      ['Logistics Leaders — Q3', 'Active', '3,100', '2,460', '92', '4'],
      ['Manufacturing UK', 'Paused', '2,280', '1,920', '48', '2'],
    ],
  },
  replies: {
    title: 'Replies',
    subtitle: 'Review conversations and classify buying intent.',
    headers: [
      'Prospect',
      'Email',
      'Campaign',
      'Message',
      'Classification',
      'Received',
    ],
    rows: [
      [
        'Maya Chen',
        'Novatek Systems',
        'Industrial Automation USA',
        'Interested',
        '12 min ago',
      ],
      [
        'Owen Wilson',
        'Vector Freight',
        'Logistics Leaders — Q3',
        'Needs information',
        '1 hour ago',
      ],
      [
        'Amelia Hart',
        'Northstar MFG',
        'Manufacturing UK',
        'Follow up later',
        'Yesterday',
      ],
    ],
  },
  'email-accounts': {
    title: 'Email Accounts',
    subtitle: 'Monitor sending capacity and account health.',
    action: 'Add email account',
    headers: [
      'Email account',
      'Domain',
      'Status',
      'Daily limit',
      'Sent today',
      'Health',
    ],
    rows: [
      [
        'alex@acmegrowth.co',
        'acmegrowth.co',
        'Connected',
        '35',
        '24',
        'Healthy',
      ],
      [
        'maya@acmeoutbound.com',
        'acmeoutbound.com',
        'Connected',
        '35',
        '29',
        'Healthy',
      ],
      [
        'team@acmepipeline.co',
        'acmepipeline.co',
        'Warming',
        '20',
        '12',
        'Warming',
      ],
    ],
  },
  domains: {
    title: 'Domains',
    subtitle: 'Track DNS configuration and sending readiness.',
    action: 'Add domain',
    headers: [
      'Domain',
      'Status',
      'Sent · 14 days',
      'Sent · 7 days',
      'Sent · 24 hours',
      'Bounced',
      'SPF',
      'DKIM',
      'DMARC',
      'MX',
      'Mailboxes',
    ],
    rows: [],
  },
  meetings: {
    title: 'Meetings',
    subtitle: 'Track booked conversations and outcomes.',
    action: 'Add meeting',
    headers: ['Prospect', 'Company', 'Campaign', 'Date', 'Owner', 'Status'],
    rows: [
      [
        'Maya Chen',
        'Novatek Systems',
        'Industrial Automation USA',
        'Sep 8, 10:00 AM',
        'Farhan Malik',
        'Scheduled',
      ],
      [
        'Sofia Ahmed',
        'Kinetic Labs',
        'Logistics Leaders — Q3',
        'Sep 10, 2:30 PM',
        'Farhan Malik',
        'Qualified',
      ],
    ],
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Understand delivery, engagement, and pipeline trends.',
    headers: [
      'Campaign',
      'Delivery rate',
      'Reply rate',
      'Positive rate',
      'Meetings',
      'Pipeline',
    ],
    rows: [
      ['Industrial Automation USA', '97.4%', '3.7%', '1.0%', '8', '$42,000'],
      ['Logistics Leaders — Q3', '98.1%', '3.8%', '0.9%', '4', '$28,000'],
      ['Manufacturing UK', '96.8%', '2.5%', '0.5%', '2', '$15,000'],
    ],
  },
  files: {
    title: 'Files',
    subtitle: 'Securely manage workspace documents and lists.',
    action: 'Upload file',
    headers: ['File', 'Category', 'Size', 'Uploaded by', 'Uploaded'],
    rows: [
      [
        'US Automation Prospects.csv',
        'Prospect Lists',
        '2.4 MB',
        'Farhan Malik',
        'Sep 3',
      ],
      ['Q3 Campaign Strategy.pdf', 'Strategy', '1.1 MB', 'Sara Khan', 'Aug 29'],
    ],
  },
  team: {
    title: 'Team',
    subtitle: 'Manage workspace members and permissions.',
    action: 'Invite member',
    headers: ['Member', 'Email', 'Role', 'Status', 'Last login'],
    rows: [
      ['Farhan Malik', 'farhan@acme.com', 'Client Admin', 'Active', 'Today'],
      ['Sara Khan', 'sara@acme.com', 'Client Viewer', 'Active', 'Yesterday'],
      ['Omar Ali', 'omar@acme.com', 'Client Viewer', 'Invited', '—'],
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Configure workspace preferences and reporting visibility.',
    headers: ['Setting', 'Value', 'Scope'],
    rows: [
      ['Workspace timezone', 'Asia/Karachi', 'All members'],
      [
        'Client metric visibility',
        'Sends, replies, meetings, pipeline',
        'Dashboard',
      ],
      ['Default prospect owner', 'Farhan Malik', 'New prospects'],
    ],
  },
};
export default function SectionView({ section }: { section: string }) {
  const usesLiveTable = ['campaigns', 'prospects', 'email-accounts'].includes(
    section,
  );
  const [session, setSession] = useState({
    name: 'Workspace member',
    email: '',
    workspaceName: 'Your Workspace',
    role: 'client_viewer',
  });
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainImportOpen, setDomainImportOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailImportOpen, setEmailImportOpen] = useState(false);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [domainRefresh, setDomainRefresh] = useState(0);
  const [prospectPage, setProspectPage] = useState(1);
  const [prospectHasNext, setProspectHasNext] = useState(false);
  const [prospectLoading, setProspectLoading] = useState(false);
  const [prospectRefresh, setProspectRefresh] = useState(0);
  const [dataLoading, setDataLoading] = useState(usesLiveTable);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const page = content[section] ?? content.prospects;
  const [displayRows, setDisplayRows] = useState(
    usesLiveTable ? [] : page.rows,
  );
  useEffect(() => {
    void fetch('/api/session').then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        user: { name: string; email: string };
        workspace: { name: string; role: string };
      };
      setSession({
        name: data.user.name,
        email: data.user.email,
        workspaceName: data.workspace.name,
        role: data.workspace.role,
      });
    });
  }, []);
  useEffect(() => {
    if (section !== 'campaigns') return;
    void fetch('/api/dashboard')
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED');
        const data = (await response.json()) as {
          campaigns: Array<{
            id: string;
            name: string;
            status: string;
            contacted: number;
            sent: number;
            replies: number;
          }>;
        };
        const format = new Intl.NumberFormat();
        setCampaignIds(data.campaigns.map((campaign) => campaign.id));
        setDisplayRows(
          data.campaigns.map((campaign) => [
            campaign.name,
            campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
            format.format(campaign.contacted),
            format.format(campaign.sent),
            format.format(campaign.replies),
            '—',
          ]),
        );
      })
      .catch(() => setDisplayRows([]))
      .finally(() => setDataLoading(false));
  }, [section]);
  useEffect(() => {
    if (section !== 'prospects') return;
    void fetch(`/api/prospects?page=${prospectPage}`)
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          hasNext: boolean;
          prospects: Array<{
            email: string;
            firstName: string | null;
            lastName: string | null;
            jobTitle: string | null;
            status: string;
            company: string | null;
          }>;
        };
        setProspectHasNext(data.hasNext);
        setDisplayRows(
          data.prospects.map((prospect) => [
            `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`.trim() ||
              prospect.email,
            prospect.company || '—',
            prospect.jobTitle || '—',
            'Unassigned',
            prospect.status,
            'Saved',
          ]),
        );
      })
      .catch(() => setDisplayRows([]))
      .finally(() => {
        setProspectLoading(false);
        setDataLoading(false);
      });
  }, [section, prospectPage, prospectRefresh]);
  useEffect(() => {
    if (section !== 'replies') return;
    void fetch('/api/replies').then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        replies: Array<{
          prospectEmail: string;
          firstName: string | null;
          lastName: string | null;
          campaignName: string | null;
          classification: string | null;
          providerClassification: string | null;
          body: string;
          receivedAt: string;
        }>;
      };
      if (!data.replies.length) return;
      setDisplayRows(
        data.replies.map((reply) => {
          const name =
            `${reply.firstName ?? ''} ${reply.lastName ?? ''}`.trim() ||
            reply.prospectEmail;
          const status = (
            reply.classification ||
            reply.providerClassification ||
            'unclassified'
          )
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
          return [
            name,
            reply.prospectEmail,
            reply.campaignName || 'Unassigned',
            reply.body.length > 110
              ? `${reply.body.slice(0, 110)}…`
              : reply.body,
            status,
            new Date(reply.receivedAt).toLocaleString(),
          ];
        }),
      );
    });
  }, [section]);
  useEffect(() => {
    if (section !== 'email-accounts') return;
    void fetch('/api/email-accounts')
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED');
        const data = (await response.json()) as {
          accounts: Array<{
            email: string;
            domain: string;
            status: string;
            dailyLimit: number | null;
            sentToday: number;
            health: string;
          }>;
        };
        setDisplayRows(
          data.accounts.map((account) => [
            account.email,
            account.domain,
            account.status === 'registered' ? 'Registered' : account.status,
            String(account.dailyLimit || 35),
            String(account.sentToday),
            account.health === 'pending' ? 'Pending' : account.health,
          ]),
        );
      })
      .catch(() => setDisplayRows([]))
      .finally(() => setDataLoading(false));
  }, [section]);
  const filterOptions = useMemo(() => {
    const filterColumn = page.headers.findIndex((header) =>
      ['Status', 'Health', 'Role', 'Category', 'Stage'].includes(header),
    );
    if (filterColumn < 0) return [];
    const values = new Set<string>();
    displayRows.forEach((row) => {
      const value = String(row[filterColumn] ?? '').trim();
      if (value && value !== '—') values.add(value);
    });
    return Array.from(values).slice(0, 20);
  }, [displayRows, page.headers]);
  const visibleRows = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return displayRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        const matchesSearch =
          !query ||
          row.some((cell) => String(cell).toLocaleLowerCase().includes(query));
        const matchesFilter =
          statusFilter === 'all' ||
          row.some((cell) => String(cell) === statusFilter);
        return matchesSearch && matchesFilter;
      });
  }, [displayRows, searchTerm, statusFilter]);
  const exportRows = () => {
    const escape = (value: string) =>
      `"${value.replaceAll('"', '""').replaceAll('\r', ' ').replaceAll('\n', ' ')}"`;
    const csv = [
      page.headers.map((header) => escape(header)).join(','),
      ...visibleRows.map(({ row }) =>
        row.map((cell) => escape(String(cell))).join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${section}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#142033]">
      <Aside active={section} open={open} session={session} />
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <section className="app-shell">
        <Header open={open} setOpen={setOpen} session={session} />
        <div className="content">
          <div className="section-heading">
            <div>
              <p>{session.workspaceName.toUpperCase()}</p>
              <h1>{page.title}</h1>
              <span>{page.subtitle}</span>
            </div>
            {page.action && (
              <div className="section-actions">
                {(section === 'domains' || section === 'email-accounts') && (
                  <button
                    className="secondary-action"
                    onClick={() =>
                      section === 'domains'
                        ? setDomainImportOpen(true)
                        : setEmailImportOpen(true)
                    }
                  >
                    <Upload size={16} /> Import CSV
                  </button>
                )}
                <button
                  className="primary-action"
                  onClick={() => {
                    if (section === 'prospects') setImportOpen(true);
                    if (section === 'domains') setDomainOpen(true);
                    if (section === 'email-accounts') setEmailOpen(true);
                  }}
                >
                  {section === 'files' ? (
                    <Upload size={16} />
                  ) : (
                    <Plus size={16} />
                  )}{' '}
                  {page.action}
                </button>
              </div>
            )}
          </div>
          {section === 'settings' ? (
            <IntegrationSettings />
          ) : section === 'domains' ? (
            <DomainDashboard refreshKey={domainRefresh} />
          ) : section === 'replies' ? (
            <ReplyCenter />
          ) : (
            <>
              <div className="toolbar">
                <div className="section-search">
                  <Search size={16} />
                  <input
                    aria-label={`Search ${page.title}`}
                    placeholder={`Search ${page.title.toLowerCase()}…`}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                {filterOptions.length > 0 && (
                  <label className="table-filter">
                    <Filter size={15} />
                    <select
                      aria-label={`Filter ${page.title}`}
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="all">All records</option>
                      {filterOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button onClick={exportRows} disabled={!visibleRows.length}>
                  <Download size={15} /> Export
                </button>
              </div>
              <section className="panel section-table">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {page.headers.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading || prospectLoading ? (
                        <tr>
                          <td colSpan={page.headers.length}>
                            <div className="table-loading" role="status">
                              <span /> Loading current data…
                            </div>
                          </td>
                        </tr>
                      ) : visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={page.headers.length}>
                            <div className="table-empty">
                              {searchTerm || statusFilter !== 'all'
                                ? 'No matching records found.'
                                : `No ${page.title.toLowerCase()} available yet.`}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map(({ row, originalIndex }) => (
                        <tr
                          key={originalIndex}
                          className={
                            section === 'campaigns' ? 'clickable-row' : ''
                          }
                          tabIndex={section === 'campaigns' ? 0 : undefined}
                          onClick={() => {
                            if (
                              section === 'campaigns' &&
                              campaignIds[originalIndex]
                            )
                              window.location.href = `/campaigns/${encodeURIComponent(campaignIds[originalIndex])}`;
                          }}
                          onKeyDown={(event) => {
                            if (
                              section === 'campaigns' &&
                              campaignIds[originalIndex] &&
                              (event.key === 'Enter' || event.key === ' ')
                            ) {
                              event.preventDefault();
                              window.location.href = `/campaigns/${encodeURIComponent(campaignIds[originalIndex])}`;
                            }
                          }}
                        >
                          {row.map((cell, j) => (
                            <td key={j}>{j === 0 ? <b>{cell}</b> : cell}</td>
                          ))}
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    {section === 'prospects'
                      ? `Page ${prospectPage} · showing ${visibleRows.length} of up to 100 records`
                      : `Showing ${visibleRows.length} of ${displayRows.length} records`}
                  </span>
                  <div>
                    <button
                      disabled={
                        section !== 'prospects' ||
                        prospectPage === 1 ||
                        prospectLoading
                      }
                      onClick={() => {
                        setProspectLoading(true);
                        setProspectPage((value) => Math.max(1, value - 1));
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={
                        section !== 'prospects' ||
                        !prospectHasNext ||
                        prospectLoading
                      }
                      onClick={() => {
                        setProspectLoading(true);
                        setProspectPage((value) => value + 1);
                      }}
                    >
                      {prospectLoading ? 'Loading…' : 'Next'}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
      {section === 'prospects' && (
        <CsvImport
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={() => {
            setProspectPage(1);
            setProspectRefresh((value) => value + 1);
          }}
        />
      )}
      {section === 'domains' && (
        <>
          <AddDomain
            open={domainOpen}
            onOpenChange={setDomainOpen}
            onAdded={() => setDomainRefresh((value) => value + 1)}
          />
          <DomainImport
            open={domainImportOpen}
            onOpenChange={setDomainImportOpen}
            onImported={() => setDomainRefresh((value) => value + 1)}
          />
        </>
      )}
      {section === 'email-accounts' && (
        <>
          <AddEmailAccount
            open={emailOpen}
            onOpenChange={setEmailOpen}
            onAdded={(row) => setDisplayRows((previous) => [row, ...previous])}
          />
          <ImportEmailAccounts
            open={emailImportOpen}
            onOpenChange={setEmailImportOpen}
            onImported={(rows) =>
              setDisplayRows((previous) => [...rows, ...previous])
            }
          />
        </>
      )}
    </main>
  );
}
export type SessionSummary = {
  name: string;
  email: string;
  workspaceName: string;
  role: string;
};
export function Aside({
  active,
  open,
  session,
}: {
  active: string;
  open: boolean;
  session: SessionSummary;
}) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <a href="/" className="brand">
        <div className="brand-mark">R</div>
        <div>
          <strong>Reliant</strong>
          <span>OUTREACH</span>
        </div>
      </a>
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
        {nav.map(([Icon, label, path]) => (
          <a
            href={`/${path}`}
            className={path === active ? 'active' : ''}
            key={path}
          >
            <Icon size={18} />
            <span>{label}</span>
            {path === 'replies' && <em>12</em>}
          </a>
        ))}
      </nav>
      <div className="sidebar-foot">
        <a href="mailto:support@reliantoutreach.com">
          <CircleHelp size={18} /> Support
        </a>
      </div>
    </aside>
  );
}
export function Header({
  open,
  setOpen,
  session,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  session: SessionSummary;
}) {
  return (
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
  );
}
