'use client';

import { useMemo, useState } from 'react';
import { AppLink as Link } from '../../components/AppLink';
import { Avatar, Icon, Modal, Stars } from '../../components/ui';
import type { Lawyer } from '../../data/types';
import { inr, longDate, todayIso } from '../../lib/format';
import { isPromoted } from '../../lib/search';
import { SUSPENSION_REASONS, useStore } from '../../store';

type SortKey = 'name' | 'rating' | 'reviews' | 'fee' | 'added';

const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const Lawyers = ({ onToast }: { onToast: (m: string) => void }) => {
  const { lawyers, setPlacement, setListing } = useStore();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | 'suspend' | 'restore' | 'placement'>(null);
  const [reason, setReason] = useState<string>(SUSPENSION_REASONS[0]);
  const [note, setNote] = useState('');
  const [until, setUntil] = useState(plusDays(30));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = lawyers.filter((l) => !q || `${l.name} ${l.city} ${l.practiceAreas.join(' ')}`.toLowerCase().includes(q));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'reviews': return b.reviewCount - a.reviewCount;
        case 'fee': return a.fees.consultation - b.fees.consultation;
        case 'added': return b.addedOn.localeCompare(a.addedOn);
        default: return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [lawyers, query, sort]);

  const selected: Lawyer | null = lawyers.find((l) => l.id === selectedId) ?? null;
  const today = todayIso();

  const openDialog = (lawyer: Lawyer, kind: 'suspend' | 'restore' | 'placement') => {
    setSelectedId(lawyer.id);
    setDialog(kind);
    setReason(SUSPENSION_REASONS[0]);
    setNote('');
    setUntil(lawyer.promotedUntil ?? plusDays(30));
  };

  return (
    <>
      <h1 className="display" style={{ fontSize: 26 }}>Lawyers &amp; placement</h1>
      <p className="muted small" style={{ marginTop: 4 }}>
        Every published profile, with listing status and the paid placement slot.
      </p>

      <div className="callout gold" style={{ margin: '16px 0' }}>
        <Icon.spark size={16} />
        <span>
          Placement shows the profile in a separate labelled box above the results and lapses on its end date. It
          cannot be sold to an unverified or suspended profile, cannot alter ratings or reviews, and cannot change
          organic ranking. No payment is collected in this prototype.
        </span>
      </div>

      <div className="row wrap gap-8" style={{ marginBottom: 14 }}>
        <input
          type="text" placeholder="Search lawyers" value={query} onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 260 }} data-testid="lawyer-search" id="lawyer-search"
        />
        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <label className="tiny muted" htmlFor="lawyer-sort">Sort</label>
          <select id="lawyer-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ width: 'auto' }} data-testid="lawyer-sort">
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="reviews">Reviews</option>
            <option value="fee">Consultation fee</option>
            <option value="added">Recently listed</option>
          </select>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Lawyer</th><th>City</th><th>Listed</th><th className="num">Rating</th>
                <th className="num">Reviews</th><th className="num">Fee</th><th>Status</th><th>Placement</th><th />
              </tr>
            </thead>
            <tbody data-testid="lawyers-table">
              {rows.map((l) => (
                <tr key={l.id} data-testid={`row-${l.slug}`}>
                  <td>
                    <div className="row gap-10">
                      <Avatar name={l.name} tone={l.tone} />
                      <div className="stack" style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 13 }}>{l.name}</strong>
                        <span className="tiny muted">{l.practiceAreas.slice(0, 2).join(' · ')}</span>
                      </div>
                    </div>
                  </td>
                  <td>{l.city}</td>
                  <td>{longDate(l.addedOn)}</td>
                  <td className="num">{l.rating ? l.rating.toFixed(1) : '—'}</td>
                  <td className="num">{l.reviewCount}</td>
                  <td className="num">{inr(l.fees.consultation)}</td>
                  <td>
                    {l.listed
                      ? <span className={`badge ${l.verified ? 'verified' : 'pending'}`}>{l.verified ? 'Listed' : 'Unverified'}</span>
                      : <span className="badge rejected" title={l.suspension?.reason}>Suspended</span>}
                  </td>
                  <td>
                    {isPromoted(l, today) ? (
                      <span className="stack gap-4">
                        <span className="badge promoted"><Icon.spark size={11} /> Promoted</span>
                        <span className="tiny muted">{l.promotedUntil ? `to ${longDate(l.promotedUntil)}` : 'no end date'}</span>
                      </span>
                    ) : (
                      <span className="tiny muted">Standard</span>
                    )}
                  </td>
                  <td>
                    <div className="row gap-6" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" onClick={() => openDialog(l, 'placement')} data-testid={`placement-${l.slug}`}>
                        Placement
                      </button>
                      {l.listed ? (
                        <button className="btn ghost sm" onClick={() => openDialog(l, 'suspend')} data-testid={`suspend-${l.slug}`}>
                          Suspend
                        </button>
                      ) : (
                        <button className="btn ghost sm" onClick={() => openDialog(l, 'restore')} data-testid={`restore-${l.slug}`}>
                          Restore
                        </button>
                      )}
                      <Link className="btn ghost sm" href={`/lawyer/${l.slug}`} target="_blank">View →</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9}><span className="muted small">No lawyers match that search.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dialog === 'placement' && selected && (
        <Modal title={`Placement — ${selected.name}`} onClose={() => setDialog(null)}>
          {!selected.verified || !selected.listed ? (
            <div className="callout warn" data-testid="placement-blocked">
              <Icon.alert size={16} />
              <span>
                Only a verified, listed profile is eligible for paid placement. {selected.listed ? 'This profile is not verified.' : 'This profile is suspended.'}
              </span>
            </div>
          ) : (
            <>
              <div className="row gap-10" style={{ marginBottom: 12 }}>
                <Stars value={selected.rating ?? 0} />
                <span className="small muted">
                  {selected.rating ? `${selected.rating.toFixed(1)} from ${selected.reviewCount} reviews` : 'No reviews yet'}
                </span>
              </div>
              <p className="muted small" style={{ marginBottom: 14 }}>
                The profile appears in the labelled promoted box until the end date, and keeps the position its
                ratings earn in the ranked list. Payment is not collected here.
              </p>
              <div className="field">
                <label htmlFor="placement-until">Runs until</label>
                <input id="placement-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} data-testid="placement-until" />
              </div>
              <div className="row wrap gap-8" style={{ marginTop: 16 }}>
                <button
                  className="btn" data-testid="placement-start"
                  onClick={() => {
                    setPlacement(selected.id, true, until);
                    onToast(`${selected.name}: placement runs to ${longDate(until)}.`);
                    setDialog(null);
                  }}
                >
                  {isPromoted(selected, today) ? 'Update placement' : 'Start placement'}
                </button>
                {selected.promoted && (
                  <button
                    className="btn secondary" data-testid="placement-stop"
                    onClick={() => { setPlacement(selected.id, false); onToast(`${selected.name}: placement ended.`); setDialog(null); }}
                  >
                    End placement now
                  </button>
                )}
              </div>
            </>
          )}
        </Modal>
      )}

      {dialog === 'suspend' && selected && (
        <Modal title={`Suspend ${selected.name}?`} onClose={() => setDialog(null)}>
          <p className="muted small" style={{ marginBottom: 14 }}>
            The profile leaves the directory immediately and any paid placement ends. Its record, reviews and
            verification history are kept, and it can be restored.
          </p>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="suspend-reason">Reason</label>
            <select id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="suspend-reason">
              {SUSPENSION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="suspend-note">Note</label>
            <textarea id="suspend-note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="suspend-note" placeholder="What prompted this, and what the lawyer needs to do." />
          </div>
          {!note.trim() && (
            <div className="callout warn" style={{ marginTop: 12 }}><Icon.alert size={16} /><span>A note is required — the lawyer is told why.</span></div>
          )}
          <div className="row gap-8" style={{ marginTop: 16 }}>
            <button
              className="btn danger" disabled={!note.trim()} data-testid="suspend-confirm"
              onClick={() => { setListing(selected.id, false, reason, note.trim()); onToast(`${selected.name} suspended from the directory.`); setDialog(null); }}
            >
              Suspend listing
            </button>
            <button className="btn secondary" onClick={() => setDialog(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {dialog === 'restore' && selected && (
        <Modal title={`Restore ${selected.name}?`} onClose={() => setDialog(null)}>
          {selected.suspension && (
            <div className="callout info" style={{ marginBottom: 14 }}>
              <Icon.alert size={16} />
              <span>Suspended {selected.suspension.at.replace('T', ' ')} — {selected.suspension.reason}. {selected.suspension.note}</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="restore-note">Note</label>
            <textarea id="restore-note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="restore-note" placeholder="What was resolved." />
          </div>
          <div className="row gap-8" style={{ marginTop: 16 }}>
            <button
              className="btn" data-testid="restore-confirm"
              onClick={() => { setListing(selected.id, true, '', note.trim()); onToast(`${selected.name} is listed again.`); setDialog(null); }}
            >
              Restore listing
            </button>
            <button className="btn secondary" onClick={() => setDialog(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
};
