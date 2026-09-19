'use client';

import { useState } from 'react';
import { useAuth } from '../auth';
import type { Enquiry, EnquiryUrgency, Lawyer } from '../data/types';
import { inr } from '../lib/format';
import { useStore } from '../store';
import { Field, Icon, Modal } from './ui';

const URGENCY: { id: EnquiryUrgency; label: string; hint: string }[] = [
  { id: 'urgent', label: 'Urgent', hint: 'A hearing, notice or deadline within days' },
  { id: 'soon', label: 'Soon', hint: 'Looking to instruct in the next few weeks' },
  { id: 'planning', label: 'Planning', hint: 'Getting advice before deciding' },
];

export const EnquiryDialog = ({ lawyer, onClose }: { lawyer: Lawyer; onClose: () => void }) => {
  const { account } = useAuth();
  const { sendEnquiry } = useStore();
  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [matter, setMatter] = useState(lawyer.practiceAreas[0] ?? '');
  const [urgency, setUrgency] = useState<EnquiryUrgency>('soon');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Enquiry | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Tell the lawyer what to call you.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = 'A working email is how they reply.';
    if (message.trim().length < 30) next.message = 'Give at least a couple of sentences about the matter.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSent(sendEnquiry({
      lawyerId: lawyer.id,
      lawyerSlug: lawyer.slug,
      lawyerName: lawyer.name,
      clientName: name.trim(),
      clientEmail: email.trim(),
      clientUid: account?.uid,
      matter,
      urgency,
      message: message.trim(),
    }));
  };

  if (sent) {
    return (
      <Modal title="Enquiry sent" onClose={onClose}>
        <div className="callout info" style={{ marginBottom: 14 }} data-testid="enquiry-sent">
          <Icon.check size={16} />
          <span>
            {lawyer.name} has your enquiry, reference <strong>{sent.id}</strong>. They usually reply within{' '}
            {lawyer.responseTimeHours <= 24 ? `${lawyer.responseTimeHours} hours` : 'two days'}.
          </span>
        </div>
        <p className="muted small">
          You can follow the conversation under <strong>My enquiries</strong>. Nothing has been paid — fees are agreed
          directly with the lawyer, and Law Den takes no commission.
        </p>
        <div className="row gap-8" style={{ marginTop: 16 }}>
          <a className="btn" href="/enquiries" data-testid="go-enquiries">Open my enquiries</a>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Enquire with ${lawyer.name}`} onClose={onClose}>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Your message goes to this lawyer only. The first consultation is {inr(lawyer.fees.consultation)}
        {lawyer.fees.offersFirstCallFree && ', and the first 15-minute call is free'}.
      </p>

      <form onSubmit={submit} className="stack gap-12" noValidate>
        <div className="form-grid">
          <Field label="Your name" error={errors.name}>
            <input type="text" id="enq-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="enquiry-name" />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" id="enq-email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="enquiry-email" />
          </Field>
        </div>

        <Field label="What is this about?">
          <select id="enq-matter" value={matter} onChange={(e) => setMatter(e.target.value)} data-testid="enquiry-matter">
            {lawyer.practiceAreas.map((a) => <option key={a}>{a}</option>)}
            <option>Something else</option>
          </select>
        </Field>

        <div className="field">
          <label>How soon do you need help?</label>
          <div className="row wrap gap-6">
            {URGENCY.map((u) => (
              <button
                type="button" key={u.id} className="chip" aria-pressed={urgency === u.id}
                onClick={() => setUrgency(u.id)} title={u.hint} data-testid={`urgency-${u.id}`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <span className="hint">{URGENCY.find((u) => u.id === urgency)?.hint}</span>
        </div>

        <Field label="Your message" error={errors.message} hint="What happened, what you need, and any dates that matter. Avoid sending documents until you have agreed terms.">
          <textarea id="enq-message" value={message} onChange={(e) => setMessage(e.target.value)} data-testid="enquiry-message" style={{ minHeight: 120 }} />
        </Field>

        <button className="btn block lg" type="submit" data-testid="enquiry-send">
          <Icon.send size={16} /> Send enquiry
        </button>
      </form>

      <p className="tiny muted" style={{ marginTop: 14 }}>
        Sending an enquiry does not create a lawyer-client relationship, and no payment is taken here. Law Den staff
        can see that you contacted this lawyer, but not what you wrote.
      </p>
    </Modal>
  );
};
