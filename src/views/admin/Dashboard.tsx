'use client';

import { useMemo, useState } from 'react';
import { BarList, LineChart, Sparkline, SERIES } from '../../components/charts';
import { Icon } from '../../components/ui';
import { OPS_QUEUE, SAMPLE_USERS, WEEKS } from '../../data/platform';
import { isPromoted } from '../../lib/search';
import { longDate } from '../../lib/format';
import { readKnownUsers } from '../../auth';
import { useStore } from '../../store';

const Kpi = ({
  label, value, delta, trend, tone = 'up',
}: { label: string; value: string; delta?: string; trend?: number[]; tone?: 'up' | 'flat' }) => (
  <div className="card kpi">
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {delta && <div className={`delta ${tone}`}>{tone === 'up' ? '↑' : '·'} {delta}</div>}
    {trend && <Sparkline values={trend} />}
  </div>
);

const RANGES = [
  { id: '4', label: '4 weeks' },
  { id: '8', label: '8 weeks' },
  { id: 'all', label: 'All' },
] as const;

export const Dashboard = ({ onGo }: { onGo: (section: 'queue' | 'users' | 'lawyers' | 'reviews') => void }) => {
  const { lawyers, submissions, audit, enquiries } = useStore();
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('8');

  const weeks = useMemo(() => (range === 'all' ? WEEKS : WEEKS.slice(-Number(range))), [range]);

  const localUsers = useMemo(() => readKnownUsers(), []);
  const totalUsers = SAMPLE_USERS.length + localUsers.length;
  const pending = submissions.filter((s) => s.status === 'pending').length;
  const changesRequested = submissions.filter((s) => s.status === 'changes-requested').length;
  const verified = lawyers.filter((l) => l.verified).length;
  const suspended = lawyers.filter((l) => !l.listed).length;
  const disputedReviews = lawyers.reduce(
    (n, l) => n + l.reviews.filter((r) => r.flag && !r.moderation).length, 0,
  );
  const removedReviews = lawyers.reduce((n, l) => n + l.reviews.filter((r) => r.moderation).length, 0);
  const promoted = lawyers.filter((l) => isPromoted(l)).length;
  const reviews = lawyers.reduce((n, l) => n + l.reviewCount, 0);
  const rated = lawyers.filter((l) => l.rating !== null);
  const avgRating = rated.length ? rated.reduce((n, l) => n + (l.rating ?? 0), 0) / rated.length : 0;

  const areaMix = useMemo(() => {
    const counts = new Map<string, number>();
    lawyers.forEach((l) => l.practiceAreas.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value]) => ({ label, value }));
  }, [lawyers]);

  const cityMix = useMemo(() => {
    const counts = new Map<string, number>();
    lawyers.forEach((l) => counts.set(l.city, (counts.get(l.city) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [lawyers]);

  const ratingSpread = useMemo(() => {
    const buckets = [
      { label: '4.8 – 5.0', value: 0 }, { label: '4.5 – 4.8', value: 0 },
      { label: '4.0 – 4.5', value: 0 }, { label: 'Below 4.0', value: 0 },
      { label: 'No reviews', value: 0 },
    ];
    lawyers.forEach((l) => {
      if (l.rating === null || l.reviewCount === 0) buckets[4]!.value += 1;
      else if (l.rating >= 4.8) buckets[0]!.value += 1;
      else if (l.rating >= 4.5) buckets[1]!.value += 1;
      else if (l.rating >= 4.0) buckets[2]!.value += 1;
      else buckets[3]!.value += 1;
    });
    return buckets;
  }, [lawyers]);

  const labels = weeks.map((w) => w.label);

  // Decision funnel over the selected range: what came in, what cleared, what is still open.
  const submitted = weeks.reduce((n, w) => n + w.submissions, 0);
  const published = weeks.reduce((n, w) => n + w.approvals, 0);
  const clearanceRate = submitted ? Math.round((published / submitted) * 100) : 0;

  return (
    <>
      <div className="row wrap gap-12" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="display" style={{ fontSize: 26 }}>Operations dashboard</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            Directory health, the review backlog and public-user activity. Week ending {longDate('2026-09-18')}.
          </p>
        </div>
        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <div className="segmented" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)} data-testid={`range-${r.id}`}>
                {r.label}
              </button>
            ))}
          </div>
          {pending > 0 && (
            <button className="btn sm" onClick={() => onGo('queue')} data-testid="dash-to-queue">
              Review {pending} pending {pending === 1 ? 'profile' : 'profiles'} <Icon.chevron size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <Kpi
          label="Listed lawyers" value={String(verified - suspended)}
          delta={suspended ? `${suspended} suspended · ${promoted} promoted` : `${promoted} on promoted placement`} tone="flat"
        />
        <Kpi label="Awaiting review" value={String(pending)} delta={`${changesRequested} awaiting the lawyer · median 2.4 days`} tone="flat" />
        <Kpi label="Registered users" value={totalUsers.toLocaleString('en-IN')} delta="+91 this week" trend={weeks.map((w) => w.signups)} />
        <Kpi label="Client reviews" value={reviews.toLocaleString('en-IN')} delta={`Average ${avgRating.toFixed(2)} ★ across the directory`} tone="flat" />
      </div>

      <div className="panel" style={{ marginTop: 16, padding: '18px 20px' }}>
        <div className="row wrap gap-12" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 15 }}>Verification funnel</h3>
            <p className="sub" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
              Over the selected range. A profile can only leave the queue through a recorded decision.
            </p>
          </div>
          <span className="badge neutral" style={{ marginLeft: 'auto' }}>{clearanceRate}% cleared</span>
        </div>
        <BarList
          items={[
            { label: 'Submitted', value: submitted },
            { label: 'Published', value: published },
            { label: 'Open now', value: pending },
            { label: 'With the lawyer', value: changesRequested },
          ]}
        />
      </div>

      {(disputedReviews > 0 || removedReviews > 0) && (
        <div className="callout gold" style={{ marginTop: 16 }} data-testid="moderation-callout">
          <Icon.alert size={16} />
          <span>
            {disputedReviews} disputed {disputedReviews === 1 ? 'review is' : 'reviews are'} waiting on a decision
            {removedReviews > 0 && `, and ${removedReviews} ${removedReviews === 1 ? 'has' : 'have'} been removed under the review policy`}.{' '}
            <button className="btn ghost sm" onClick={() => onGo('reviews')} data-testid="dash-to-reviews">Open moderation →</button>
          </span>
        </div>
      )}

      <div className="chart-grid">
        <div className="card chart-card">
          <header>
            <h3>Submissions and approvals</h3>
            <p className="sub">Profiles received against profiles published, by week. A widening gap means the queue is growing.</p>
          </header>
          <LineChart
            labels={labels}
            series={[
              { key: 'sub', label: 'Submitted', color: SERIES.primary, values: weeks.map((w) => w.submissions) },
              { key: 'app', label: 'Published', color: SERIES.secondary, values: weeks.map((w) => w.approvals) },
            ]}
          />
        </div>

        <div className="card chart-card">
          <header>
            <h3>Where the directory is thin</h3>
            <p className="sub">Verified lawyers per practice area.</p>
          </header>
          <BarList items={areaMix} />
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Areas with one lawyer leave visitors without a choice — worth recruiting.
          </p>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <header>
            <h3>Visitor sign-ups and enquiries</h3>
            <p className="sub">Accounts created against enquiries sent to lawyers, by week.</p>
          </header>
          <LineChart
            labels={labels}
            series={[
              { key: 'signups', label: 'Sign-ups', color: SERIES.primary, values: weeks.map((w) => w.signups) },
              { key: 'enq', label: 'Enquiries', color: SERIES.secondary, values: weeks.map((w) => w.enquiries) },
            ]}
          />
          <p className="tiny muted" style={{ marginTop: 10 }} data-testid="live-enquiries">
            {enquiries.length} {enquiries.length === 1 ? 'enquiry has' : 'enquiries have'} been sent through this
            prototype{enquiries.filter((e) => e.status === 'new').length > 0 && `, ${enquiries.filter((e) => e.status === 'new').length} still awaiting a reply`}.
            Law Den records that an enquiry happened, never what it said.
          </p>
        </div>

        <div className="card chart-card">
          <header>
            <h3>Rating spread</h3>
            <p className="sub">How the directory's verified profiles are rated.</p>
          </header>
          <BarList items={ratingSpread} />
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <header>
            <h3>Needs a decision</h3>
            <p className="sub">Work outside the verification queue.</p>
          </header>
          <div className="stack gap-8">
            {OPS_QUEUE.map((o) => (
              <button
                className="row gap-10 card" key={o.id} style={{ padding: 12, width: '100%', textAlign: 'left', cursor: 'pointer' }}
                data-testid={`ops-${o.kind}`}
                onClick={() => onGo(o.kind === 'review-flag' ? 'reviews' : o.kind === 'profile-edit' ? 'queue' : 'lawyers')}
              >
                <span className={`cred-icon${o.priority === 'high' ? ' rejected' : ' pending'}`}>
                  {o.kind === 'review-flag' ? <Icon.alert size={15} /> : o.kind === 'fee-change' ? <Icon.doc size={15} /> : <Icon.spark size={15} />}
                </span>
                <div className="stack gap-4" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5 }}>{o.subject}</strong>
                  <span className="tiny muted">{o.detail}</span>
                </div>
                <span className="tiny muted" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{longDate(o.raised)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <header>
            <h3>Coverage by city</h3>
            <p className="sub">Verified lawyers per city.</p>
          </header>
          <BarList items={cityMix} />
          <div className="row gap-8" style={{ marginTop: 16 }}>
            <button className="btn secondary sm" onClick={() => onGo('lawyers')}>Manage lawyers</button>
            <button className="btn secondary sm" onClick={() => onGo('users')}>View users</button>
          </div>
        </div>
      </div>

      <div className="card chart-card" style={{ marginTop: 16 }}>
        <header><h3>Latest activity</h3></header>
        <div className="audit"><ul>
          {audit.slice(0, 5).map((a) => (
            <li key={a.id}>
              <span className="tiny muted">{a.at.replace('T', ' ')}</span>
              <span><strong>{a.action}</strong> — {a.target}<div className="tiny muted">{a.actor}</div></span>
            </li>
          ))}
          {audit.length === 0 && <li><span className="muted small">No activity recorded yet.</span></li>}
        </ul></div>
      </div>

      <p className="tiny muted" style={{ marginTop: 18 }}>
        Weekly figures, sample users and the decision queue are demonstration data. Lawyer counts, listing status,
        placement, ratings, review totals, moderation counts and the activity log are computed live from the
        directory you are administering.
      </p>
    </>
  );
};
