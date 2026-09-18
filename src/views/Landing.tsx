'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { useStore } from '../store';
import { useNav } from '../lib/nav';
import { inr } from '../lib/format';

const SEGMENTS = [
  { id: 'visitors', label: 'For clients' },
  { id: 'lawyers', label: 'For lawyers' },
] as const;

const PANELS = {
  visitors: {
    title: 'Check the lawyer before you call them.',
    body: 'Every profile carries the documents a reviewer actually looked at — enrolment certificate, degree, identity — with the date they were checked. Fees are published up front, and reviews can be filtered by rating rather than curated for you.',
    cta: { label: 'Browse the directory', to: '/find' },
  },
  lawyers: {
    title: 'Get listed once your credentials clear.',
    body: 'Submit your enrolment details and documents in four steps. A reviewer works a six-point checklist before anything is published, and you keep control of your fees, practice areas and availability. Listing is free.',
    cta: { label: 'List your practice', to: '/for-lawyers' },
  },
} as const;

export const Landing = () => {
  const { lawyers } = useStore();
  const nav = useNav();
  const [segment, setSegment] = useState<'visitors' | 'lawyers'>('visitors');
  const heroRef = useRef<HTMLDivElement>(null);

  // Specular highlight follows the pointer across the glass.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, []);

  const verified = lawyers.filter((l) => l.verified);
  const reviews = lawyers.reduce((n, l) => n + l.reviewCount, 0);
  const cities = new Set(lawyers.map((l) => l.city)).size;
  const cheapest = Math.min(...lawyers.map((l) => l.fees.consultation));
  const preview = [...verified].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);
  const panel = PANELS[segment];

  return (
    <div className="liquid">
      <div className="liquid-field" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
      </div>

      <div className="shell">
        <section className="lq-hero">
          <div className="lq-grid">
            <div>
              <span className="lq-eyebrow"><Icon.shield size={14} /> Credentials checked before listing</span>
              <h1>Find a lawyer you can <em>actually check</em>.</h1>
              <p className="lede">
                Law Den lists advocates only after a reviewer has seen their bar enrolment, degree and identity
                documents. Compare published fees, ratings and client reviews — and see exactly what every badge means.
              </p>
              <div className="lq-cta">
                <button className="btn lg" onClick={() => nav('/find')} data-testid="cta-find">
                  <Icon.search size={16} /> Find a lawyer
                </button>
                <button className="btn glassy lg" onClick={() => nav('/for-lawyers')} data-testid="cta-list">
                  List your practice
                </button>
              </div>
              <p className="tiny" style={{ color: 'var(--lq-muted)', marginTop: 16 }}>
                Consultations from {inr(cheapest)} · {verified.length} verified profiles · no commission on fees
              </p>
            </div>

            <div className="device" ref={heroRef}>
              <div className="screen">
                <div className="island" />
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13 }}>Top rated near you</strong>
                  <span className="tiny muted">Kochi · Delhi</span>
                </div>
                {preview.map((l) => (
                  <div className="row-mini" key={l.id}>
                    <span className="dot-avatar" style={{ background: `linear-gradient(140deg, #1f3b63, #37699f)` }}>
                      {l.name.split(' ').map((p) => p[0]).join('')}
                    </span>
                    <span className="stack" style={{ minWidth: 0 }}>
                      <span className="row gap-4" style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {l.name}
                        <Icon.shield size={11} />
                      </span>
                      <span className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.practiceAreas[0]} · {l.city}
                      </span>
                    </span>
                    <span className="stack" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <span className="tiny" style={{ fontWeight: 700 }}>{l.rating?.toFixed(1)} ★</span>
                      <span className="tiny muted">{inr(l.fees.consultation)}</span>
                    </span>
                  </div>
                ))}
                <button className="btn block sm" style={{ marginTop: 12 }} onClick={() => nav('/find')}>
                  Open the directory
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="lq-section">
          <div className="segmented" role="group" aria-label="Choose your view">
            {SEGMENTS.map((s) => (
              <button key={s.id} aria-pressed={segment === s.id} onClick={() => setSegment(s.id)} data-testid={`seg-${s.id}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="glass sheen" style={{ padding: 28, marginTop: 16 }}>
            <h2>{panel.title}</h2>
            <p className="sub">{panel.body}</p>
            <button className="btn" style={{ marginTop: 18 }} onClick={() => nav(panel.cta.to)}>
              {panel.cta.label} <Icon.chevron size={15} />
            </button>
          </div>
        </section>

        <section className="lq-section">
          <h2>What the badge actually buys you</h2>
          <p className="sub">Three things Law Den does differently, and states plainly on every page.</p>
          <div className="tiles">
            <div className="glass soft tile sheen">
              <span className="app-icon" style={{ background: 'linear-gradient(150deg, #2f8f6c, #0d7150)' }}><Icon.shield size={22} /></span>
              <h3>Six checks, then listed</h3>
              <p>Identity, enrolment certificate, degree, standing, practice areas and published fees — all six pass before a profile goes live, with the date on the profile.</p>
            </div>
            <div className="glass soft tile sheen">
              <span className="app-icon" style={{ background: 'linear-gradient(150deg, #c99a3a, #a87c2e)' }}><Icon.doc size={22} /></span>
              <h3>Fees in the open</h3>
              <p>Consultation fee, hourly rate and fixed-fee floor on every card. No commission, no lead fees, and no payment taken by Law Den.</p>
            </div>
            <div className="glass soft tile sheen">
              <span className="app-icon" style={{ background: 'linear-gradient(150deg, #4a7fd0, #2a6fc4)' }}><Icon.star size={22} /></span>
              <h3>Reviews you can interrogate</h3>
              <p>Full star distribution, filter by rating, verified-client labels and the lawyer's reply. Negative reviews cannot be bought off.</p>
            </div>
          </div>
        </section>

        <section className="lq-section">
          <h2>How a profile reaches you</h2>
          <p className="sub">A profile moves through these three stages in order — it cannot skip one.</p>
          <div className="steps">
            <div className="glass soft step-card">
              <div className="n">STAGE 01</div>
              <h3>The lawyer submits</h3>
              <p>Practice details, bar enrolment number, education and documents, through a four-step form.</p>
            </div>
            <div className="glass soft step-card">
              <div className="n">STAGE 02</div>
              <h3>A reviewer checks</h3>
              <p>Documents are matched against the submitted details. Anything unclear goes back with a specific note.</p>
            </div>
            <div className="glass soft step-card">
              <div className="n">STAGE 03</div>
              <h3>The profile publishes</h3>
              <p>It appears here with a verified badge, the check date, and no reviews until real clients leave them.</p>
            </div>
          </div>
        </section>

        <section className="lq-section">
          <div className="lq-stats">
            <div className="glass soft lq-stat"><div className="n">{verified.length}</div><div className="l">Verified profiles</div></div>
            <div className="glass soft lq-stat"><div className="n">{reviews.toLocaleString('en-IN')}</div><div className="l">Client reviews</div></div>
            <div className="glass soft lq-stat"><div className="n">{cities}</div><div className="l">Cities covered</div></div>
            <div className="glass soft lq-stat"><div className="n">0%</div><div className="l">Commission on fees</div></div>
          </div>
        </section>

        <section className="glass lq-cta-band sheen">
          <h2>Paid placement buys a box, never a rank.</h2>
          <p className="sub grow" style={{ minWidth: 260 }}>
            Promoted lawyers appear in a separate labelled panel you can dismiss in one click — and they keep the
            position their ratings earn in the ranked list. We wrote down exactly how ordering works.
          </p>
          <button className="btn glassy" onClick={() => nav('/trust')} data-testid="cta-trust">
            Read how ranking works <Icon.chevron size={15} />
          </button>
        </section>
      </div>
    </div>
  );
};
