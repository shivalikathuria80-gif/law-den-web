'use client';

import { Icon } from '../components/ui';
import { useNav } from '../lib/nav';
import { VERIFICATION_CHECKS } from '../store';

export const Trust = () => {
  const nav = useNav();
  return (
  <div className="shell">
    <div className="page-head">
      <h1 className="display">How verification, ranking and promotion work</h1>
      <p>
        Law Den only works if visitors can trust what the badges mean. This page states exactly what each one does and
        does not tell you.
      </p>
    </div>

    <div className="panel prose" style={{ maxWidth: 820 }}>
      <div className="callout warn" style={{ marginBottom: 20 }}>
        <Icon.alert size={16} />
        <span>
          <strong>This is a prototype.</strong> Every lawyer, review, document reference and rating in this build is
          fictional sample data created for demonstration. No real advocate has been verified here, and no real person's
          credentials are represented.
        </span>
      </div>

      <h3>What the verified badge means</h3>
      <p>A reviewer has seen documents supplied by the lawyer and confirmed all six checks:</p>
      <ul>
        {VERIFICATION_CHECKS.map((c) => <li key={c.id}>{c.label}</li>)}
      </ul>
      <p>
        It means the person is who they say they are and is entitled to practise. It is <strong>not</strong> a quality
        rating, a recommendation, or a prediction about your matter.
      </p>

      <h3>How results are ordered</h3>
      <p>The default “Recommended” order is computed from four public signals:</p>
      <ul>
        <li>average client rating;</li>
        <li>number of reviews, so a 5.0 from three clients does not outrank a 4.8 from two hundred;</li>
        <li>typical response time;</li>
        <li>whether the lawyer is currently accepting new clients.</li>
      </ul>
      <p>
        You can override it at any time with the sort control — highest rated, most reviewed, fee low to high, or most
        experienced. Nothing is hidden behind the default.
      </p>

      <h3>What promoted placement buys</h3>
      <p>
        A verified lawyer can pay for a promoted slot. That slot is a separate, labelled box above the results, and it
        can be switched off with one click. Promoted profiles still appear in the ranked list in exactly the position
        their ratings earn — payment never moves them up, and it never alters their rating, review count or badge.
        Only already-verified profiles are eligible.
      </p>
      <p className="tiny">
        Payments are not connected in this prototype. Placement is toggled by an admin for demonstration only.
      </p>

      <h3>How reviews work</h3>
      <p>
        Reviews marked <em>verified client</em> come from a client whose engagement was logged on the platform; other
        reviews are shown but labelled differently. Lawyers can reply publicly once per review. Lawyers cannot delete
        reviews, pay to hide them, or have low ratings suppressed — you can filter reviews by star rating yourself and
        see the full distribution on every profile.
      </p>

      <h3>What Law Den does not do</h3>
      <ul>
        <li>It does not take a commission on fees or process payments.</li>
        <li>It does not guarantee outcomes, and no profile may advertise one.</li>
        <li>It does not provide legal advice — the directory helps you choose who to ask.</li>
      </ul>

      <div className="row wrap gap-8" style={{ marginTop: 24 }}>
        <button className="btn" onClick={() => nav('/find')}>Browse the directory</button>
        <button className="btn secondary" onClick={() => nav('/for-lawyers')}>List your practice</button>
      </div>
    </div>
  </div>
);
};
