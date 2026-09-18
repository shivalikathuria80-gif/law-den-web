'use client';

import { useMemo, useState } from 'react';
import { Field, Icon, Toast } from '../components/ui';
import { PRACTICE_AREAS, LANGUAGES } from '../data/seed';
import type { Credential, Submission } from '../data/types';
import { inr, longDate, todayIso } from '../lib/format';
import { useStore } from '../store';

const STEPS = ['Practice identity', 'Bar & credentials', 'Services & fees', 'Review & submit'] as const;

interface Draft {
  name: string; headline: string; city: string; state: string; experienceYears: string;
  languages: string[]; email: string; phone: string;
  barCouncil: string; enrolmentNo: string; education: string; courts: string;
  practiceAreas: string[]; about: string; highlights: string;
  consultation: string; hourly: string; fixedFrom: string; freeFirstCall: boolean;
  responseTimeHours: string; acceptsNewClients: boolean;
  documents: Record<string, string>;
}

const DOCUMENTS: { id: string; type: Credential['type']; label: string; issuer: string; required: boolean }[] = [
  { id: 'enrolment', type: 'bar-enrolment', label: 'Bar council enrolment certificate', issuer: 'State bar council', required: true },
  { id: 'degree', type: 'degree', label: 'Law degree certificate', issuer: 'University', required: true },
  { id: 'identity', type: 'identity', label: 'Government photo identity', issuer: 'Government of India', required: true },
  { id: 'extra', type: 'certification', label: 'Additional certification (optional)', issuer: 'Issuing body', required: false },
];

