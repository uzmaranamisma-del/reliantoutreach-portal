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
import { useEffect, useState } from 'react';
import CsvImport from '@/components/csv-import';
import AddDomain from '@/components/add-domain';
import DomainImport from '@/components/domain-import';
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
    headers: ['Prospect', 'Company', 'Campaign', 'Classification', 'Received'],
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
    headers: ['Domain', 'Status', 'SPF', 'DKIM', 'DMARC', 'Mailboxes'],
    rows: [
      ['acmegrowth.co', 'Healthy', 'Verified', 'Verified', 'Verified', '5'],
      ['acmeoutbound.com', 'Healthy', 'Verified', 'Verified', 'Verified', '4'],
      [
        'acmepipeline.co',
        'Warning',
        'Verified',
        'Selector needed',
        'Missing',
        '3',
      ],
    ],
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
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainImportOpen, setDomainImportOpen] = useState(false);
  const page = content[section] ?? content.prospects;
  const [displayRows, setDisplayRows] = useState(page.rows);
  useEffect(() => {
    if (section !== 'prospects') return;
    void fetch('/api/prospects').then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        prospects: Array<{
          email: string;
          firstName: string | null;
          lastName: string | null;
          jobTitle: string | null;
          status: string;
        }>;
      };
      if (!data.prospects.length) return;
      setDisplayRows(
        data.prospects.map((prospect) => [
          `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`.trim() ||
            prospect.email,
          '—',
          prospect.jobTitle || '—',
          'Unassigned',
          prospect.status,
          'Saved',
        ]),
      );
    });
  }, [section]);
  useEffect(() => {
    if (section !== 'domains') return;
    void fetch('/api/domains').then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        domains: Array<{
          domain: string;
          status: string;
          spfStatus: string | null;
          dkimStatus: string | null;
          dmarcStatus: string | null;
        }>;
      };
      if (data.domains.length)
        setDisplayRows(
          data.domains.map((item) => [
            item.domain,
            item.status,
            item.spfStatus ?? 'Pending',
            item.dkimStatus ?? 'Selector needed',
            item.dmarcStatus ?? 'Pending',
            '0',
          ]),
        );
    });
  }, [section]);
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#142033]">
      <Aside active={section} open={open} />
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <section className="app-shell">
        <Header open={open} setOpen={setOpen} />
        <div className="content">
          <div className="section-heading">
            <div>
              <p>ACME AUTOMATION</p>
              <h1>{page.title}</h1>
              <span>{page.subtitle}</span>
            </div>
            {page.action && (
              <div className="section-actions">
                {section === 'domains' && (
                  <button
                    className="secondary-action"
                    onClick={() => setDomainImportOpen(true)}
                  >
                    <Upload size={16} /> Import CSV
                  </button>
                )}
                <button
                  className="primary-action"
                  onClick={() => {
                    if (section === 'prospects') setImportOpen(true);
                    if (section === 'domains') setDomainOpen(true);
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
          <div className="toolbar">
            <div className="section-search">
              <Search size={16} />
              <input
                aria-label={`Search ${page.title}`}
                placeholder={`Search ${page.title.toLowerCase()}…`}
              />
            </div>
            <button>
              <Filter size={15} /> Filter
            </button>
            <button>
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
                  {displayRows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{j === 0 ? <b>{cell}</b> : cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Showing {displayRows.length} records</span>
              <div>
                <button disabled>Previous</button>
                <button>Next</button>
              </div>
            </div>
          </section>
        </div>
      </section>
      {section === 'prospects' && (
        <CsvImport
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={(newRows) =>
            setDisplayRows((previous) => [...newRows, ...previous])
          }
        />
      )}
      {section === 'domains' && (
        <>
          <AddDomain
            open={domainOpen}
            onOpenChange={setDomainOpen}
            onAdded={(row) => setDisplayRows((previous) => [row, ...previous])}
          />
          <DomainImport
            open={domainImportOpen}
            onOpenChange={setDomainImportOpen}
            onImported={(rows) =>
              setDisplayRows((previous) => [...rows, ...previous])
            }
          />
        </>
      )}
    </main>
  );
}
function Aside({ active, open }: { active: string; open: boolean }) {
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
          <b>Acme Automation</b>
          <small>Growth workspace</small>
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
function Header({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
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
        <div className="avatar">FM</div>
        <div className="user">
          <b>Farhan Malik</b>
          <small>Client Admin</small>
        </div>
        <ChevronDown size={15} />
      </div>
    </header>
  );
}
