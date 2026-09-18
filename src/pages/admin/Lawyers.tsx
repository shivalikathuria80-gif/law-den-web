import { useState } from 'react';
import { Avatar, Icon } from '../../components/ui';
import { inr, longDate } from '../../lib/format';
import { useStore } from '../../store';

export const Lawyers = ({ onToast }: { onToast: (m: string) => void }) => {
  const { lawyers, togglePromoted } = useStore();
  const [query, setQuery] = useState('');

  const rows = lawyers.filter((l) => {
    const q = query.trim().toLowerCase();
    return !q || `${l.name} ${l.city} ${l.practiceAreas.join(' ')}`.toLowerCase().includes(q);
  });

  return (
    <>
      <h1 className="display" style={{ fontSize: 26 }}>Lawyers &amp; placement</h1>
      <p className="muted small" style={{ marginTop: 4 }}>
        Every published profile, with the promoted-placement switch.
      </p>

      <div className="callout gold" style={{ margin: '16px 0' }}>
        <Icon.spark size={16} />
        <span>
          Promoted profiles appear in a separate labelled box above the results and keep their earned position in the
          ranked list. Placement cannot be sold to an unverified profile, cannot alter ratings or reviews, and cannot
          change organic ranking. No payment is collected in this prototype.
        </span>
      </div>

      <input
        type="text" placeholder="Search lawyers" value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 280, marginBottom: 14 }} data-testid="lawyer-search" id="lawyer-search"
      />

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
                <tr key={l.id}>
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
                    <span className={`badge ${l.verified ? 'verified' : 'pending'}`}>{l.verified ? 'Verified' : 'Unverified'}</span>
                  </td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox" checked={l.promoted} data-testid={`promote-${l.slug}`}
                        onChange={() => { togglePromoted(l.id); onToast(`${l.name}: promoted placement ${l.promoted ? 'removed' : 'added'}.`); }}
                      />
                      <span className="tiny">{l.promoted ? 'Promoted' : 'Standard'}</span>
                    </label>
                  </td>
                  <td>
                    <a className="btn ghost sm" href={`./index.html#/lawyer/${l.slug}`} target="_blank" rel="noreferrer">View →</a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9}><span className="muted small">No lawyers match that search.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
