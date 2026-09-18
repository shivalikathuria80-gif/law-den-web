import { useMemo, useState } from 'react';
import { Avatar, Icon, InfoTip, Modal, PromotedBadge, Stars, VerifiedBadge } from '../components/ui';
import type { Review } from '../data/types';
import { inr, longDate, relativeDate, responseTime } from '../lib/format';
import { navigate } from '../lib/router';
import { useStore } from '../store';

const RATING_KEYS = [5, 4, 3, 2, 1] as const;

const ReviewRow = ({ review }: { review: Review }) => (
  <article className="review" data-testid="review">
    <div className="review-head">
      <Stars value={review.rating} />
      <strong style={{ fontSize: 13.5 }}>{review.author}</strong>
      {review.verifiedClient && (
        <span className="badge verified" title="This reviewer's engagement was logged on the platform (sample data).">
          <Icon.check size={11} /> Verified client
        </span>
      )}
      <span className="tiny muted" style={{ marginLeft: 'auto' }}>{relativeDate(review.date)}</span>
    </div>
    <div className="tiny muted" style={{ marginTop: 4 }}>Matter: {review.matter}</div>
    <p className="body">{review.body}</p>
    {review.response && (
      <div className="reply">
        <strong style={{ color: 'var(--ink-2)' }}>Response from the lawyer</strong> · {relativeDate(review.response.date)}
        <p style={{ marginTop: 4 }}>{review.response.body}</p>
      </div>
    )}
    <div className="review-actions">
      <span className="row gap-6"><Icon.thumb size={13} /> {review.helpful} found this helpful</span>
    </div>
  </article>
);

