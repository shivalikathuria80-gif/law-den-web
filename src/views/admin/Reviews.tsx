'use client';

import { useMemo, useState } from 'react';
import { Avatar, Icon, InfoTip, Modal, Stars } from '../../components/ui';
import type { Lawyer, Review, ReviewFlagReason } from '../../data/types';
import { longDate, relativeDate } from '../../lib/format';
import { FLAG_REASONS, useStore } from '../../store';

type Filter = 'flagged' | 'removed' | 'all';

interface Row {
  lawyer: Lawyer;
  review: Review;
}

const reasonLabel = (reason: ReviewFlagReason) =>
  FLAG_REASONS.find((r) => r.id === reason)?.label ?? reason;

export const Reviews = ({ onToast }: { onToast: (m: string) => void }) => {
  const { lawyers, moderateReview } = useStore();
  const [filter, setFilter] = useState<Filter>('flagged');
  const [pending, setPending] = useState<null | { row: Row; action: 'remove' | 'keep' | 'restore' }>(null);
  const [reason, setReason] = useState<ReviewFlagReason>('not-a-client');
  const [note, setNote] = useState('');

  const rows = useMemo<Row[]>(
    () => lawyers.flatMap((lawyer) => lawyer.reviews.map((review) => ({ lawyer, review }))),
    [lawyers],
  );

  const counts = {
    flagged: rows.filter((r) => r.review.flag && !r.review.moderation).length,
    removed: rows.filter((r) => r.review.moderation).length,
    all: rows.length,
  };

  const visible = rows
    .filter((r) => (filter === 'flagged' ? r.review.flag && !r.review.moderation : filter === 'removed' ? !!r.review.moderation : true))
    .sort((a, b) => (b.review.flag?.raisedOn ?? b.review.date).localeCompare(a.review.flag?.raisedOn ?? a.review.date));

  const open = (row: Row, action: 'remove' | 'keep' | 'restore') => {
    setPending({ row, action });
    setReason(row.review.flag?.reason ?? row.review.moderation?.reason ?? 'not-a-client');
    setNote('');
  };

  return (
    <>
      <h1 className="display" style={{ fontSize: 26 }}>Review moderation</h1>
      <p className="muted small" style={{ marginTop: 4 }}>
        Lawyers can dispute a review; they cannot remove one. A review comes down only against a policy reason, the
        decision is logged, and the profile keeps a visible note that a review was removed.
      </p>

      <div className="callout gold" style={{ margin: '16px 0' }}>
        <Icon.alert size={16} />
        <span>
          A low rating is not a policy reason. If the complaint is that the review is unfair rather than untrue or
          abusive, keep it published — the lawyer already has a public right of reply on every review.
        </span>
      </div>

      <div className="row wrap gap-8" style={{ marginBottom: 14 }}>
        {(['flagged', 'removed', 'all'] as const).map((f) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)} data-testid={`review-filter-${f}`}>
            {f === 'flagged' ? 'Disputed' : f === 'removed' ? 'Removed' : 'All reviews'}{' '}
            <span className="tiny muted">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="stack gap-10" data-testid="moderation-list">
        {visible.map(({ lawyer, review }) => (
          <article className="panel" key={`${lawyer.id}-${review.id}`} style={{ padding: 16 }}>
            <div className="row wrap gap-10" style={{ marginBottom: 10 }}>
              <Avatar name={lawyer.name} tone={lawyer.tone} />
              <div className="stack gap-4" style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{lawyer.name}</strong>
                <span className="tiny muted">{lawyer.city} · {review.matter}</span>
              </div>
              <span style={{ marginLeft: 'auto' }} className="row gap-8">
                {review.moderation
                  ? <span className="badge rejected">Removed</span>
                  : review.flag
                    ? <span className="badge changes">Disputed</span>
                    : <span className="badge verified">Published</span>}
              </span>
            </div>

            <div className="row wrap gap-8" style={{ marginBottom: 6 }}>
              <Stars value={review.rating} />
              <strong style={{ fontSize: 13 }}>{review.author}</strong>
              {review.verifiedClient && <span className="badge verified"><Icon.check size={11} /> Verified client</span>}
              <span className="tiny muted">{relativeDate(review.date)}</span>
            </div>
            <p className="small" style={{ color: 'var(--ink-2)' }}>{review.body}</p>

            {review.flag && !review.moderation && (
              <div className="callout warn" style={{ marginTop: 12 }}>
                <Icon.alert size={16} />
                <span>
                  <strong>{reasonLabel(review.flag.reason)}</strong> — raised by {review.flag.raisedBy} on{' '}
                  {longDate(review.flag.raisedOn)}.<br />{review.flag.detail}
                </span>
              </div>
            )}

            {review.moderation && (
              <div className="callout info" style={{ marginTop: 12 }}>
                <Icon.shield size={16} />
                <span>
                  Removed {longDate(review.moderation.decidedOn)} by {review.moderation.decidedBy} —{' '}
                  {reasonLabel(review.moderation.reason)}. {review.moderation.note}
                </span>
              </div>
            )}

            <div className="row wrap gap-8" style={{ marginTop: 12 }}>
              {review.moderation ? (
                <button className="btn secondary sm" onClick={() => open({ lawyer, review }, 'restore')} data-testid={`restore-${review.id}`}>
                  Restore review
                </button>
              ) : (
                <>
                  <button className="btn sm" onClick={() => open({ lawyer, review }, 'keep')} data-testid={`keep-${lawyer.slug}-${review.id}`}>
                    <Icon.check size={14} /> Keep published
                  </button>
                  <button className="btn danger sm" onClick={() => open({ lawyer, review }, 'remove')} data-testid={`remove-${lawyer.slug}-${review.id}`}>
                    Remove for policy breach
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <div className="empty"><h3>Nothing here</h3><p className="muted small">No reviews match this filter.</p></div>
        )}
      </div>

      {pending && (
        <Modal
          title={pending.action === 'remove' ? 'Remove this review?' : pending.action === 'restore' ? 'Restore this review?' : 'Keep this review published?'}
          onClose={() => setPending(null)}
        >
          <p className="muted small" style={{ marginBottom: 14 }}>
            {pending.action === 'remove'
              ? 'The review stops appearing on the profile, the rating is unchanged, and the profile shows that a review was removed.'
              : pending.action === 'restore'
                ? 'The review appears on the profile again.'
                : 'The dispute is closed and the review stays exactly as it is. The lawyer keeps their right of reply.'}
          </p>

          {pending.action === 'remove' && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="mod-reason">Policy reason <InfoTip text="Removal requires one of these. Disagreeing with a rating is not a reason." /></label>
              <select id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value as ReviewFlagReason)} data-testid="moderation-reason">
                {FLAG_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.policy}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="mod-note">Reviewer note</label>
            <textarea
              id="mod-note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="moderation-note"
              placeholder="What you checked and what you concluded. Recorded in the activity log."
            />
          </div>

          {!note.trim() && (
            <div className="callout warn" style={{ marginTop: 12 }}>
              <Icon.alert size={16} /><span>A note is required so the decision can be audited.</span>
            </div>
          )}

          <div className="row gap-8" style={{ marginTop: 16 }}>
            <button
              className="btn" disabled={!note.trim()} data-testid="moderation-confirm"
              onClick={() => {
                moderateReview(pending.row.lawyer.id, pending.row.review.id, pending.action, reason, note.trim());
                onToast(
                  pending.action === 'remove' ? 'Review removed and logged.'
                    : pending.action === 'restore' ? 'Review restored.' : 'Dispute closed — review stays published.',
                );
                setPending(null);
              }}
            >
              Confirm
            </button>
            <button className="btn secondary" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
};
