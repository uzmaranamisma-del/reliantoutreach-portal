'use client';
/* oxlint-disable typescript/no-explicit-any */

import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Inbox,
  Mail,
  MousePointer2,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Aside, Header, type SessionSummary } from '@/components/section-view';
import ClientPreviewBanner from '@/components/client-preview-banner';

type Settings = Record<string, any>;
type Data = {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
    lastUpdatedAt: string | null;
    counts: {
      prospects: number;
      sent: number;
      delivered: number;
      replies: number;
      interested: number;
    };
    settings: Settings;
  };
  steps: Array<{
    id: string;
    stepNumber: number;
    sequenceName: string | null;
    sequenceCondition: string | null;
    waitAmount: number | null;
    waitUnit: string | null;
    subject: string | null;
    body: string;
    settings: Settings;
  }>;
  prospects: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: unknown;
    status: string;
    addedAt: string;
    sent: number;
    opens: number;
    responses: number;
  }>;
  replies: Array<{
    id: string;
    subject: string | null;
    body: string;
    classification: string | null;
    providerClassification: string | null;
    receivedAt: string;
    prospect: { email: string; name: string } | null;
  }>;
};

const tabs = [
  ['steps', Mail, 'Steps'],
  ['prospects', Users, 'Prospects'],
  ['settings', Settings2, 'Settings'],
  ['report', BarChart3, 'Report'],
  ['inbox', Inbox, 'Inbox'],
] as const;
const fmt = new Intl.NumberFormat();
const yesNo = (value: unknown) =>
  value === true ? 'Enabled' : value === false ? 'Disabled' : 'Not available';