export const LawyerProfile = ({ slug }: { slug: string }) => {
  const { lawyers } = useStore();
  const lawyer = lawyers.find((l) => l.slug === slug);
  const [tab, setTab] = useState<'about' | 'credentials' | 'reviews'>('about');
  const [reviewFilter, setReviewFilter] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  const visibleReviews = useMemo(() => {
    if (!lawyer) return [];
    const sorted = [...lawyer.reviews].sort((a, b) => b.date.localeCompare(a.date));
    return reviewFilter === 0 ? sorted : sorted.filter((r) => Math.floor(r.rating) === reviewFilter);
  }, [lawyer, reviewFilter]);

  if (!lawyer) {
    return (
      <div className="shell" style={{ padding: '80px 0' }}>
        <div className="empty">
          <h3>Profile not found</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>This profile may have been removed from the directory.</p>
          <button className="btn secondary" onClick={() => navigate('/')}>Back to the directory</button>
        </div>
      </div>
    );
  }

  const totalRatings = RATING_KEYS.reduce((n, k) => n + lawyer.ratingBreakdown[k], 0);
  const verifiedShare = lawyer.reviews.length
    ? Math.round((lawyer.reviews.filter((r) => r.verifiedClient).length / lawyer.reviews.length) * 100)
    : 0;

  return (
    <div className="shell" style={{ paddingTop: 22 }}>
      <button className="btn ghost sm" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        <Icon.back size={15} /> All lawyers
      </button>

      <header className="profile-head panel">
        <Avatar name={lawyer.name} tone={lawyer.tone} large />
        <div className="stack gap-8" style={{ minWidth: 0 }}>
          <div className="row wrap gap-8">
            <h1 className="display" style={{ fontSize: 28 }}>{lawyer.name}</h1>
            {lawyer.verified && <VerifiedBadge title={`Credentials checked on ${lawyer.verifiedOn}`} />}
            {lawyer.promoted && <PromotedBadge />}
          </div>
          <p className="muted">{lawyer.headline}</p>

          <div className="meta-row" style={{ marginTop: 2 }}>
            <span className="row gap-4"><Icon.pin size={13} /> {lawyer.city}, {lawyer.state}</span>
            <span className="dot" />
            <span>{lawyer.experienceYears} years in practice</span>
            <span className="dot" />
            <span className="row gap-4"><Icon.clock size={13} /> {responseTime(lawyer.responseTimeHours)}</span>
            <span className="dot" />
            <span>{lawyer.acceptsNewClients ? 'Accepting new clients' : 'Not accepting new clients'}</span>
          </div>

          <div className="row wrap gap-8" style={{ marginTop: 6 }}>
            {lawyer.rating !== null && lawyer.reviewCount > 0 ? (
              <span className="rating-line">
                <Stars value={lawyer.rating} size="lg" />
                <span className="value">{lawyer.rating.toFixed(1)}</span>
                <span className="n">from {lawyer.reviewCount} reviews</span>
              </span>
            ) : (
              <span className="badge neutral">Newly listed — no reviews yet</span>
            )}
          </div>

          <div className="row wrap gap-6" style={{ marginTop: 8 }}>
            {lawyer.practiceAreas.map((a) => <span className="tag" key={a}>{a}</span>)}
          </div>
        </div>
      </header>

      <div className="profile-grid">
        <div>
          <div className="tabs" role="tablist">
            {(['about', 'credentials', 'reviews'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
                {t === 'about' ? 'Overview' : t === 'credentials' ? `Credentials (${lawyer.credentials.length})` : `Reviews (${lawyer.reviewCount})`}
              </button>
            ))}
          </div>

          {tab === 'about' && (
            <>
              <section className="section panel">
                <h2>About</h2>
                <p className="muted" style={{ fontSize: 14.5 }}>{lawyer.about}</p>
                <div className="row wrap gap-8" style={{ marginTop: 14 }}>
                  {lawyer.highlights.map((h) => (
                    <span className="chip static" key={h}><Icon.check size={12} /> {h}</span>
                  ))}
                </div>
              </section>

              <section className="section panel">
                <h2>Practice details</h2>
                <dl className="kv">
                  <dt>Bar council</dt><dd>{lawyer.barCouncil}</dd>
                  <dt>Enrolment number</dt><dd>{lawyer.enrolmentNo}</dd>
                  <dt>Courts &amp; forums</dt><dd>{lawyer.courts.join(' · ')}</dd>
                  <dt>Languages</dt><dd>{lawyer.languages.join(', ')}</dd>
                  <dt>Education</dt><dd>{lawyer.education.join('; ')}</dd>
                  <dt>Listed since</dt><dd>{longDate(lawyer.addedOn)}</dd>
                </dl>
              </section>

              <section className="section panel">
                <h2>Fees</h2>
                <dl className="kv">
                  <dt>First consultation</dt>
                  <dd>{inr(lawyer.fees.consultation)}{lawyer.fees.offersFirstCallFree && ' · first 15-minute call free'}</dd>
                  <dt>Hourly rate</dt><dd>{lawyer.fees.hourly ? inr(lawyer.fees.hourly) : 'Not published'}</dd>
                  <dt>Fixed-fee matters</dt><dd>{lawyer.fees.fixedFrom ? `From ${inr(lawyer.fees.fixedFrom)}` : 'Not offered'}</dd>
                </dl>
                <p className="tiny muted" style={{ marginTop: 12 }}>
                  Fees are published by the lawyer and checked for completeness during review. Court fees, filing costs
                  and taxes are not included.
                </p>
              </section>
            </>
          )}

          {tab === 'credentials' && (
            <section className="section panel">
              <div className="row gap-8" style={{ marginBottom: 4 }}>
                <h2 style={{ margin: 0 }}>Credentials on file</h2>
                <InfoTip text="Documents supplied by the lawyer and checked by a Law Den reviewer. Sample data for this prototype." />
              </div>
              <p className="muted small" style={{ marginBottom: 12 }}>
                {lawyer.verified
                  ? `Checked by ${lawyer.verifiedBy ?? 'the review team'} on ${longDate(lawyer.verifiedOn!)}.`
                  : 'This profile has not completed verification.'}
              </p>
              {lawyer.credentials.map((c) => (
                <div className="cred-item" key={c.id}>
                  <span className={`cred-icon${c.status === 'pending' ? ' pending' : c.status === 'rejected' ? ' rejected' : ''}`}>
                    {c.status === 'verified' ? <Icon.check size={16} /> : c.status === 'rejected' ? <Icon.close size={16} /> : <Icon.doc size={16} />}
                  </span>
                  <div className="stack gap-4" style={{ minWidth: 0 }}>
                    <div className="row wrap gap-8">
                      <strong style={{ fontSize: 14 }}>{c.label}</strong>
                      <span className={`badge ${c.status === 'verified' ? 'verified' : c.status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {c.status === 'verified' ? 'Checked' : c.status === 'rejected' ? 'Not accepted' : 'Awaiting review'}
                      </span>
                    </div>
                    <span className="tiny muted">
                      {c.issuer} · Ref {c.reference} · Issued {longDate(c.issuedOn)}
                      {c.verifiedOn && ` · Checked ${longDate(c.verifiedOn)}`}
                    </span>
                    {c.note && <span className="tiny" style={{ color: 'var(--danger)' }}>{c.note}</span>}
                  </div>
                </div>
              ))}
              <div className="callout info" style={{ marginTop: 16 }}>
                <Icon.shield size={16} />
                <span>
                  Document reference numbers are partially masked. Law Den checks that documents are authentic and
                  current; it does not vouch for the outcome of any matter.
                </span>
              </div>
            </section>
          )}

          {tab === 'reviews' && (
            <section className="section panel">
              <h2>Client reviews</h2>
              {lawyer.reviewCount === 0 ? (
                <div className="empty" style={{ padding: 32 }}>
                  <h3>No reviews yet</h3>
                  <p className="muted small">This profile was published recently. Reviews appear once clients complete a matter.</p>
                </div>
              ) : (
                <>
                  <div className="rating-summary" style={{ marginBottom: 18 }}>
                    <div className="big-rating">
                      <div className="n">{lawyer.rating!.toFixed(1)}</div>
                      <Stars value={lawyer.rating!} size="lg" />
                      <div className="tiny muted" style={{ marginTop: 6 }}>{lawyer.reviewCount} reviews</div>
                    </div>
                    <div className="bars">
                      {RATING_KEYS.map((k) => {
                        const n = lawyer.ratingBreakdown[k];
                        const pct = totalRatings ? Math.round((n / totalRatings) * 100) : 0;
                        return (
                          <div className="bar-row" key={k}>
                            <span>{k} star</span>
                            <span className="bar"><span style={{ width: `${pct}%` }} /></span>
                            <span>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="callout info" style={{ marginBottom: 16 }}>
                    <Icon.alert size={16} />
                    <span>
                      {verifiedShare}% of the reviews shown are from clients whose engagement was logged on the platform.
                      Law Den does not remove negative reviews, and lawyers cannot pay to hide them.
                    </span>
                  </div>

                  <div className="row wrap gap-6" style={{ marginBottom: 6 }}>
                    <span className="tiny muted" style={{ marginRight: 4 }}>Filter:</span>
                    {[0, 5, 4, 3].map((r) => (
                      <button key={r} className="chip" aria-pressed={reviewFilter === r} onClick={() => setReviewFilter(r)} data-testid={`review-filter-${r}`}>
                        {r === 0 ? 'All reviews' : `${r} star`}
                      </button>
                    ))}
                  </div>

                  {visibleReviews.length === 0 ? (
                    <p className="muted small" style={{ padding: '24px 0' }}>No reviews at this rating.</p>
                  ) : (
                    visibleReviews.map((r) => <ReviewRow key={r.id} review={r} />)
                  )}

                  <p className="tiny muted" style={{ marginTop: 14 }}>
                    Showing the {lawyer.reviews.length} most recent reviews of {lawyer.reviewCount}. Ratings shown are the
                    average of all reviews received.
                  </p>
                </>
              )}
            </section>
          )}
        </div>

        <aside className="sticky-card">
          <div className="panel">
            <div className="stack gap-4" style={{ marginBottom: 14 }}>
              <span className="fee-label">First consultation</span>
              <span className="display" style={{ fontSize: 30 }}>{inr(lawyer.fees.consultation)}</span>
              {lawyer.fees.offersFirstCallFree && <span className="badge verified" style={{ alignSelf: 'flex-start' }}>First 15-min call free</span>}
            </div>
            <button className="btn block lg" onClick={() => setContactOpen(true)} data-testid="request-consultation">
              Request a consultation
            </button>
            <button className="btn secondary block" style={{ marginTop: 8 }} onClick={() => setContactOpen(true)}>
              Ask a question
            </button>
            <hr className="divider" style={{ margin: '16px 0' }} />
            <dl className="kv" style={{ gridTemplateColumns: '1fr auto', fontSize: 13 }}>
              <dt>Response time</dt><dd>{lawyer.responseTimeHours <= 24 ? `~${lawyer.responseTimeHours} hours` : '1–2 days'}</dd>
              <dt>Hourly</dt><dd>{lawyer.fees.hourly ? inr(lawyer.fees.hourly) : '—'}</dd>
              <dt>Fixed fee from</dt><dd>{lawyer.fees.fixedFrom ? inr(lawyer.fees.fixedFrom) : '—'}</dd>
              <dt>New clients</dt><dd>{lawyer.acceptsNewClients ? 'Yes' : 'Waitlist'}</dd>
            </dl>
            <p className="tiny muted" style={{ marginTop: 14 }}>
              Law Den does not take a commission on fees and does not process payments in this prototype.
            </p>
          </div>
        </aside>
      </div>

      {contactOpen && (
        <Modal title={`Contact ${lawyer.name}`} onClose={() => setContactOpen(false)}>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Messaging is not enabled in this prototype. In the live product this would open an enquiry form and share
            your contact details with the lawyer only after you confirm.
          </p>
          <div className="callout gold">
            <Icon.alert size={16} />
            <span>No payment is collected here. Fees are agreed directly between you and the lawyer.</span>
          </div>
          <button className="btn block" style={{ marginTop: 16 }} onClick={() => setContactOpen(false)}>Close</button>
        </Modal>
      )}
    </div>
  );
};
