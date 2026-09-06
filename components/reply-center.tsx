'use client';

import { Inbox, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Reply = {
  id: string;
  subject: string | null;
  body: string;
  classification: string | null;
  providerClassification: string | null;
  receivedAt: string;
  prospectEmail: string;
  firstName: string | null;
  lastName: string | null;
  campaignName: string | null;
};

const labels = [
  'unclassified',
  'interested',
  'positive',
  'needs_information',
  'follow_up_later',
  'referral',
  'not_interested',
  'wrong_person',
  'out_of_office',
  'unsubscribe',
  'meeting_booked',
  'other',
];
const pretty = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ReplyCenter() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/replies')
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Replies are temporarily unavailable.');
        const data = (await response.json()) as { replies: Reply[] };
        setReplies(data.replies);
        setSelectedId(data.replies[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      replies.filter((reply) => {
        const classification =
          reply.classification ||
          reply.providerClassification ||
          'unclassified';
        const matchesFilter =
          filter === 'all' || classification.toLowerCase() === filter;
        const haystack =
          `${reply.firstName ?? ''} ${reply.lastName ?? ''} ${reply.prospectEmail} ${reply.campaignName ?? ''} ${reply.subject ?? ''} ${reply.body}`.toLowerCase();
        return matchesFilter && haystack.includes(search.toLowerCase());
      }),
    [replies, search, filter],
  );
  const selected =
    replies.find((reply) => reply.id === selectedId) ?? filtered[0] ?? null;

  const classify = async (classification: string) => {
    if (!selected) return;
    const response = await fetch('/api/replies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, classification }),
    });
    if (response.ok)
      setReplies((current) =>
        current.map((reply) =>
          reply.id === selected.id ? { ...reply, classification } : reply,
        ),
      );
  };

  if (loading)
    return (
      <section className="reply-center-state">
        Loading synchronized replies…
      </section>
    );
  if (error) return <section className="reply-center-state">{error}</section>;
  return (
    <section className="reply-center">
      <div className="reply-toolbar">
        <label>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search replies…"
          />
        </label>
        <label>
          <SlidersHorizontal size={16} />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All replies</option>
            {labels.map((label) => (
              <option value={label} key={label}>
                {pretty(label)}
              </option>
            ))}
          </select>
        </label>
        <span>{filtered.length} conversations</span>
      </div>
      <div className="reply-center-grid">
        <aside className="reply-conversations">
          {filtered.map((reply) => (
            <button
              key={reply.id}
              className={selected?.id === reply.id ? 'active' : ''}
              onClick={() => setSelectedId(reply.id)}
            >
              <div>
                <b>
                  {[reply.firstName, reply.lastName]
                    .filter(Boolean)
                    .join(' ') || reply.prospectEmail}
                </b>
                <time>{new Date(reply.receivedAt).toLocaleDateString()}</time>
              </div>
              <small>{reply.campaignName || 'Campaign'}</small>
              <strong>{reply.subject || 'Reply received'}</strong>
              <p>{reply.body}</p>
            </button>
          ))}
          {!filtered.length && (
            <div className="reply-empty">
              <Inbox size={28} />
              <b>No replies found</b>
              <span>New synchronized replies will appear here.</span>
            </div>
          )}
        </aside>
        <article className="reply-thread">
          {selected ? (
            <>
              <header>
                <div>
                  <h2>
                    {[selected.firstName, selected.lastName]
                      .filter(Boolean)
                      .join(' ') || selected.prospectEmail}
                  </h2>
                  <p>{selected.prospectEmail}</p>
                </div>
                <select
                  aria-label="Reply classification"
                  value={(
                    selected.classification ||
                    selected.providerClassification ||
                    'unclassified'
                  ).toLowerCase()}
                  onChange={(event) => void classify(event.target.value)}
                >
                  {labels.map((label) => (
                    <option value={label} key={label}>
                      {pretty(label)}
                    </option>
                  ))}
                </select>
              </header>
              <div className="reply-campaign">
                <span>Campaign</span>
                <b>{selected.campaignName || 'Unassigned'}</b>
              </div>
              <section className="reply-message">
                <div>
                  <Inbox size={17} />
                  <h3>{selected.subject || 'Reply received'}</h3>
                  <time>{new Date(selected.receivedAt).toLocaleString()}</time>
                </div>
                <p>{selected.body}</p>
              </section>
            </>
          ) : (
            <div className="reply-empty">
              <Inbox size={30} />
              <b>Select a conversation</b>
              <span>The complete synchronized message will show here.</span>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