const time = (minutes: unknown) => {
  if (typeof minutes !== 'number') return '—';
  const hours = Math.floor(minutes / 60) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

export default function CampaignWorkspace({
  campaignId,
}: {
  campaignId: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('steps');
  const [selectedStep, setSelectedStep] = useState('initial');
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [followupForm, setFollowupForm] = useState<null | {
    stepId?: string;
    subject: string;
    body: string;
    waitMin: number;
    waitUnits: 'Minutes' | 'Hours' | 'Days';
    useOriginalSubject: boolean;
    sendInSameThread: boolean;
  }>(null);
  const [session, setSession] = useState<SessionSummary>({
    name: 'Workspace member',
    email: '',
    workspaceName: 'Your Workspace',
    role: 'client_viewer',
    isImpersonating: false,
  });
  const [draft, setDraft] = useState({
    name: '',
    subject: '',
    body: '',
    dailyLimit: 1,
    scheduleTimeZone: '',
    trackOpens: false,
    trackClicks: false,
    scheduleSending: false,
    textOnlyEmails: false,
    sendUnsubscribeListHeader: false,
    stopCoworkersOnReply: false,
    useProspectsTimeZone: false,
    days: [] as Array<[string, boolean, number, number]>,
  });
  useEffect(() => {
    fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Campaign data is temporarily unavailable.');
        const next = (await response.json()) as Data;
        setData(next);
        setDraft({
          name: next.campaign.name,
          subject: next.campaign.settings?.initialEmail?.subject || '',
          body: next.campaign.settings?.initialEmail?.body || '',
          dailyLimit: next.campaign.settings?.dailyLimit || 1,
          scheduleTimeZone: next.campaign.settings?.scheduleTimeZone || '',
          trackOpens: Boolean(next.campaign.settings?.tracking?.opens),
          trackClicks: Boolean(next.campaign.settings?.tracking?.clicks),
          scheduleSending: Boolean(next.campaign.settings?.scheduleSending),
          textOnlyEmails: Boolean(next.campaign.settings?.tracking?.textOnly),
          sendUnsubscribeListHeader: Boolean(
            next.campaign.settings?.advanced?.unsubscribeHeader,
          ),
          stopCoworkersOnReply: Boolean(
            next.campaign.settings?.advanced?.stopCoworkersOnReply,
          ),
          useProspectsTimeZone: Boolean(
            next.campaign.settings?.advanced?.useProspectTimezone,
          ),
          days: next.campaign.settings?.days ?? [],
        });
      })
      .catch((reason: Error) => setError(reason.message));
  }, [campaignId]);
  useEffect(() => {
    void fetch('/api/session').then(async (response) => {
      if (!response.ok) return;
      const value = (await response.json()) as {
        user: { name: string; email: string };
        workspace: {
          name: string;
          role: string;
          isImpersonating: boolean;
        };
      };
      setSession({
        name: value.user.name,
        email: value.user.email,
        workspaceName: value.workspace.name,
        role: value.workspace.role,
        isImpersonating: value.workspace.isImpersonating,
      });
    });
  }, []);
  const save = async () => {
    setSaving(true);
    setSaveMessage('');
    const response = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          days: undefined,
          ...Object.fromEntries(
            draft.days.flatMap(([name, enabled, after, before]) => {
              const key = name.slice(0, 3);
              return [
                [`send${key}`, enabled],
                [`send${key}After`, after],
                [`send${key}Before`, before],
              ];
            }),
          ),
        }),
      },
    );
    const result = (await response.json()) as {
      saved?: boolean;
      error?: string;
    };
    if (response.ok) {
      setData((current) =>
        current
          ? {
              ...current,
              campaign: {
                ...current.campaign,
                name: draft.name,
                settings: {
                  ...current.campaign.settings,
                  dailyLimit: draft.dailyLimit,
                  scheduleTimeZone: draft.scheduleTimeZone,
                  initialEmail: {
                    ...current.campaign.settings.initialEmail,
                    subject: draft.subject,
                    body: draft.body,
                  },
                  tracking: {
                    ...current.campaign.settings.tracking,
                    opens: draft.trackOpens,
                    clicks: draft.trackClicks,
                    textOnly: draft.textOnlyEmails,
                  },
                  scheduleSending: draft.scheduleSending,
                  days: draft.days,
                  advanced: {
                    ...current.campaign.settings.advanced,
                    unsubscribeHeader: draft.sendUnsubscribeListHeader,
                    stopCoworkersOnReply: draft.stopCoworkersOnReply,
                    useProspectTimezone: draft.useProspectsTimeZone,
                  },
                },
              },
            }
          : current,
      );
      setEditing(false);
      setSaveMessage('Changes saved');
    } else setSaveMessage(result.error || 'Changes could not be saved.');
    setSaving(false);
  };
  const saveFollowup = async (action: 'create' | 'update' | 'delete') => {
    if (!followupForm) return;
    setSaving(true);
    setSaveMessage('');
    const response = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}/followups`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...followupForm, action }),
      },
    );
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSaveMessage(result.error || 'Follow-up could not be saved.');
      setSaving(false);
      return;
    }
    setSaveMessage(
      action === 'delete'
        ? 'Follow-up deleted. Synchronizing…'
        : 'Follow-up saved. Synchronizing…',
    );
    await fetch('/api/sync/outreach', { method: 'POST' }).catch(() => null);
    window.location.reload();
  };
  const pageProspects = useMemo(
    () => data?.prospects.slice((page - 1) * 100, page * 100) ?? [],
    [data, page],
  );
  if (error)
    return (
      <div className="campaign-state">
        <b>{error}</b>
        <a href="/campaigns">Back to campaigns</a>
      </div>
    );
  if (!data)
    return <div className="campaign-state">Loading campaign workspace…</div>;
  const { campaign } = data;
  const settings = campaign.settings ?? {};
  const totals = settings.totals ?? {};
  const report = settings.report ?? {};
  const selected =
    selectedStep === 'initial'
      ? {
          subject: settings.initialEmail?.subject,
          body: settings.initialEmail?.body,
          label: 'Initial email',
          wait: null,
        }
      : (() => {
          const step = data.steps.find((item) => item.id === selectedStep);
          return {
            subject: step?.subject || 'Subject from previous email',
            body: step?.body,
            label: `Follow-up ${step?.stepNumber ?? ''}`,
            wait: step
              ? `${step.waitAmount ?? 0} ${step.waitUnit ?? 'days'}`
              : null,
          };
        })();
  const series = (value: unknown): number[] =>
    Array.isArray(value)
      ? value
      : value &&
          typeof value === 'object' &&
          'data' in value &&
          Array.isArray(value.data)
        ? value.data
        : [];

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#142033]">
      <Aside active="campaigns" open={menuOpen} session={session} />
      {menuOpen && (
        <button
          className="scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
      <section className="app-shell">
        <Header open={menuOpen} setOpen={setMenuOpen} session={session} />
        <ClientPreviewBanner
          active={session.isImpersonating}
          workspaceName={session.workspaceName}
        />
        <div className="campaign-workspace">
          <header className="campaign-workspace-head">
            <a href="/campaigns" aria-label="Back to campaigns">
              <ArrowLeft size={18} />
            </a>
            <div>
              <p>CAMPAIGN</p>
              <h1>{campaign.name}</h1>
            </div>
            <span className={`campaign-status ${campaign.status}`}>
              {campaign.status}
            </span>
            <small>
              {campaign.lastUpdatedAt
                ? `Updated ${new Date(campaign.lastUpdatedAt).toLocaleString()}`
                : 'Waiting for first sync'}
            </small>
          </header>
          <nav className="campaign-tabs" aria-label="Campaign sections">
            {tabs.map(([id, Icon, label]) => (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                <Icon size={16} />
                {label}
                {id === 'prospects'
                  ? ` (${fmt.format(campaign.counts.prospects)})`
                  : id === 'inbox'
                    ? ` (${campaign.counts.replies})`
                    : ''}
              </button>
            ))}
          </nav>

          {tab === 'steps' && (
            <section className="campaign-steps-view">
              <aside className="step-rail">
                <button
                  className={selectedStep === 'initial' ? 'active' : ''}
                  onClick={() => setSelectedStep('initial')}
                >
                  <Mail size={17} />
                  <span>
                    <b>Initial email</b>
                    <small>
                      {settings.initialEmail?.subject || 'No subject available'}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
                {data.steps.map((step) => (
                  <button
                    key={step.id}
                    className={selectedStep === step.id ? 'active' : ''}
                    onClick={() => setSelectedStep(step.id)}
                  >
                    <Mail size={17} />
                    <span>
                      <b>Follow-up {step.stepNumber}</b>
                      <small>
                        <Clock3 size={12} /> After {step.waitAmount ?? 0}{' '}
                        {step.waitUnit ?? 'days'}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </aside>
              <article className="email-preview">
                <div className="read-only-note">
                  <Check size={15} /> Synchronized campaign content
                </div>
                {selectedStep !== 'initial' &&
                  session.role !== 'client_viewer' && (
                    <button
                      className="secondary-action step-edit-action"
                      onClick={() => {
                        const step = data.steps.find(
                          (item) => item.id === selectedStep,
                        );
                        if (!step) return;
                        setFollowupForm({
                          stepId: step.id,
                          subject: step.subject || '',
                          body: step.body || '',
                          waitMin: step.waitAmount || 1,
                          waitUnits: (step.waitUnit &&
                          ['minutes', 'hours', 'days'].includes(
                            step.waitUnit.toLowerCase(),
                          )
                            ? `${step.waitUnit[0].toUpperCase()}${step.waitUnit.slice(1).toLowerCase()}`
                            : 'Days') as 'Minutes' | 'Hours' | 'Days',
                          useOriginalSubject: Boolean(
                            step.settings?.useOriginalSubject,
                          ),
                          sendInSameThread: Boolean(
                            step.settings?.sendInSameThread,
                          ),
                        });
                      }}
                    >
                      <Pencil size={15} /> Edit follow-up
                    </button>
                  )}
                <p className="eyebrow">
                  {selected.label}
                  {selected.wait ? ` · Sends after ${selected.wait}` : ''}
                </p>
                <p className="field-label">Subject</p>
                <div className="subject-box">
                  {selected.subject || 'Subject not available'}
                </div>
                <p className="field-label">Email body</p>
                <div className="body-box">
                  {selected.body ||
                    'Email content is not available from the current connection.'}
                </div>
                {session.role !== 'client_viewer' && (
                  <button
                    className="primary-action add-followup-action"
                    onClick={() =>
                      setFollowupForm({
                        subject: '',
                        body: '',
                        waitMin: 3,
                        waitUnits: 'Days',
                        useOriginalSubject: true,
                        sendInSameThread: true,
                      })
                    }
                  >
                    <Plus size={16} /> Add follow-up
                  </button>
                )}
              </article>
            </section>
          )}

          {tab === 'prospects' && (
            <section className="campaign-panel">
              <div className="campaign-panel-title">
                <div>
                  <h2>Campaign prospects</h2>
                  <p>Contacts linked through synchronized campaign activity.</p>
                </div>
                <strong>{fmt.format(data.prospects.length)} loaded</strong>
              </div>
              <div className="table-scroll">
                <table className="campaign-data-table">
                  <thead>
                    <tr>
                      <th>Prospect</th>
                      <th>Company</th>
                      <th>Added</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Opens</th>
                      <th>Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageProspects.map((prospect) => (
                      <tr key={prospect.id}>
                        <td>
                          <b>
                            {[prospect.firstName, prospect.lastName]
                              .filter(Boolean)
                              .join(' ') || prospect.email}
                          </b>
                          <small>{prospect.email}</small>
                        </td>
                        <td>
                          {typeof prospect.company === 'string'
                            ? prospect.company
                            : '—'}
                        </td>
                        <td>
                          {new Date(prospect.addedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="soft-badge">
                            {prospect.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td>{prospect.sent}</td>
                        <td>{prospect.opens}</td>
                        <td>{prospect.responses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.prospects.length && (
                <div className="campaign-empty">
                  Prospect activity will appear after the next data sync.
                </div>
              )}
              <div className="campaign-pagination">
                <span>Page {page} · up to 100 records</span>
                <div>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page * 100 >= data.prospects.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === 'settings' && (
            <section className="settings-layout">
              <div className="settings-stack">
                <div className="setting-card campaign-editor">
                  <div className="editor-head">
                    <h3>Edit campaign</h3>
                    <button
                      className="primary-action"
                      onClick={() => (editing ? void save() : setEditing(true))}
                      disabled={saving}
                    >
                      {editing
                        ? saving
                          ? 'Saving…'
                          : 'Save changes'
                        : 'Edit settings'}
                    </button>
                  </div>
                  {saveMessage && <p className="save-message">{saveMessage}</p>}
                  <label>
                    Campaign name
                    <input
                      disabled={!editing}
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Initial subject
                    <input
                      disabled={!editing}
                      value={draft.subject}
                      onChange={(event) =>
                        setDraft({ ...draft, subject: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Initial email
                    <textarea
                      disabled={!editing}
                      value={draft.body}
                      onChange={(event) =>
                        setDraft({ ...draft, body: event.target.value })
                      }
                    />
                  </label>
                  <div className="editor-grid">
                    <label>
                      Daily limit
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        disabled={!editing}
                        value={draft.dailyLimit}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            dailyLimit: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Timezone
                      <input
                        disabled={!editing}
                        value={draft.scheduleTimeZone}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            scheduleTimeZone: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="editor-checks">
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.trackOpens}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            trackOpens: event.target.checked,
                          })
                        }
                      />{' '}
                      Track opens
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.trackClicks}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            trackClicks: event.target.checked,
                          })
                        }
                      />{' '}
                      Track clicks
                    </label>
                  </div>
                  <div className="editor-checks">
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.scheduleSending}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            scheduleSending: event.target.checked,
                          })
                        }
                      />{' '}
                      Sending schedule enabled
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.textOnlyEmails}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            textOnlyEmails: event.target.checked,
                          })
                        }
                      />{' '}
                      Send as text-only
                    </label>
                  </div>
                  <div className="campaign-schedule-editor">
                    {draft.days.map((day, index) => (
                      <div key={day[0]} className={day[1] ? 'enabled' : ''}>
                        <label>
                          <input
                            type="checkbox"
                            disabled={!editing || !draft.scheduleSending}
                            checked={day[1]}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                days: draft.days.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? [
                                        item[0],
                                        event.target.checked,
                                        item[2],
                                        item[3],
                                      ]
                                    : item,
                                ),
                              })
                            }
                          />{' '}
                          {day[0]}
                        </label>
                        <input
                          aria-label={`${day[0]} start time`}
                          type="time"
                          disabled={
                            !editing || !draft.scheduleSending || !day[1]
                          }
                          value={time(day[2])}
                          onChange={(event) => {
                            const [hours, minutes] = event.target.value
                              .split(':')
                              .map(Number);
                            setDraft({
                              ...draft,
                              days: draft.days.map((item, itemIndex) =>
                                itemIndex === index
                                  ? [
                                      item[0],
                                      item[1],
                                      hours * 60 + minutes,
                                      item[3],
                                    ]
                                  : item,
                              ),
                            });
                          }}
                        />
                        <span>to</span>
                        <input
                          aria-label={`${day[0]} end time`}
                          type="time"
                          disabled={
                            !editing || !draft.scheduleSending || !day[1]
                          }
                          value={time(day[3])}
                          onChange={(event) => {
                            const [hours, minutes] = event.target.value
                              .split(':')
                              .map(Number);
                            setDraft({
                              ...draft,
                              days: draft.days.map((item, itemIndex) =>
                                itemIndex === index
                                  ? [
                                      item[0],
                                      item[1],
                                      item[2],
                                      hours * 60 + minutes,
                                    ]
                                  : item,
                              ),
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="editor-checks campaign-advanced-checks">
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.sendUnsubscribeListHeader}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            sendUnsubscribeListHeader: event.target.checked,
                          })
                        }
                      />{' '}
                      Unsubscribe header
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.stopCoworkersOnReply}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            stopCoworkersOnReply: event.target.checked,
                          })
                        }
                      />{' '}
                      Stop related contacts on reply
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!editing}
                        checked={draft.useProspectsTimeZone}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            useProspectsTimeZone: event.target.checked,
                          })
                        }
                      />{' '}
                      Use prospect timezone
                    </label>
                  </div>
                </div>
                <SettingCard
                  title="Campaign settings"
                  rows={[
                    ['Created', new Date(campaign.createdAt).toLocaleString()],
                    [
                      'Prospect value',
                      settings.campaign?.prospectValue != null
                        ? `$${fmt.format(settings.campaign.prospectValue)}`
                        : 'Not set',
                    ],
                    ['Tags', settings.campaign?.tags?.join(', ') || 'None'],
                  ]}
                />
                <SettingCard
                  title="Sending accounts"
                  rows={[
                    [
                      'Assigned accounts',
                      settings.senders?.emails?.length
                        ? `${settings.senders.emails.length} accounts`
                        : 'Not available',
                    ],
                    ['From name', settings.senders?.fromName || 'Not set'],
                    [
                      'Reply-to',
                      settings.senders?.replyToEmail ||
                        'Same as sending account',
                    ],
                  ]}
                  pills={settings.senders?.emails ?? []}
                />
                <SettingCard
                  title="Sending limits"
                  rows={[
                    [
                      'Daily maximum',
                      settings.dailyLimit != null
                        ? `${settings.dailyLimit} emails per ${settings.dailyLimitPer || 'day'}`
                        : 'Not set',
                    ],
                    ['Gradual increase', yesNo(settings.dailyLimitIncrease)],
                    [
                      'Increase target',
                      settings.dailyLimitIncreaseToMax ?? 'Not set',
                    ],
                    ['Priority', settings.dailyLimitPrioritize || 'Default'],
                  ]}
                />
                <div className="setting-card">
                  <h3>Sending schedule</h3>
                  <div className="setting-row">
                    <span>Schedule</span>
                    <b>{yesNo(settings.scheduleSending)}</b>
                  </div>
                  <div className="setting-row">
                    <span>Timezone</span>
                    <b>{settings.scheduleTimeZone || 'Not set'}</b>
                  </div>
                  <div className="schedule-grid">
                    {(settings.days ?? []).map(
                      (day: [string, boolean, number, number]) => (
                        <div key={day[0]} className={day[1] ? 'enabled' : ''}>
                          <span>{day[0].slice(0, 3)}</span>
                          <b>
                            {day[1]
                              ? `${time(day[2])} – ${time(day[3])}`
                              : 'Off'}
                          </b>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <SettingCard
                  title="Email tracking"
                  rows={[
                    ['Track opens', yesNo(settings.tracking?.opens)],
                    ['Track clicks', yesNo(settings.tracking?.clicks)],
                    ['Text-only delivery', yesNo(settings.tracking?.textOnly)],
                  ]}
                />
                <SettingCard
                  title="Advanced options"
                  rows={[
                    [
                      'Unsubscribe header',
                      yesNo(settings.advanced?.unsubscribeHeader),
                    ],
                    [
                      'Stop related contacts on reply',
                      yesNo(settings.advanced?.stopCoworkersOnReply),
                    ],
                    [
                      'Use prospect timezone',
                      yesNo(settings.advanced?.useProspectTimezone),
                    ],
                    [
                      'Recipient provider matching',
                      yesNo(settings.advanced?.espMatchEnabled),
                    ],
                  ]}
                />
              </div>
              <aside className="settings-summary">
                <h3>Sending summary</h3>
                <div>
                  <span>Daily target</span>
                  <b>{settings.dailyLimit ?? '—'}</b>
                </div>
                <div>
                  <span>Assigned accounts</span>
                  <b>{settings.senders?.emails?.length ?? '—'}</b>
                </div>
                <div>
                  <span>Active days</span>
                  <b>
                    {settings.days?.filter((day: unknown[]) => day[1]).length ??
                      '—'}
                  </b>
                </div>
                <p>
                  These values are synchronized from the connected outreach
                  infrastructure. Changes are managed by your ReliantOutreach
                  team.
                </p>
              </aside>
            </section>
          )}

          {tab === 'report' && (
            <section className="campaign-report">
              <div className="report-metrics">
                <Metric
                  icon={<Users />}
                  label="Prospects"
                  value={campaign.counts.prospects}
                />
                <Metric
                  icon={<Send />}
                  label="Sent"
                  value={campaign.counts.sent}
                />
                <Metric
                  icon={<Check />}
                  label="Reached"
                  value={campaign.counts.delivered}
                />
                <Metric
                  icon={<Mail />}
                  label="Opened"
                  value={totals.opens ?? 0}
                />
                <Metric
                  icon={<MousePointer2 />}
                  label="Clicked"
                  value={totals.clicks ?? 0}
                />
                <Metric
                  icon={<Inbox />}
                  label="Replied"
                  value={campaign.counts.replies}
                />
                <Metric
                  icon={<Check />}
                  label="Interested"
                  value={campaign.counts.interested}
                />
                <Metric
                  icon={<X />}
                  label="Bounced"
                  value={
                    totals.bounced ??
                    Math.max(
                      0,
                      campaign.counts.sent - campaign.counts.delivered,
                    )
                  }
                />
              </div>
              <div className="report-chart">
                <div>
                  <h2>Campaign reach by date</h2>
                  <p>Actual synchronized sending and engagement activity.</p>
                </div>
                <MiniChart
                  labels={report.timeline ?? []}
                  series={[
                    ['Sent', series(report.sentSeries), '#176d66'],
                    ['Opened', series(report.opensSeries), '#2d8f86'],
                    ['Replied', series(report.replySeries), '#e2932d'],
                  ]}
                />
              </div>
            </section>
          )}

          {tab === 'inbox' && (
            <section className="campaign-inbox">
              <div className="reply-list">
                {data.replies.map((reply) => (
                  <button
                    key={reply.id}
                    className={selectedReply === reply.id ? 'active' : ''}
                    onClick={() => setSelectedReply(reply.id)}
                  >
                    <b>
                      {reply.prospect?.name ||
                        reply.prospect?.email ||
                        'Prospect'}
                    </b>
                    <span>{reply.subject || 'Reply received'}</span>
                    <small>{new Date(reply.receivedAt).toLocaleString()}</small>
                  </button>
                ))}
                {!data.replies.length && (
                  <div className="campaign-empty">
                    No replies synchronized for this campaign yet.
                  </div>
                )}
              </div>
              <article className="reply-preview">
                {(() => {
                  const reply =
                    data.replies.find((item) => item.id === selectedReply) ??
                    data.replies[0];
                  return reply ? (
                    <>
                      <p className="eyebrow">CONVERSATION</p>
                      <h2>{reply.subject || 'Reply received'}</h2>
                      <div className="reply-meta">
                        <b>{reply.prospect?.name || 'Prospect'}</b>
                        <span>{reply.prospect?.email}</span>
                        <span>
                          {new Date(reply.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="body-box">{reply.body}</div>
                      <span className="soft-badge">
                        {(
                          reply.classification ||
                          reply.providerClassification ||
                          'Unclassified'
                        ).replaceAll('_', ' ')}
                      </span>
                    </>
                  ) : (
                    <div className="campaign-empty">
                      Select a reply to view the conversation.
                    </div>
                  );
                })()}
              </article>
            </section>
          )}
          {followupForm && (
            <div className="followup-modal-backdrop">
              <button
                className="followup-modal-dismiss"
                aria-label="Close follow-up editor"
                disabled={saving}
                onClick={() => setFollowupForm(null)}
              />
              <section
                className="followup-modal"
                role="dialog"
                aria-modal="true"
                aria-label={
                  followupForm.stepId ? 'Edit follow-up' : 'Add follow-up'
                }
              >
                <header>
                  <div>
                    <p className="eyebrow">CAMPAIGN SEQUENCE</p>
                    <h2>
                      {followupForm.stepId ? 'Edit follow-up' : 'Add follow-up'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setFollowupForm(null)}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </header>
                <div className="editor-grid">
                  <label>
                    Wait time
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={followupForm.waitMin}
                      onChange={(event) =>
                        setFollowupForm({
                          ...followupForm,
                          waitMin: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Time unit
                    <select
                      value={followupForm.waitUnits}
                      onChange={(event) =>
                        setFollowupForm({
                          ...followupForm,
                          waitUnits: event.target.value as
                            | 'Minutes'
                            | 'Hours'
                            | 'Days',
                        })
                      }
                    >
                      <option>Minutes</option>
                      <option>Hours</option>
                      <option>Days</option>
                    </select>
                  </label>
                </div>
                <label className="followup-check">
                  <input
                    type="checkbox"
                    checked={followupForm.useOriginalSubject}
                    onChange={(event) =>
                      setFollowupForm({
                        ...followupForm,
                        useOriginalSubject: event.target.checked,
                      })
                    }
                  />{' '}
                  Use original campaign subject
                </label>
                {!followupForm.useOriginalSubject && (
                  <label>
                    Subject
                    <input
                      maxLength={1024}
                      value={followupForm.subject}
                      onChange={(event) =>
                        setFollowupForm({
                          ...followupForm,
                          subject: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  Email body
                  <textarea
                    value={followupForm.body}
                    onChange={(event) =>
                      setFollowupForm({
                        ...followupForm,
                        body: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="followup-check">
                  <input
                    type="checkbox"
                    checked={followupForm.sendInSameThread}
                    onChange={(event) =>
                      setFollowupForm({
                        ...followupForm,
                        sendInSameThread: event.target.checked,
                      })
                    }
                  />{' '}
                  Send in the same email thread
                </label>
                {saveMessage && <p className="save-message">{saveMessage}</p>}
                <footer>
                  {followupForm.stepId && (
                    <button
                      className="danger-action"
                      disabled={saving}
                      onClick={() => void saveFollowup('delete')}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                  <button
                    className="secondary-action"
                    disabled={saving}
                    onClick={() => setFollowupForm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-action"
                    disabled={
                      saving ||
                      followupForm.waitMin < 1 ||
                      !followupForm.body.trim()
                    }
                    onClick={() =>
                      void saveFollowup(
                        followupForm.stepId ? 'update' : 'create',
                      )
                    }
                  >
                    {saving ? 'Saving…' : 'Save follow-up'}
                  </button>
                </footer>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SettingCard({
  title,
  rows,
  pills = [],
}: {
  title: string;
  rows: Array<[string, any]>;
  pills?: string[];
}) {
  return (
    <div className="setting-card">
      <h3>{title}</h3>
      {rows.map(([label, value]) => (
        <div className="setting-row" key={label}>
          <span>{label}</span>
          <b>{String(value)}</b>
        </div>
      ))}
      {pills.length > 0 && (
        <div className="sender-pills">
          {pills.map((pill) => (
            <span key={pill}>{pill}</span>
          ))}
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="report-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <b>{fmt.format(value)}</b>
    </div>
  );
}
function MiniChart({
  labels,
  series,
}: {
  labels: string[];
  series: Array<[string, number[], string]>;
}) {
  if (!labels.length || !series.some(([, values]) => values.length))
    return (
      <div className="campaign-empty">
        Time-series reporting will appear after the next successful sync.
      </div>
    );
  const width = 920,
    height = 260,
    pad = 34;
  const max = Math.max(1, ...series.flatMap(([, values]) => values));
  const points = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${pad + index * ((width - pad * 2) / Math.max(1, labels.length - 1))},${height - pad - (value / max) * (height - pad * 2)}`,
      )
      .join(' ');
  return (
    <div className="mini-chart-wrap">
      <div className="chart-legend">
        {series.map(([name, , color]) => (
          <span key={name}>
            <i style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Campaign activity chart"
      >
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={pad}
            x2={width - pad}
            y1={pad + line * 60}
            y2={pad + line * 60}
            stroke="#e4eaee"
          />
        ))}
        {series.map(([name, values, color]) => (
          <polyline
            key={name}
            points={points(values)}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="chart-labels">
        <span>{new Date(labels[0]).toLocaleDateString()}</span>
        <span>{new Date(labels[labels.length - 1]).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
