'use client';

import { useState } from 'react';
import { Icon, InfoTip, Modal, Stars } from '../../components/ui';
import type { Lawyer, ReviewFlagReason } from '../../data/types';
import { longDate, relativeDate } from '../../lib/format';
import { FLAG_REASONS, useStore } from '../../store';

export const PortalReviews = ({ lawyer, onToast }: { lawyer: Lawyer; onToast: (m: string) => void }) => {
  const { replyToReview, disputeReview } = useStore();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [reason, setReason] = useState<ReviewFlagReason>('not-a-client');
  const [detail, setDetail] = useState('');

  const published = lawyer.reviews.filter((r) => !r.moderation);

  return (
    <>
      <div className="callout info" style={{ marginBottom: 16 }}>
        <Icon.shield size={16} />
        <span>
          You can reply publicly once to any review, and dispute one that breaks the review policy. You cannot delete
          a review, and a reviewer decides every dispute — a low rating on its own is not grounds for removal.
        </span>
      </div>

      <div className="stack gap-12">
        {published.map((r) => (
          <article className="panel" key={r.id} style={{ padding: 16 }} data-testid={`portal-review-${r.id}`}>
            <div className="row wrap gap-8">
              <Stars value={r.rating} />
              <strong style={{ fontSize: 13.5 }}>{r.author}</strong>
              {r.verifiedClient && <span className="badge verified"><Icon.check size={11} /> Verified client</span>}
              <span className="tiny muted" style={{ marginLeft: 'auto' }}>{relativeDate(r.date)} · {r.matter}</span>
            </div>
            <p className="small" style={{ color: 'var(--ink-2)', marginTop: 8 }}>{r.body}</p>

            {r.response && (
              <div className="reply" style={{ marginTop: 12 }}>
                <strong style={{ color: 'var(--ink-2)' }}>Your public reply</strong> · {longDate(r.response.date)}
                <p style={{ marginTop: 4 }}>{r.response.body}</p>
              </div>
            )}

            {r.flag && (
              <div className="callout warn" style={{ marginTop: 12 }}>
                <Icon.alert size={16} />
                <span>Dispute raised {longDate(r.flag.raisedOn)} — waiting on a moderation decision.</span>
              </div>
            )}

            <div className="row wrap gap-8" style={{ marginTop: 12 }}>
              {!r.response && (
                <button className="btn secondary sm" onClick={() => { setReplyTo(r.id); setBody(''); }} data-testid={`portal-reply-to-${r.id}`}>
                  Reply publicly
                </button>
              )}
              {!r.flag && (
                <button className="btn ghost sm" onClick={() => { setDisputeId(r.id); setDetail(''); }} data-testid={`portal-dispute-${r.id}`}>
                  Dispute this review
                </button>
              )}
            </div>
          </article>
        ))}
        {published.length === 0 && (
          <div className="empty"><h3>No reviews yet</h3><p className="muted small">Reviews appear once clients complete a matter.</p></div>
        )}
      </div>

      {replyTo && (
        <Modal title="Reply publicly" onClose={() => setReplyTo(null)}>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Your reply appears under the review on your public profile. Keep client details out of it — the review is
            public and so is your answer.
          </p>
          <div className="field">
            <label htmlFor="review-reply">Your reply</label>
            <textarea id="review-reply" value={body} onChange={(e) => setBody(e.target.value)} data-testid="portal-review-reply" />
          </div>
          <div className="row gap-8" style={{ marginTop: 14 }}>
            <button
              className="btn" disabled={body.trim().length < 5} data-testid="portal-review-reply-send"
              onClick={() => { replyToReview(lawyer.id, replyTo, body.trim()); setReplyTo(null); onToast('Reply published.'); }}
            >
              Publish reply
            </button>
            <button className="btn secondary" onClick={() => setReplyTo(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {disputeId && (
        <Modal title="Dispute this review" onClose={() => setDisputeId(null)}>
          <p className="muted small" style={{ marginBottom: 14 }}>
            The review stays published while a reviewer looks at it. They will keep it unless it breaks one of the
            policy rules below.
          </p>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="dispute-reason">
              Grounds <InfoTip text="Disagreeing with the rating is not grounds. Use your public reply for that." />
            </label>
            <select id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value as ReviewFlagReason)} data-testid="dispute-reason">
              {FLAG_REASONS.map((f) => <option key={f.id} value={f.id}>{f.label} — {f.policy}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dispute-detail">What the reviewer should check</label>
            <textarea id="dispute-detail" value={detail} onChange={(e) => setDetail(e.target.value)} data-testid="dispute-detail" />
          </div>
          <div className="row gap-8" style={{ marginTop: 14 }}>
            <button
              className="btn" disabled={detail.trim().length < 10} data-testid="dispute-send"
              onClick={() => { disputeReview(lawyer.id, disputeId, reason, detail.trim()); setDisputeId(null); onToast('Dispute sent to the review team.'); }}
            >
              Send dispute
            </button>
            <button className="btn secondary" onClick={() => setDisputeId(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
};