const emptyDraft = (): Draft => ({
  name: '', headline: '', city: '', state: '', experienceYears: '',
  languages: ['English'], email: '', phone: '',
  barCouncil: '', enrolmentNo: '', education: '', courts: '',
  practiceAreas: [], about: '', highlights: '',
  consultation: '', hourly: '', fixedFrom: '', freeFirstCall: false,
  responseTimeHours: '12', acceptsNewClients: true,
  documents: {},
});

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const ForLawyers = () => {
  const { submissions, addSubmission } = useStore();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0) {
      if (draft.name.trim().length < 3) e.name = 'Enter the name as it appears on your enrolment certificate.';
      if (draft.headline.trim().length < 12) e.headline = 'Describe your practice in at least a few words.';
      if (!draft.city.trim()) e.city = 'City is required.';
      if (!draft.state.trim()) e.state = 'State is required.';
      const yrs = Number(draft.experienceYears);
      if (!draft.experienceYears || Number.isNaN(yrs) || yrs < 0 || yrs > 60) e.experienceYears = 'Enter years of practice between 0 and 60.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) e.email = 'A working email is required for verification.';
      if (!/^[0-9+\-\s]{8,15}$/.test(draft.phone)) e.phone = 'Enter a contact number.';
      if (draft.languages.length === 0) e.languages = 'Select at least one language.';
    }
    if (index === 1) {
      if (!draft.barCouncil.trim()) e.barCouncil = 'Name your state bar council.';
      if (!/^[A-Za-z&/ ]*[0-9]{3,}\/?[0-9]{0,4}$/.test(draft.enrolmentNo.trim()) && draft.enrolmentNo.trim().length < 5) {
        e.enrolmentNo = 'Enter your enrolment number as printed (e.g. KAR/1184/2012).';
      }
      if (!draft.education.trim()) e.education = 'List at least your law degree.';
      DOCUMENTS.filter((d) => d.required).forEach((d) => {
        if (!draft.documents[d.id]) e[`doc-${d.id}`] = 'This document is required for verification.';
      });
    }
    if (index === 2) {
      if (draft.practiceAreas.length === 0) e.practiceAreas = 'Select at least one practice area.';
      const fee = Number(draft.consultation);
      if (!draft.consultation || Number.isNaN(fee) || fee < 0) e.consultation = 'Publish your consultation fee (enter 0 if free).';
      if (draft.about.trim().length < 40) e.about = 'Write at least a couple of sentences — clients read this first.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    if (!validate(0) || !validate(1) || !validate(2)) {
      setToast('Some required details are missing — check the earlier steps.');
      window.setTimeout(() => setToast(''), 3200);
      return;
    }
    const today = todayIso();
    const credentials: Credential[] = DOCUMENTS.filter((d) => draft.documents[d.id]).map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      issuer: d.id === 'enrolment' ? draft.barCouncil : d.issuer,
      reference: d.id === 'enrolment' ? draft.enrolmentNo : draft.documents[d.id]!,
      issuedOn: today,
      status: 'pending',
    }));

    const submission: Submission = {
      id: `s-${slugify(draft.name)}-${Math.random().toString(36).slice(2, 6)}`,
      submittedOn: today,
      status: 'pending',
      checks: {},
      lawyer: {
        id: `l-${slugify(draft.name)}`,
        slug: slugify(draft.name),
        name: draft.name.trim(),
        headline: draft.headline.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        practiceAreas: draft.practiceAreas,
        languages: draft.languages,
        experienceYears: Number(draft.experienceYears),
        fees: {
          consultation: Number(draft.consultation),
          hourly: draft.hourly ? Number(draft.hourly) : null,
          fixedFrom: draft.fixedFrom ? Number(draft.fixedFrom) : null,
          offersFirstCallFree: draft.freeFirstCall,
        },
        barCouncil: draft.barCouncil.trim(),
        enrolmentNo: draft.enrolmentNo.trim(),
        courts: draft.courts.split(',').map((c) => c.trim()).filter(Boolean),
        about: draft.about.trim(),
        highlights: draft.highlights.split(',').map((h) => h.trim()).filter(Boolean),
        education: draft.education.split(';').map((s) => s.trim()).filter(Boolean),
        credentials,
        responseTimeHours: Number(draft.responseTimeHours),
        acceptsNewClients: draft.acceptsNewClients,
        addedOn: today,
        tone: Math.floor(Math.random() * 15),
      },
    };

    addSubmission(submission);
    setSubmittedId(submission.id);
    setToast('Submitted for verification — the review team will check your documents.');
    window.setTimeout(() => setToast(''), 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tracked = useMemo(
    () => submissions.filter((s) => s.id === submittedId || s.status !== 'approved').slice(0, 6),
    [submissions, submittedId],
  );

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (submittedId) {
    const mine = submissions.find((s) => s.id === submittedId);
    return (
      <div className="shell">
        <div className="page-head">
          <h1 className="display">Submitted for verification</h1>
          <p>
            Your profile is now in the review queue. A reviewer checks the enrolment certificate, degree and identity
            document against your details before anything is published to visitors.
          </p>
        </div>
        <div className="panel" style={{ maxWidth: 720 }}>
          <div className="row gap-12" style={{ marginBottom: 14 }}>
            <span className="cred-icon pending"><Icon.doc size={16} /></span>
            <div>
              <strong>{mine?.lawyer.name}</strong>
              <div className="tiny muted">Submitted {longDate(mine!.submittedOn)} · Reference {mine!.id}</div>
            </div>
            <span className="badge pending" style={{ marginLeft: 'auto' }}>
              {mine?.status === 'pending' ? 'Awaiting review' : mine?.status === 'approved' ? 'Published' : mine?.status === 'rejected' ? 'Not accepted' : 'Changes requested'}
            </span>
          </div>
          {mine?.decisionNote && (
            <div className="callout warn" style={{ marginBottom: 14 }}>
              <Icon.alert size={16} /><span>{mine.decisionNote}</span>
            </div>
          )}
          <ol className="stack gap-10 small muted" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Documents checked against the state bar council record.</li>
            <li>Fees and claims reviewed for completeness and accuracy.</li>
            <li>Profile published with a verified badge, or returned with specific corrections.</li>
          </ol>
          <div className="callout info" style={{ marginTop: 16 }}>
            <Icon.shield size={16} />
            <span>
              A reviewer checks submissions in a separate console. You will hear back by email once your
              documents have been looked at.
            </span>
          </div>
          <button className="btn secondary" style={{ marginTop: 18 }} onClick={() => { setSubmittedId(null); setDraft(emptyDraft()); setStep(0); }}>
            Submit another profile
          </button>
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="page-head">
        <h1 className="display">List your practice on Law Den</h1>
        <p>
          Profiles are published only after a reviewer has checked your credentials. There is no fee to be listed, and
          ratings are never influenced by payment.
        </p>
      </div>

      <div className="stepper" role="list">
        {STEPS.map((label, i) => (
          <div className={`step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`} key={label} role="listitem">
            <span className="n">{i < step ? '✓' : i + 1}</span> {label}
          </div>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: 820 }}>
        {step === 0 && (
          <div className="form-grid">
            <Field label="Full name (as on enrolment certificate)" error={errors.name}>
              <input type="text" value={draft.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} data-testid="f-name" placeholder="e.g. Ananya Krishnan" />
            </Field>
            <Field label="Years in practice" error={errors.experienceYears}>
              <input type="number" min={0} max={60} value={draft.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} aria-invalid={!!errors.experienceYears} data-testid="f-experience" placeholder="e.g. 8" />
            </Field>
            <Field label="Profile headline" error={errors.headline} full hint="One line clients will see first, e.g. “Family law and mediation in south Delhi”.">
              <input type="text" value={draft.headline} onChange={(e) => set('headline', e.target.value)} aria-invalid={!!errors.headline} data-testid="f-headline" />
            </Field>
            <Field label="City" error={errors.city}>
              <input type="text" value={draft.city} onChange={(e) => set('city', e.target.value)} aria-invalid={!!errors.city} data-testid="f-city" />
            </Field>
            <Field label="State" error={errors.state}>
              <input type="text" value={draft.state} onChange={(e) => set('state', e.target.value)} aria-invalid={!!errors.state} data-testid="f-state" />
            </Field>
            <Field label="Email (not shown publicly)" error={errors.email}>
              <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} data-testid="f-email" />
            </Field>
            <Field label="Phone (not shown publicly)" error={errors.phone}>
              <input type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} data-testid="f-phone" />
            </Field>
            <Field label="Languages you practise in" error={errors.languages} full>
              <div className="row wrap gap-6">
                {LANGUAGES.map((l) => (
                  <button type="button" key={l} className="chip" aria-pressed={draft.languages.includes(l)} onClick={() => set('languages', toggleIn(draft.languages, l))}>{l}</button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <Field label="State bar council" error={errors.barCouncil}>
              <input type="text" value={draft.barCouncil} onChange={(e) => set('barCouncil', e.target.value)} aria-invalid={!!errors.barCouncil} data-testid="f-barcouncil" placeholder="e.g. Bar Council of Delhi" />
            </Field>
            <Field label="Enrolment number" error={errors.enrolmentNo}>
              <input type="text" value={draft.enrolmentNo} onChange={(e) => set('enrolmentNo', e.target.value)} aria-invalid={!!errors.enrolmentNo} data-testid="f-enrolment" placeholder="e.g. D/3308/2014" />
            </Field>
            <Field label="Education" error={errors.education} full hint="Separate qualifications with a semicolon.">
              <input type="text" value={draft.education} onChange={(e) => set('education', e.target.value)} aria-invalid={!!errors.education} data-testid="f-education" placeholder="LL.B., University of Delhi, 2014; LL.M. Labour Law, 2016" />
            </Field>
            <Field label="Courts and forums you appear before" full hint="Comma separated.">
              <input type="text" value={draft.courts} onChange={(e) => set('courts', e.target.value)} placeholder="Delhi High Court, District Courts, Delhi" />
            </Field>
            <div className="field full">
              <label>Supporting documents</label>
              <span className="hint">
                Prototype: no files leave your browser. Selecting a document records a reference for the reviewer.
              </span>
              <div className="stack gap-8" style={{ marginTop: 8 }}>
                {DOCUMENTS.map((d) => {
                  const attached = draft.documents[d.id];
                  return (
                    <div key={d.id}>
                      <button
                        type="button"
                        className={`upload${attached ? ' attached' : ''}`}
                        style={{ width: '100%' }}
                        data-testid={`upload-${d.id}`}
                        onClick={() => {
                          const ref = attached ? '' : `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                          const documents = { ...draft.documents };
                          if (ref) documents[d.id] = ref; else delete documents[d.id];
                          setDraft((x) => ({ ...x, documents }));
                          setErrors((e) => ({ ...e, [`doc-${d.id}`]: '' }));
                        }}
                      >
                        <span className={`cred-icon${attached ? '' : ' pending'}`}>
                          {attached ? <Icon.check size={16} /> : <Icon.doc size={16} />}
                        </span>
                        <span className="stack" style={{ textAlign: 'left' }}>
                          <strong style={{ fontSize: 13.5 }}>{d.label}{d.required && <span style={{ color: 'var(--danger)' }}> *</span>}</strong>
                          <span className="tiny muted">{attached ? `Attached · reference ${attached}` : 'Click to attach a sample document'}</span>
                        </span>
                        {attached && <span className="badge verified" style={{ marginLeft: 'auto' }}>Attached</span>}
                      </button>
                      {errors[`doc-${d.id}`] && <span className="error tiny">{errors[`doc-${d.id}`]}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <Field label="Practice areas" error={errors.practiceAreas} full hint="Choose the areas you take work in — reviewers check these against your documents.">
              <div className="row wrap gap-6">
                {PRACTICE_AREAS.map((a) => (
                  <button type="button" key={a} className="chip" aria-pressed={draft.practiceAreas.includes(a)} onClick={() => set('practiceAreas', toggleIn(draft.practiceAreas, a))} data-testid={`area-${a}`}>{a}</button>
                ))}
              </div>
            </Field>
            <Field label="Consultation fee (₹)" error={errors.consultation}>
              <input type="number" min={0} value={draft.consultation} onChange={(e) => set('consultation', e.target.value)} aria-invalid={!!errors.consultation} data-testid="f-consultation" placeholder="e.g. 1500" />
            </Field>
            <Field label="Hourly rate (₹, optional)">
              <input type="number" min={0} value={draft.hourly} onChange={(e) => set('hourly', e.target.value)} data-testid="f-hourly" />
            </Field>
            <Field label="Fixed-fee matters from (₹, optional)">
              <input type="number" min={0} value={draft.fixedFrom} onChange={(e) => set('fixedFrom', e.target.value)} />
            </Field>
            <Field label="Typical response time (hours)">
              <input type="number" min={1} max={72} value={draft.responseTimeHours} onChange={(e) => set('responseTimeHours', e.target.value)} />
            </Field>
            <Field label="About your practice" error={errors.about} full>
              <textarea value={draft.about} onChange={(e) => set('about', e.target.value)} aria-invalid={!!errors.about} data-testid="f-about" placeholder="What you do, who you act for, and how you work." />
            </Field>
            <Field label="Highlights" full hint="Comma separated. Avoid guarantees about outcomes — these are checked during review.">
              <input type="text" value={draft.highlights} onChange={(e) => set('highlights', e.target.value)} placeholder="Free first call, Fixed-fee agreements, Evening consultations" />
            </Field>
            <div className="field full">
              <label className="switch">
                <input type="checkbox" checked={draft.freeFirstCall} onChange={(e) => set('freeFirstCall', e.target.checked)} />
                <span>I offer a free first call</span>
              </label>
              <label className="switch" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={draft.acceptsNewClients} onChange={(e) => set('acceptsNewClients', e.target.checked)} />
                <span>I am currently accepting new clients</span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack gap-16">
            <div className="callout gold">
              <Icon.shield size={16} />
              <span>
                By submitting you confirm the details are accurate and that the documents are yours. Law Den publishes
                the profile only after a reviewer has checked them.
              </span>
            </div>
            <dl className="kv">
              <dt>Name</dt><dd>{draft.name || '—'}</dd>
              <dt>Headline</dt><dd>{draft.headline || '—'}</dd>
              <dt>Location</dt><dd>{[draft.city, draft.state].filter(Boolean).join(', ') || '—'}</dd>
              <dt>Experience</dt><dd>{draft.experienceYears ? `${draft.experienceYears} years` : '—'}</dd>
              <dt>Bar council</dt><dd>{draft.barCouncil || '—'} · {draft.enrolmentNo || '—'}</dd>
              <dt>Practice areas</dt><dd>{draft.practiceAreas.join(', ') || '—'}</dd>
              <dt>Languages</dt><dd>{draft.languages.join(', ') || '—'}</dd>
              <dt>Consultation fee</dt><dd>{draft.consultation ? inr(Number(draft.consultation)) : '—'}{draft.freeFirstCall && ' · free first call'}</dd>
              <dt>Documents</dt><dd>{Object.keys(draft.documents).length} attached</dd>
            </dl>
            <button className="btn lg" onClick={submit} data-testid="submit-profile">
              <Icon.send size={16} /> Submit for verification
            </button>
          </div>
        )}

        <div className="form-actions">
          <button className="btn secondary" onClick={back} disabled={step === 0}>Back</button>
          {step < STEPS.length - 1 && <button className="btn" onClick={next} data-testid="step-next">Continue <Icon.chevron size={15} /></button>}
        </div>
      </div>

      {tracked.length > 0 && (
        <section className="panel" style={{ maxWidth: 820, marginTop: 24 }}>
          <h2 className="display" style={{ fontSize: 18, marginBottom: 10 }}>Submissions in the queue</h2>
          <div className="stack gap-8">
            {tracked.map((s) => (
              <div className="row gap-12 card" key={s.id} style={{ padding: 12 }}>
                <div className="stack" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 14 }}>{s.lawyer.name}</strong>
                  <span className="tiny muted">{s.lawyer.city} · submitted {longDate(s.submittedOn)}</span>
                </div>
                <span className={`badge ${s.status === 'pending' ? 'pending' : s.status === 'approved' ? 'verified' : s.status === 'rejected' ? 'rejected' : 'changes'}`} style={{ marginLeft: 'auto' }}>
                  {s.status === 'pending' ? 'Awaiting review' : s.status === 'approved' ? 'Published' : s.status === 'rejected' ? 'Not accepted' : 'Changes requested'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
};
