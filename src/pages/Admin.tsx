import { useMemo, useState } from 'react';
import { Avatar, Icon, InfoTip, Modal, Toast } from '../components/ui';
import type { Submission } from '../data/types';
import { inr, longDate } from '../lib/format';
import { navigate } from '../lib/router';
import { ADMIN_PASSCODE, useStore, VERIFICATION_CHECKS } from '../store';

const statusBadge = (status: Submission['status']) =>
  status === 'pending' ? 'pending' : status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'changes';

const statusLabel = (status: Submission['status']) =>
  status === 'pending' ? 'Awaiting review' : status === 'approved' ? 'Published' : status === 'rejected' ? 'Not accepted' : 'Changes requested';

const Gate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="shell" style={{ paddingTop: 60 }}>
      <div className="panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="row gap-10" style={{ marginBottom: 10 }}>
          <span className="cred-icon"><Icon.shield size={16} /></span>
          <h1 className="display" style={{ fontSize: 22 }}>Admin console</h1>
        </div>
        <p className="muted small" style={{ marginBottom: 16 }}>
          Reviewers check credentials here before a profile reaches visitors. This prototype uses a shared demo
          passcode; a production build would use real accounts with individual audit trails.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim() === ADMIN_PASSCODE) onUnlock();
            else setError('That passcode is not recognised.');
          }}
        >
          <div className="field">
            <label htmlFor="pass">Demo passcode</label>
            <input id="pass" type="password" value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} data-testid="admin-pass" aria-invalid={!!error} />
            {error ? <span className="error">{error}</span> : <span className="hint">Passcode for this prototype: <code>{ADMIN_PASSCODE}</code></span>}
          </div>
          <button className="btn block" style={{ marginTop: 14 }} type="submit" data-testid="admin-unlock">Open console</button>
        </form>
      </div>
    </div>
  );
};

