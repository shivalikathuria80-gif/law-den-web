'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '../auth';
import { AppLink as Link } from '../components/AppLink';
import { Avatar, Icon } from '../components/ui';
import type { Enquiry } from '../data/types';
import { relativeDate } from '../lib/format';
import { useStore } from '../store';

const statusBadge = (status: Enquiry['status']) =>
  status === 'new' ? 'pending' : status === 'replied' ? 'verified' : 'neutral';

const statusLabel = (status: Enquiry['status']) =>
  status === 'new' ? 'Waiting for a reply' : status === 'replied' ? 'Replied' : 'Closed';

export const Enquiries = () => {
  const { enquiries, lawyers, replyToEnquiry } = useStore();
  const { account } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Enquiries sent from this browser, plus anything tied to the signed-in account.
  const mine = useMemo(
    () => enquiries.filter((e) => !account || !e.clientUid || e.clientUid === account.uid),
    [enquiries, account],
  );

  const open = mine.find((e) => e.id === openId) ?? null;

  return (
    <div className="shell">
      <div className="page-head">
        <h1 className="display">My enquiries</h1>
        <p>
          Every message you have sent to a lawyer, and their replies. Nothing here is paid for, and Law Den never
          reads the contents.
        </p>
      </div>

      {mine.length === 0 ? (
        <div className="empty" style={{ maxWidth: 620 }}>
          <h3>No enquiries yet</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Find a lawyer whose fees and reviews suit you, then use <strong>Request a consultation</strong> on their
            profile.
          </p>
          <Link className="btn secondary" href="/find">Browse the directory</Link>
        </div>
      ) : (
        <div className="queue-layout">
          <div className="stack gap-8">
            {mine.map((e) => {
              const lawyer = lawyers.find((l) => l.id === e.lawyerId);
              return (
                <button
                  key={e.id} className="queue-item" aria-current={open?.id === e.id}
                  onClick={() => { setOpenId(e.id); setDraft(''); }} data-testid={`enquiry-${e.lawyerSlug}`}
                >
                  <div className="row gap-10">
                    {lawyer && <Avatar name={lawyer.name} tone={lawyer.tone} />}
                    <div className="stack" style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{e.lawyerName}</strong>
                      <span className="tiny muted">{e.matter} · {relativeDate(e.createdOn.slice(0, 10))}</span>
                      <span className={`badge ${statusBadge(e.status)}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                        {statusLabel(e.status)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {open ? (
            <div className="panel" data-testid="enquiry-thread">
              <div className="row wrap gap-10" style={{ marginBottom: 14 }}>
                <div className="stack gap-4">
                  <h2 className="display" style={{ fontSize: 20 }}>{open.lawyerName}</h2>
                  <span className="tiny muted">Reference {open.id} · {open.matter}</span>
                </div>
                <span className={`badge ${statusBadge(open.status)}`} style={{ marginLeft: 'auto' }}>{statusLabel(open.status)}</span>
              </div>

              <div className="stack gap-10">
                {open.messages.map((m, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{
                      padding: 14,
                      background: m.from === 'lawyer' ? 'var(--surface-2)' : 'var(--surface)',
                      borderLeft: m.from === 'lawyer' ? '2px solid var(--gold)' : undefined,
                    }}
                  >
                    <div className="row gap-8" style={{ marginBottom: 6 }}>
                      <strong style={{ fontSize: 13 }}>{m.from === 'lawyer' ? open.lawyerName : 'You'}</strong>
                      <span className="tiny muted" style={{ marginLeft: 'auto' }}>{m.at.replace('T', ' ')}</span>
                    </div>
                    <p className="small" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                  </div>
                ))}
              </div>

              {open.status !== 'closed' ? (
                <div className="field" style={{ marginTop: 16 }}>
                  <label htmlFor="reply">Reply</label>
                  <textarea id="reply" value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="client-reply" />
                  <button
                    className="btn" style={{ marginTop: 10, alignSelf: 'flex-start' }} disabled={draft.trim().length < 2}
                    data-testid="client-reply-send"
                    onClick={() => { replyToEnquiry(open.id, 'client', draft.trim()); setDraft(''); }}
                  >
                    <Icon.send size={15} /> Send
                  </button>
                </div>
              ) : (
                <div className="callout info" style={{ marginTop: 16 }}>
                  <Icon.check size={16} /><span>This enquiry was closed by the lawyer.</span>
                </div>
              )}

              <p className="tiny muted" style={{ marginTop: 14 }}>
                Sending a message does not create a lawyer-client relationship. Agree fees in writing before work
                starts.
              </p>
            </div>
          ) : (
            <div className="empty"><h3>Select an enquiry</h3></div>
          )}
        </div>
      )}
    </div>
  );
};
