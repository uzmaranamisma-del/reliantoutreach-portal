'use client';

import { Archive, Clock3, Inbox, Mail, RefreshCw, Search, Send, Star, ThumbsDown, ThumbsUp, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Reply = { id: string; subject: string | null; body: string; classification: string | null; providerClassification: string | null; receivedAt: string; prospectEmail: string; firstName: string | null; lastName: string | null; campaignName: string | null };
const filters = [
  { id: 'all', label: 'All replies', icon: Inbox }, { id: 'unclassified', label: 'Unread', icon: Mail },
  { id: 'positive', label: 'Positive', icon: Star }, { id: 'interested', label: 'Interested', icon: ThumbsUp },
  { id: 'not_interested', label: 'Not interested', icon: ThumbsDown }, { id: 'out_of_office', label: 'Out of office', icon: Clock3 },
  { id: 'sent', label: 'Sent', icon: Send }, { id: 'archived', label: 'Archived', icon: Archive },
];
const labels = ['unclassified', 'interested', 'positive', 'needs_information', 'follow_up_later', 'referral', 'not_interested', 'wrong_person', 'out_of_office', 'unsubscribe', 'meeting_booked', 'other'];
const pretty = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusOf = (reply: Reply) => (reply.classification || reply.providerClassification || 'unclassified').toLowerCase();

export default function ReplyCenter() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [campaign, setCampaign] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const synchronizing = useRef(false);

  const loadReplies = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/replies', { cache: 'no-store' });
      if (!response.ok) throw new Error('Replies are temporarily unavailable.');
      const data = (await response.json()) as { replies: Reply[] };
      setReplies(data.replies);
      setSelectedId((current) => data.replies.some((reply) => reply.id === current) ? current : (data.replies[0]?.id ?? ''));
      setUpdatedAt(new Date()); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Replies are temporarily unavailable.'); }
    finally { setLoading(false); }
  }, []);

  async function synchronize() {
    if (synchronizing.current) return;
    synchronizing.current = true;
    setSyncing(true);
    try { const response = await fetch('/api/sync/outreach', { method: 'POST' }); if (response.ok) await loadReplies(true); }
    finally { synchronizing.current = false; setSyncing(false); }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadReplies());
    const last = Number(sessionStorage.getItem('reply-auto-sync') || 0);
    if (Date.now() - last > 120_000) {
      sessionStorage.setItem('reply-auto-sync', String(Date.now()));
      void fetch('/api/sync/outreach', { method: 'POST' }).then((response) => response.ok ? loadReplies(true) : undefined);
    }
    const poll = window.setInterval(() => void loadReplies(true), 30_000);
    return () => window.clearInterval(poll);
  }, [loadReplies]);

  const campaigns = useMemo(() => Array.from(new Set(replies.map((reply) => reply.campaignName).filter(Boolean))) as string[], [replies]);
  const counts = useMemo(() => Object.fromEntries(filters.map(({ id }) => [id, id === 'all' ? replies.length : replies.filter((reply) => statusOf(reply) === id).length])), [replies]);
  const filtered = useMemo(() => replies.filter((reply) => {
    const haystack = `${reply.firstName ?? ''} ${reply.lastName ?? ''} ${reply.prospectEmail} ${reply.campaignName ?? ''} ${reply.subject ?? ''} ${reply.body}`.toLowerCase();
    return (filter === 'all' || statusOf(reply) === filter) && (campaign === 'all' || reply.campaignName === campaign) && haystack.includes(search.toLowerCase());
  }), [replies, search, filter, campaign]);
  const selected = filtered.find((reply) => reply.id === selectedId) ?? filtered[0] ?? null;

  async function classify(classification: string) {
    if (!selected) return;
    const response = await fetch('/api/replies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, classification }) });
    if (response.ok) setReplies((current) => current.map((reply) => reply.id === selected.id ? { ...reply, classification } : reply));
  }

  return <section className="mailbox-shell" aria-label="Reply inbox">
    <aside className="mailbox-folders">
      <div className="mailbox-folder-title"><Inbox size={20} /><b>Inbox</b></div>
      <nav aria-label="Reply filters">{filters.map(({ id, label, icon: Icon }) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}><Icon size={17} /><span>{label}</span>{counts[id] ? <small>{counts[id]}</small> : null}</button>)}</nav>
      <div className="mailbox-campaign-filter"><label htmlFor="reply-campaign">Campaign</label><select id="reply-campaign" value={campaign} onChange={(event) => setCampaign(event.target.value)}><option value="all">All campaigns</option>{campaigns.map((name) => <option key={name}>{name}</option>)}</select></div>
    </aside>
    <section className="mailbox-list-panel">
      <header><div><h2>{filters.find((item) => item.id === filter)?.label}</h2><small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading messages'}</small></div><button className={syncing ? 'spin' : ''} onClick={() => void synchronize()} disabled={syncing} aria-label="Refresh messages"><RefreshCw size={18} /></button></header>
      <label className="mailbox-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mail" /></label>
      <div className="mailbox-list">
        {loading && !replies.length ? Array.from({ length: 6 }).map((_, index) => <div className="mail-skeleton" key={index} />) : null}
        {error ? <div className="reply-empty"><b>{error}</b><span>Saved conversations remain available after the next refresh.</span></div> : null}
        {!loading && !error && !filtered.length ? <div className="reply-empty"><Inbox size={27} /><b>No conversations here</b><span>New synchronized replies will appear automatically.</span></div> : null}
        {filtered.map((reply) => { const name = [reply.firstName, reply.lastName].filter(Boolean).join(' ') || reply.prospectEmail; return <button key={reply.id} className={selected?.id === reply.id ? 'active' : ''} onClick={() => setSelectedId(reply.id)}><div className="mail-avatar">{name.slice(0, 1).toUpperCase()}</div><div className="mail-summary"><div><b>{name}</b><time>{new Date(reply.receivedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time></div><strong>{reply.subject || 'Reply received'}</strong><p>{reply.body}</p><small>{reply.campaignName || 'Campaign'}</small></div></button>; })}
      </div>
    </section>
    <article className="mailbox-thread">{selected ? <>
      <header><div className="mail-avatar large"><UserRound size={20} /></div><div><h2>{[selected.firstName, selected.lastName].filter(Boolean).join(' ') || selected.prospectEmail}</h2><p>{selected.prospectEmail}</p></div><select aria-label="Reply classification" value={statusOf(selected)} onChange={(event) => void classify(event.target.value)}>{labels.map((label) => <option value={label} key={label}>{pretty(label)}</option>)}</select></header>
      <div className="thread-subject"><div><small>{selected.campaignName || 'Campaign'}</small><h1>{selected.subject || 'Reply received'}</h1></div><time>{new Date(selected.receivedAt).toLocaleString()}</time></div>
      <section className="mail-message"><div className="mail-message-head"><b>{selected.prospectEmail}</b><span>to your outreach team</span></div><p>{selected.body}</p></section>
    </> : <div className="thread-welcome"><div><Mail size={38} /></div><small>CONVERSATIONS THAT COUNT</small><h2>Select a conversation</h2><p>Read the complete reply and classify the prospect from one place.</p></div>}</article>
  </section>;
}
