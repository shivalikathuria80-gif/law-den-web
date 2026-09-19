'use client';

import { useMemo, useState } from 'react';
import { Icon } from '../../components/ui';
import type { Enquiry } from '../../data/types';
import { relativeDate } from '../../lib/format';
import { useStore } from '../../store';

const URGENCY_LABEL = { urgent: 'Urgent', soon: 'Soon', planning: 'Planning' } as const;

export const PortalEnquiries = ({ lawyerId, onToast }: { lawyerId: string; onToast: (m: string) => void }) => {
  const { enquiries, replyToEnquiry, closeEnquiry } = useStore();
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const mine = useMemo(
    () => enquiries.filter((e) => e.lawyerId === lawyerId).sort((a, b) => b.createdOn.localeCompare(a.createdOn)),
    [enquiries, lawyerId],
  );
  const visible = filter === 'open' ? mine.filter((e) => e.status !== 'closed') : mine;
  const open: Enquiry | null = visible.find((e) => e.id === openId) ?? visible[0] ?? null;

  if (mine.length === 0) {
    return (
      <div className="empty" style={{ maxWidth: 620 }}>
        <h3>No enquiries yet</h3>
        <p className="muted small">
          When a visitor uses <strong>Request a consultation</strong> on your profile, the message lands here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="row wrap gap-8" style={{ marginBottom: 14 }}>
        {(['open', 'all'] as const).map((f) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)} data-testid={`portal-enq-${f}`}>
            {f === 'open' ? 'Open' : 'All'}{' '}
            <span className="tiny muted">{f === 'open' ? mine.filter((e) => e.status !== 'closed').length : mine.length}</span>
          </button>
        ))}
      </div>

      <div className="queue-layout">
        <div className="stack gap-8">
          {visible.map((e) => (
            <button
              key={e.id} className="queue-item" aria-current={open?.id === e.id}
              onClick={() => { setOpenId(e.id); setDraft(''); }} data-testid={`portal-enquiry-${e.id}`}
            >
              <div className="stack gap-4">
                <div className="row gap-8">
                  <strong style={{ fontSize: 14 }}>{e.clientName}</strong>
                  <span className={`badge ${e.urgency === 'urgent' ? 'rejected' : 'neutral'}`} style={{ marginLeft: 'auto' }}>
                    {URGENCY_LABEL[e.urgency]}
                  </span>
                </div>
                <span className="tiny muted">{e.matter} · {relativeDate(e.createdOn.slice(0, 10))}</span>
                <span className={`badge ${e.status === 'new' ? 'pending' : e.status === 'replied' ? 'verified' : 'neutral'}`} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  {e.status === 'new' ? 'Needs a reply' : e.status === 'replied' ? 'Replied' : 'Closed'}
                </span>
              </div>
            </button>
          ))}
          {visible.length === 0 && <div className="empty"><h3>Nothing open</h3></div>}
        </div>

        {open ? (
          <div className="panel" data-testid="portal-thread">
            <div className="row wrap gap-10" style={{ marginBottom: 12 }}>
              <div className="stack gap-4">
                <h2 className="display" style={{ fontSize: 20 }}>{open.clientName}</h2>
                <span className="tiny muted">{open.clientEmail} · {open.matter} · ref {open.id}</span>
              </div>
              <span className={`badge ${open.status === 'new' ? 'pending' : open.status === 'replied' ? 'verified' : 'neutral'}`} style={{ marginLeft: 'auto' }}>
                {open.status === 'new' ? 'Needs a reply' : open.status === 'replied' ? 'Replied' : 'Closed'}
              </span>
            </div>

            <div className="stack gap-10">
              {open.messages.map((m, i) => (
                <div
                  key={i} className="card"
                  style={{ padding: 14, background: m.from === 'lawyer' ? 'var(--surface-2)' : 'var(--surface)', borderLeft: m.from === 'lawyer' ? '2px solid var(--gold)' : undefined }}
                >
                  <div className="row gap-8" style={{ marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{m.from === 'lawyer' ? 'You' : open.clientName}</strong>
                    <span className="tiny muted" style={{ marginLeft: 'auto' }}>{m.at.replace('T', ' ')}</span>
                  </div>
                  <p className="small" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                </div>
              ))}
            </div>

            {open.status !== 'closed' ? (
              <>
                <div className="field" style={{ marginTop: 16 }}>
                  <label htmlFor="lawyer-reply">Your reply</label>
                  <textarea
                    id="lawyer-reply" value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="portal-reply"
                    placeholder="What you can help with, what it will cost, and what you need from them next."
                  />
                </div>
                <div className="row wrap gap-8" style={{ marginTop: 10 }}>
                  <button
                    className="btn" disabled={draft.trim().length < 2} data-testid="portal-reply-send"
                    onClick={() => { replyToEnquiry(open.id, 'lawyer', draft.trim()); setDraft(''); onToast('Reply sent.'); }}
                  >
                    <Icon.send size={15} /> Send reply
                  </button>
                  <button
                    className="btn secondary" data-testid="portal-close-enquiry"
                    onClick={() => { closeEnquiry(open.id); onToast('Enquiry closed.'); }}
                  >
                    Close enquiry
                  </button>
                </div>
                <p className="tiny muted" style={{ marginTop: 12 }}>
                  Quote fees in writing. Law Den takes no commission and is not party to your engagement.
                </p>
              </>
            ) : (
              <div className="callout info" style={{ marginTop: 16 }}>
                <Icon.check size={16} /><span>Closed. The client can still read the thread.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty"><h3>Select an enquiry</h3></div>
        )}
      </div>
    </>
  );
};
