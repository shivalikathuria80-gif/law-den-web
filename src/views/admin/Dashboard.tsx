'use client';

import { useMemo } from 'react';
import { BarList, LineChart, Sparkline, SERIES } from '../../components/charts';
import { Icon } from '../../components/ui';
import { OPS_QUEUE, SAMPLE_USERS, WEEKS } from '../../data/platform';
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

export const Dashboard = ({ onGo }: { onGo: (section: 'queue' | 'users' | 'lawyers') => void }) => {
  const { lawyers, submissions, audit } = useStore();

  const localUsers = useMemo(() => readKnownUsers(), []);
  const totalUsers = SAMPLE_USERS.length + localUsers.length;
  const pending = submissions.filter((s) => s.status === 'pending').length;
  const verified = lawyers.filter((l) => l.verified).length;
  const promoted = lawyers.filter((l) => l.promoted).length;
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

  const labels = WEEKS.map((w) => w.label);

  return (
    <>
      <div className="row wrap gap-12" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="display" style={{ fontSize: 26 }}>Operations dashboard</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            Directory health, the review backlog and public-user activity. Week ending {longDate('2026-09-18')}.
          </p>
        </div>
        {pending > 0 && (
          <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => onGo('queue')} data-testid="dash-to-queue">
            Review {pending} pending {pending === 1 ? 'profile' : 'profiles'} <Icon.chevron size={14} />
          </button>
        )}
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <Kpi label="Verified lawyers" value={String(verified)} delta={`${promoted} on promoted placement`} tone="flat" />
        <Kpi label="Awaiting review" value={String(pending)} delta="Median decision time 2.4 days" tone="flat" />
        <Kpi label="Registered users" value={totalUsers.toLocaleString('en-IN')} delta="+91 this week" trend={WEEKS.map((w) => w.signups)} />
        <Kpi label="Client reviews" value={reviews.toLocaleString('en-IN')} delta={`Average ${avgRating.toFixed(2)} ★ across the directory`} tone="flat" />
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <header>
            <h3>Submissions and approvals</h3>
            <p className="sub">Profiles received against profiles published, by week. A widening gap means the queue is growing.</p>
          </header>
          <LineChart
            labels={labels}
            series={[
              { key: 'sub', label: 'Submitted', color: SERIES.primary, values: WEEKS.map((w) => w.submissions) },
              { key: 'app', label: 'Published', color: SERIES.secondary, values: WEEKS.map((w) => w.approvals) },
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
              { key: 'signups', label: 'Sign-ups', color: SERIES.primary, values: WEEKS.map((w) => w.signups) },
              { key: 'enq', label: 'Enquiries', color: SERIES.secondary, values: WEEKS.map((w) => w.enquiries) },
            ]}
          />
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
              <div className="row gap-10 card" key={o.id} style={{ padding: 12 }}>
                <span className={`cred-icon${o.priority === 'high' ? ' rejected' : ' pending'}`}>
                  {o.kind === 'review-flag' ? <Icon.alert size={15} /> : o.kind === 'fee-change' ? <Icon.doc size={15} /> : <Icon.spark size={15} />}
                </span>
                <div className="stack gap-4" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5 }}>{o.subject}</strong>
                  <span className="tiny muted">{o.detail}</span>
                </div>
                <span className="tiny muted" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{longDate(o.raised)}</span>
              </div>
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
        Weekly figures, sample users and the decision queue are demonstration data. Lawyer counts, ratings, review
        totals and the activity log are computed live from the directory you are administering.
      </p>
    </>
  );
};