export const Admin = () => {
  const { submissions, lawyers, audit, approveSubmission, requestChanges, rejectSubmission, togglePromoted, resetDemo } = useStore();
  const [unlocked, setUnlocked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'queue' | 'placement' | 'audit'>('queue');
  const [confirm, setConfirm] = useState<null | 'approve' | 'changes' | 'reject'>(null);

  const queue = useMemo(
    () => [...submissions].sort((a, b) => {
      const order = { pending: 0, 'changes-requested': 1, rejected: 2, approved: 3 };
      return order[a.status] - order[b.status] || b.submittedOn.localeCompare(a.submittedOn);
    }),
    [submissions],
  );

  const selected = queue.find((s) => s.id === selectedId) ?? queue[0] ?? null;
  const activeChecks = selected ? { ...selected.checks, ...checks } : {};
  const allChecked = VERIFICATION_CHECKS.every((c) => activeChecks[c.id]);
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const select = (s: Submission) => { setSelectedId(s.id); setChecks({}); setNote(''); };

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  };

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="shell">
      <div className="page-head">
        <div className="row wrap gap-12">
          <h1 className="display" style={{ marginBottom: 0 }}>Admin console</h1>
          <span className="badge pending">{pendingCount} awaiting review</span>
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => { resetDemo(); setSelectedId(null); flash('Prototype data reset to its original state.'); }}>
            Reset demo data
          </button>
        </div>
        <p style={{ marginTop: 10 }}>
          Nothing reaches the visitor directory until every check below is ticked and the profile is approved.
        </p>
      </div>

      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        <button role="tab" aria-selected={tab === 'queue'} onClick={() => setTab('queue')} data-testid="tab-queue">Verification queue</button>
        <button role="tab" aria-selected={tab === 'placement'} onClick={() => setTab('placement')} data-testid="tab-placement">Premium placement</button>
        <button role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')}>Activity log ({audit.length})</button>
      </div>

      {tab === 'queue' && (
        <div className="queue-layout">
          <div className="stack gap-8">
            {queue.map((s) => (
              <button key={s.id} className="queue-item" aria-current={selected?.id === s.id} onClick={() => select(s)} data-testid={`queue-${s.lawyer.slug}`}>
                <div className="row gap-10">
                  <Avatar name={s.lawyer.name} tone={s.lawyer.tone} />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{s.lawyer.name}</strong>
                    <span className="tiny muted">{s.lawyer.city} · {s.lawyer.practiceAreas[0]}</span>
                    <span className={`badge ${statusBadge(s.status)}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>{statusLabel(s.status)}</span>
                  </div>
                </div>
              </button>
            ))}
            {queue.length === 0 && <div className="empty"><h3>Queue is empty</h3></div>}
          </div>

          {selected ? (
            <div className="panel" data-testid="review-panel">
              <div className="row wrap gap-12" style={{ marginBottom: 14 }}>
                <Avatar name={selected.lawyer.name} tone={selected.lawyer.tone} large />
                <div className="stack gap-4" style={{ minWidth: 0 }}>
                  <h2 className="display" style={{ fontSize: 22 }}>{selected.lawyer.name}</h2>
                  <span className="muted small">{selected.lawyer.headline}</span>
                  <span className="tiny muted">Submitted {longDate(selected.submittedOn)} · Ref {selected.id}</span>
                </div>
                <span className={`badge ${statusBadge(selected.status)}`} style={{ marginLeft: 'auto' }}>{statusLabel(selected.status)}</span>
              </div>

              {selected.decisionNote && (
                <div className={`callout ${selected.status === 'approved' ? 'info' : 'warn'}`} style={{ marginBottom: 16 }}>
                  <Icon.alert size={16} />
                  <span><strong>Decision note</strong> ({longDate(selected.decidedOn!)}): {selected.decisionNote}</span>
                </div>
              )}

              <section className="section">
                <h2>Submitted details</h2>
                <dl className="kv">
                  <dt>Bar council</dt><dd>{selected.lawyer.barCouncil}</dd>
                  <dt>Enrolment number</dt><dd>{selected.lawyer.enrolmentNo}</dd>
                  <dt>Experience</dt><dd>{selected.lawyer.experienceYears} years</dd>
                  <dt>Location</dt><dd>{selected.lawyer.city}, {selected.lawyer.state}</dd>
                  <dt>Practice areas</dt><dd>{selected.lawyer.practiceAreas.join(', ')}</dd>
                  <dt>Courts</dt><dd>{selected.lawyer.courts.join(' · ') || '—'}</dd>
                  <dt>Education</dt><dd>{selected.lawyer.education.join('; ') || '—'}</dd>
                  <dt>Consultation fee</dt><dd>{inr(selected.lawyer.fees.consultation)}{selected.lawyer.fees.offersFirstCallFree && ' · free first call'}</dd>
                  <dt>Languages</dt><dd>{selected.lawyer.languages.join(', ')}</dd>
                </dl>
                <p className="muted small" style={{ marginTop: 12 }}>{selected.lawyer.about}</p>
              </section>

              <section className="section">
                <h2>Documents supplied</h2>
                {selected.lawyer.credentials.map((c) => (
                  <div className="cred-item" key={c.id}>
                    <span className={`cred-icon${c.status === 'verified' ? '' : c.status === 'rejected' ? ' rejected' : ' pending'}`}>
                      <Icon.doc size={16} />
                    </span>
                    <div className="stack gap-4">
                      <strong style={{ fontSize: 13.5 }}>{c.label}</strong>
                      <span className="tiny muted">{c.issuer} · Ref {c.reference}</span>
                      {c.note && <span className="tiny" style={{ color: 'var(--danger)' }}>{c.note}</span>}
                    </div>
                    <span className={`badge ${c.status === 'verified' ? 'verified' : c.status === 'rejected' ? 'rejected' : 'pending'}`} style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                      {c.status === 'verified' ? 'Checked' : c.status === 'rejected' ? 'Not accepted' : 'To check'}
                    </span>
                  </div>
                ))}
              </section>

              <section className="section">
                <div className="row gap-8" style={{ marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>Verification checklist</h2>
                  <InfoTip text="All six checks must pass before a profile can be published with the verified badge." />
                  <span className="tiny muted" style={{ marginLeft: 'auto' }}>
                    {VERIFICATION_CHECKS.filter((c) => activeChecks[c.id]).length} of {VERIFICATION_CHECKS.length} complete
                  </span>
                </div>
                <div className="checklist">
                  {VERIFICATION_CHECKS.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={!!activeChecks[c.id]}
                        onChange={(e) => setChecks((x) => ({ ...x, [c.id]: e.target.checked }))}
                        data-testid={`check-${c.id}`}
                        disabled={selected.status === 'approved'}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="section">
                <div className="field">
                  <label htmlFor="note">Reviewer note</label>
                  <textarea
                    id="note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="review-note"
                    placeholder="Recorded in the activity log, and sent to the lawyer when changes are requested."
                    disabled={selected.status === 'approved'}
                  />
                </div>
                {selected.status === 'approved' ? (
                  <div className="callout info" style={{ marginTop: 14 }}>
                    <Icon.check size={16} />
                    <span>
                      Published on {longDate(selected.decidedOn!)}.{' '}
                      <button className="btn ghost sm" onClick={() => navigate(`/lawyer/${selected.lawyer.slug}`)}>View public profile →</button>
                    </span>
                  </div>
                ) : (
                  <>
                    {!allChecked && (
                      <p className="tiny muted" style={{ marginTop: 12 }}>
                        Approval unlocks once all six checks are ticked.
                      </p>
                    )}
                    <div className="row wrap gap-8" style={{ marginTop: 12 }}>
                      <button className="btn" disabled={!allChecked} onClick={() => setConfirm('approve')} data-testid="approve-btn">
                        <Icon.check size={15} /> Approve &amp; publish
                      </button>
                      <button className="btn secondary" onClick={() => setConfirm('changes')} data-testid="changes-btn">Request changes</button>
                      <button className="btn danger" onClick={() => setConfirm('reject')}>Reject</button>
                    </div>
                  </>
                )}
              </section>
            </div>
          ) : (
            <div className="empty"><h3>Select a submission</h3></div>
          )}
        </div>
      )}

      {tab === 'placement' && (
        <div className="panel">
          <h2 className="display" style={{ fontSize: 20, marginBottom: 6 }}>Premium placement</h2>
          <div className="callout gold" style={{ margin: '12px 0 18px' }}>
            <Icon.spark size={16} />
            <span>
              Promoted profiles appear in a separate labelled box above the results and keep their earned position in the
              ranked list. Placement cannot be sold to an unverified profile, cannot alter ratings or reviews, and cannot
              change organic ranking. No payment is collected in this prototype.
            </span>
          </div>
          <div className="stack gap-8">
            {lawyers.map((l) => (
              <div className="row gap-12 card" key={l.id} style={{ padding: 12 }}>
                <Avatar name={l.name} tone={l.tone} />
                <div className="stack" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 14 }}>{l.name}</strong>
                  <span className="tiny muted">{l.city} · {l.rating ? `${l.rating.toFixed(1)} ★ (${l.reviewCount})` : 'No reviews yet'}</span>
                </div>
                <label className="switch" style={{ marginLeft: 'auto' }}>
                  <input type="checkbox" checked={l.promoted} onChange={() => { togglePromoted(l.id); flash(`${l.name}: promoted placement ${l.promoted ? 'removed' : 'added'}.`); }} data-testid={`promote-${l.slug}`} />
                  <span className="small">{l.promoted ? 'Promoted' : 'Standard'}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="panel audit">
          <h2 className="display" style={{ fontSize: 20, marginBottom: 12 }}>Activity log</h2>
          <ul>
            {audit.map((a) => (
              <li key={a.id}>
                <span className="tiny muted">{a.at.replace('T', ' ')}</span>
                <span>
                  <strong>{a.action}</strong> — {a.target}
                  <div className="tiny muted">{a.actor}{a.detail ? ` · ${a.detail}` : ''}</div>
                </span>
              </li>
            ))}
            {audit.length === 0 && <li><span className="muted small">No activity recorded yet.</span></li>}
          </ul>
        </div>
      )}

      {confirm && selected && (
        <Modal
          title={confirm === 'approve' ? 'Publish this profile?' : confirm === 'changes' ? 'Request changes?' : 'Reject this submission?'}
          onClose={() => setConfirm(null)}
        >
          <p className="muted small" style={{ marginBottom: 14 }}>
            {confirm === 'approve'
              ? `${selected.lawyer.name} will appear in the public directory with a verified badge, dated today. Reviews start empty.`
              : confirm === 'changes'
                ? 'The lawyer sees your note and can re-submit. The profile stays out of the directory until then.'
                : 'The submission is closed. The lawyer can appeal with new documents.'}
          </p>
          {confirm !== 'approve' && !note.trim() && (
            <div className="callout warn" style={{ marginBottom: 14 }}>
              <Icon.alert size={16} /><span>Add a reviewer note so the lawyer knows what to fix.</span>
            </div>
          )}
          <div className="row gap-8">
            <button
              className="btn"
              data-testid="confirm-action"
              disabled={confirm !== 'approve' && !note.trim()}
              onClick={() => {
                if (confirm === 'approve') {
                  approveSubmission(selected.id, activeChecks, note);
                  flash(`${selected.lawyer.name} is now live in the directory.`);
                } else if (confirm === 'changes') {
                  requestChanges(selected.id, note, activeChecks);
                  flash('Changes requested — the lawyer has been notified.');
                } else {
                  rejectSubmission(selected.id, note, activeChecks);
                  flash('Submission rejected.');
                }
                setConfirm(null);
                setChecks({});
                setNote('');
              }}
            >
              Confirm
            </button>
            <button className="btn secondary" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
};
