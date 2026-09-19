'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLink as Link } from '../../components/AppLink';
import { Sparkline } from '../../components/charts';
import { Avatar, Icon, Stars } from '../../components/ui';
import { inr, longDate, relativeDate, responseTime } from '../../lib/format';
import { isPromoted } from '../../lib/search';
import { useStore } from '../../store';
import { PortalEnquiries } from './PortalEnquiries';
import { PortalProfile } from './PortalProfile';
import { PortalReviews } from './PortalReviews';

const PICK_KEY = 'lawden.portal.lawyer';

type Tab = 'overview' | 'enquiries' | 'reviews' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'profile', label: 'My profile' },
];

export const Portal = () => {
  const { lawyers, enquiries } = useStore();
  const [lawyerId, setLawyerId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PICK_KEY);
      if (stored) setLawyerId(stored);
    } catch { /* storage unavailable */ }
  }, []);

  const choose = (id: string) => {
    setLawyerId(id);
    try { window.localStorage.setItem(PICK_KEY, id); } catch { /* ignore */ }
  };

  const lawyer = lawyers.find((l) => l.id === lawyerId) ?? null;
  const mine = useMemo(() => enquiries.filter((e) => e.lawyerId === lawyerId), [enquiries, lawyerId]);
  const waiting = mine.filter((e) => e.status === 'new').length;
  const disputed = lawyer?.reviews.filter((r) => r.flag && !r.moderation).length ?? 0;

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  if (!lawyer) {
    return (
      <div className="shell">
        <div className="page-head">
          <h1 className="display">Lawyer portal</h1>
          <p>
            Your enquiries, your reviews and the parts of your profile you control. In the live product you would
            reach this with the account you verified with — this prototype lets you open any listed profile instead.
          </p>
        </div>
        <div className="panel" style={{ maxWidth: 620 }}>
          <div className="callout gold" style={{ marginBottom: 16 }}>
            <Icon.alert size={16} />
            <span><strong>Demo sign-in.</strong> Pick a published profile to work as. Nothing here is tied to a real account.</span>
          </div>
          <div className="stack gap-8">
            {lawyers.filter((l) => l.verified).map((l) => (
              <button key={l.id} className="queue-item" onClick={() => choose(l.id)} data-testid={`portal-as-${l.slug}`}>
                <div className="row gap-10">
                  <Avatar name={l.name} tone={l.tone} />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{l.name}</strong>
                    <span className="tiny muted">{l.city} · {l.practiceAreas[0]}</span>
                  </div>
                  {!l.listed && <span className="badge rejected" style={{ marginLeft: 'auto' }}>Suspended</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const weeklyEnquiries = [2, 4, 3, 6, 5, 7, mine.length];

  return (
    <div className="shell">
      <div className="page-head">
        <div className="row wrap gap-12">
          <Avatar name={lawyer.name} tone={lawyer.tone} large />
          <div className="stack gap-4">
            <h1 className="display" style={{ marginBottom: 0, fontSize: 28 }}>{lawyer.name}</h1>
            <span className="muted small">{lawyer.headline}</span>
            <div className="row wrap gap-6" style={{ marginTop: 4 }}>
              {lawyer.verified && <span className="badge verified"><Icon.shield size={12} /> Verified {lawyer.verifiedOn && longDate(lawyer.verifiedOn)}</span>}
              {lawyer.listed ? <span className="badge neutral">Listed</span> : <span className="badge rejected">Suspended</span>}
              {isPromoted(lawyer) && <span className="badge promoted"><Icon.spark size={12} /> Promoted</span>}
            </div>
          </div>
          <button
            className="btn ghost sm" style={{ marginLeft: 'auto' }} data-testid="portal-switch"
            onClick={() => { setLawyerId(null); try { window.localStorage.removeItem(PICK_KEY); } catch { /* ignore */ } }}
          >
            Switch profile
          </button>
        </div>
      </div>

      {!lawyer.listed && lawyer.suspension && (
        <div className="callout warn" style={{ marginBottom: 16 }} data-testid="portal-suspended">
          <Icon.alert size={16} />
          <span>
            <strong>Your listing is suspended</strong> — {lawyer.suspension.reason}. {lawyer.suspension.note} Contact
            the review team once resolved.
          </span>
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`portal-tab-${t.id}`}>
            {t.label}
            {t.id === 'enquiries' && waiting > 0 && <span className="badge pending" style={{ marginLeft: 8 }}>{waiting}</span>}
            {t.id === 'reviews' && disputed > 0 && <span className="badge changes" style={{ marginLeft: 8 }}>{disputed}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="kpis">
            <div className="card kpi">
              <div className="label">Enquiries waiting</div>
              <div className="value">{waiting}</div>
              <div className="delta flat">· {mine.length} in total</div>
              <Sparkline values={weeklyEnquiries} />
            </div>
            <div className="card kpi">
              <div className="label">Rating</div>
              <div className="value">{lawyer.rating ? lawyer.rating.toFixed(1) : '—'}</div>
              <div className="delta flat">· {lawyer.reviewCount} reviews</div>
            </div>
            <div className="card kpi">
              <div className="label">Consultation fee</div>
              <div className="value">{inr(lawyer.fees.consultation)}</div>
              <div className="delta flat">· {lawyer.fees.offersFirstCallFree ? 'free first call' : 'no free call'}</div>
            </div>
            <div className="card kpi">
              <div className="label">Availability</div>
              <div className="value" style={{ fontSize: 20 }}>{lawyer.acceptsNewClients ? 'Open' : 'Waitlist'}</div>
              <div className="delta flat">· {responseTime(lawyer.responseTimeHours).replace('Usually replies ', '')}</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <header>
                <h3>What clients see</h3>
                <p className="sub">Your public profile, exactly as a visitor reads it.</p>
              </header>
              <dl className="kv">
                <dt>Practice areas</dt><dd>{lawyer.practiceAreas.join(', ')}</dd>
                <dt>Languages</dt><dd>{lawyer.languages.join(', ')}</dd>
                <dt>Courts</dt><dd>{lawyer.courts.join(' · ')}</dd>
                <dt>Hourly</dt><dd>{lawyer.fees.hourly ? inr(lawyer.fees.hourly) : 'Not published'}</dd>
                <dt>Fixed fee from</dt><dd>{lawyer.fees.fixedFrom ? inr(lawyer.fees.fixedFrom) : 'Not offered'}</dd>
                <dt>Listed since</dt><dd>{longDate(lawyer.addedOn)}</dd>
              </dl>
              <Link className="btn secondary sm" href={`/lawyer/${lawyer.slug}`} target="_blank" style={{ marginTop: 14 }}>
                View public profile →
              </Link>
            </div>

            <div className="card chart-card">
              <header>
                <h3>Latest enquiries</h3>
                <p className="sub">Newest first.</p>
              </header>
              <div className="stack gap-8">
                {mine.slice(0, 4).map((e) => (
                  <button key={e.id} className="row gap-10 card" style={{ padding: 12, width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => setTab('enquiries')}>
                    <span className={`cred-icon${e.status === 'new' ? ' pending' : ''}`}><Icon.send size={15} /></span>
                    <span className="stack gap-4" style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13 }}>{e.clientName}</strong>
                      <span className="tiny muted">{e.matter} · {relativeDate(e.createdOn.slice(0, 10))}</span>
                    </span>
                    <span className={`badge ${e.status === 'new' ? 'pending' : e.status === 'replied' ? 'verified' : 'neutral'}`} style={{ marginLeft: 'auto' }}>
                      {e.status === 'new' ? 'New' : e.status === 'replied' ? 'Replied' : 'Closed'}
                    </span>
                  </button>
                ))}
                {mine.length === 0 && <p className="muted small">No enquiries yet. They arrive here the moment a visitor sends one.</p>}
              </div>
            </div>
          </div>

          <div className="card chart-card" style={{ marginTop: 16 }}>
            <header>
              <h3>Recent reviews</h3>
              <p className="sub">You can reply publicly once to each review, and dispute one that breaks the policy.</p>
            </header>
            <div className="stack gap-10">
              {lawyer.reviews.slice(0, 3).map((r) => (
                <div className="card" key={r.id} style={{ padding: 12 }}>
                  <div className="row wrap gap-8">
                    <Stars value={r.rating} />
                    <strong style={{ fontSize: 13 }}>{r.author}</strong>
                    <span className="tiny muted" style={{ marginLeft: 'auto' }}>{relativeDate(r.date)}</span>
                  </div>
                  <p className="small muted" style={{ marginTop: 6 }}>{r.body}</p>
                </div>
              ))}
              {lawyer.reviews.length === 0 && <p className="muted small">No reviews yet.</p>}
            </div>
            <button className="btn secondary sm" style={{ marginTop: 14 }} onClick={() => setTab('reviews')}>Manage reviews</button>
          </div>
        </>
      )}

      {tab === 'enquiries' && <PortalEnquiries lawyerId={lawyer.id} onToast={flash} />}
      {tab === 'reviews' && <PortalReviews lawyer={lawyer} onToast={flash} />}
      {tab === 'profile' && <PortalProfile lawyer={lawyer} onToast={flash} />}

      {toast && <div className="toast" role="status"><Icon.check size={15} /> {toast}</div>}
    </div>
  );
};
