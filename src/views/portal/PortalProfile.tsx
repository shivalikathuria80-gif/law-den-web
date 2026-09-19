'use client';

import { useState } from 'react';
import { Field, Icon } from '../../components/ui';
import { LANGUAGES } from '../../data/seed';
import type { Lawyer } from '../../data/types';
import { useStore } from '../../store';

export const PortalProfile = ({ lawyer, onToast }: { lawyer: Lawyer; onToast: (m: string) => void }) => {
  const { updateProfile } = useStore();
  const [about, setAbout] = useState(lawyer.about);
  const [highlights, setHighlights] = useState(lawyer.highlights.join(', '));
  const [consultation, setConsultation] = useState(String(lawyer.fees.consultation));
  const [hourly, setHourly] = useState(lawyer.fees.hourly ? String(lawyer.fees.hourly) : '');
  const [fixedFrom, setFixedFrom] = useState(lawyer.fees.fixedFrom ? String(lawyer.fees.fixedFrom) : '');
  const [freeCall, setFreeCall] = useState(lawyer.fees.offersFirstCallFree);
  const [accepting, setAccepting] = useState(lawyer.acceptsNewClients);
  const [responseHours, setResponseHours] = useState(String(lawyer.responseTimeHours));
  const [languages, setLanguages] = useState<string[]>(lawyer.languages);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const next: Record<string, string> = {};
    const fee = Number(consultation);
    if (!consultation || Number.isNaN(fee) || fee < 0) next.consultation = 'Publish a consultation fee (0 if free).';
    if (about.trim().length < 40) next.about = 'Clients read this first — write at least a couple of sentences.';
    if (/\b(guarantee|guaranteed|100%|win your case|sure shot)\b/i.test(`${about} ${highlights}`)) {
      next.about = 'Outcome guarantees are not allowed on Law Den. Describe what you do, not what you promise.';
    }
    const hrs = Number(responseHours);
    if (Number.isNaN(hrs) || hrs < 1 || hrs > 72) next.responseHours = 'Enter a realistic response time between 1 and 72 hours.';
    if (languages.length === 0) next.languages = 'Select at least one language.';
    setErrors(next);
    if (Object.keys(next).length) return;

    updateProfile(lawyer.id, {
      about: about.trim(),
      highlights: highlights.split(',').map((h) => h.trim()).filter(Boolean),
      fees: {
        consultation: fee,
        hourly: hourly ? Number(hourly) : null,
        fixedFrom: fixedFrom ? Number(fixedFrom) : null,
        offersFirstCallFree: freeCall,
      },
      acceptsNewClients: accepting,
      responseTimeHours: hrs,
      languages,
    });
    onToast('Profile updated — the directory shows the change immediately.');
  };

  const toggleLanguage = (l: string) =>
    setLanguages((current) => (current.includes(l) ? current.filter((x) => x !== l) : [...current, l]));

  return (
    <>
      <div className="callout info" style={{ marginBottom: 16 }}>
        <Icon.shield size={16} />
        <span>
          You control fees, availability and how you describe your practice. Your name, bar enrolment, credentials
          and practice areas were verified by the review team — changing those means submitting documents again.
        </span>
      </div>

      <div className="panel" style={{ maxWidth: 820 }}>
        <div className="form-grid">
          <Field label="Consultation fee (₹)" error={errors.consultation}>
            <input type="number" min={0} id="p-consultation" value={consultation} onChange={(e) => setConsultation(e.target.value)} data-testid="profile-consultation" />
          </Field>
          <Field label="Hourly rate (₹, optional)">
            <input type="number" min={0} id="p-hourly" value={hourly} onChange={(e) => setHourly(e.target.value)} data-testid="profile-hourly" />
          </Field>
          <Field label="Fixed-fee matters from (₹, optional)">
            <input type="number" min={0} id="p-fixed" value={fixedFrom} onChange={(e) => setFixedFrom(e.target.value)} />
          </Field>
          <Field label="Typical response time (hours)" error={errors.responseHours}>
            <input type="number" min={1} max={72} id="p-response" value={responseHours} onChange={(e) => setResponseHours(e.target.value)} data-testid="profile-response" />
          </Field>

          <Field label="About your practice" error={errors.about} full>
            <textarea id="p-about" value={about} onChange={(e) => setAbout(e.target.value)} data-testid="profile-about" style={{ minHeight: 120 }} />
          </Field>

          <Field label="Highlights" full hint="Comma separated. No outcome guarantees — they are rejected.">
            <input type="text" id="p-highlights" value={highlights} onChange={(e) => setHighlights(e.target.value)} data-testid="profile-highlights" />
          </Field>

          <Field label="Languages" error={errors.languages} full>
            <div className="row wrap gap-6">
              {LANGUAGES.map((l) => (
                <button type="button" key={l} className="chip" aria-pressed={languages.includes(l)} onClick={() => toggleLanguage(l)}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <div className="field full">
            <label className="switch">
              <input type="checkbox" checked={freeCall} onChange={(e) => setFreeCall(e.target.checked)} data-testid="profile-free-call" />
              <span>I offer a free first call</span>
            </label>
            <label className="switch" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={accepting} onChange={(e) => setAccepting(e.target.checked)} data-testid="profile-accepting" />
              <span>I am currently accepting new clients</span>
            </label>
          </div>
        </div>

        <div className="row gap-8" style={{ marginTop: 20 }}>
          <button className="btn" onClick={save} data-testid="profile-save">Save changes</button>
          <span className="tiny muted" style={{ alignSelf: 'center' }}>Every change is recorded in the platform activity log.</span>
        </div>
      </div>
    </>
  );
};
