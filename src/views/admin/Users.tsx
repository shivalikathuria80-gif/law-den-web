'use client';

import { useMemo, useState } from 'react';
import { readKnownUsers } from '../../auth';
import { Avatar, Icon } from '../../components/ui';
import { SAMPLE_USERS, type PlatformUser } from '../../data/platform';
import { longDate, relativeDate } from '../../lib/format';

type Row = Omit<PlatformUser, 'source'> & { source: 'sample' | 'account' };

export const Users = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'new' | 'dormant'>('all');

  const rows = useMemo<Row[]>(() => {
    const accounts: Row[] = readKnownUsers().map((a) => ({
      id: a.uid,
      name: a.name,
      email: a.email,
      city: '—',
      joined: a.createdAt.slice(0, 10),
      lastActive: new Date().toISOString().slice(0, 10),
      savedLawyers: 0,
      enquiries: 0,
      reviewsLeft: 0,
      status: 'new',
      source: 'account',
    }));
    return [...accounts, ...SAMPLE_USERS.map((u) => ({ ...u, source: 'sample' as const }))];
  }, []);

  const filtered = rows.filter((r) => {
    if (status !== 'all' && r.status !== status) return false;
    const q = query.trim().toLowerCase();
    return !q || `${r.name} ${r.email} ${r.city}`.toLowerCase().includes(q);
  });

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    new: rows.filter((r) => r.status === 'new').length,
    dormant: rows.filter((r) => r.status === 'dormant').length,
  };

  return (
    <>
      <h1 className="display" style={{ fontSize: 26 }}>Public users</h1>
      <p className="muted small" style={{ marginTop: 4 }}>
        People who signed up to save lawyers and send enquiries. Accounts created through the site's sign-up form on
        this device appear at the top; the rest are sample records.
      </p>

      <div className="row wrap gap-8" style={{ margin: '18px 0 14px' }}>
        <input
          type="text" placeholder="Search name, email or city" value={query}
          onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} data-testid="user-search" id="user-search"
        />
        {(['all', 'active', 'new', 'dormant'] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)} data-testid={`user-filter-${s}`}>
            {s === 'all' ? 'All' : s[0]!.toUpperCase() + s.slice(1)} <span className="tiny muted">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>User</th><th>City</th><th>Joined</th><th>Last active</th>
                <th className="num">Saved</th><th className="num">Enquiries</th><th className="num">Reviews</th><th>Status</th>
              </tr>
            </thead>
            <tbody data-testid="users-table">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row gap-10">
                      <Avatar name={u.name} tone={u.name.length % 15} />
                      <div className="stack">
                        <strong style={{ fontSize: 13 }}>{u.name}</strong>
                        <span className="tiny muted">{u.email}</span>
                      </div>
                      {u.source === 'account' && <span className="badge verified" style={{ marginLeft: 6 }}>Signed up here</span>}
                    </div>
                  </td>
                  <td>{u.city}</td>
                  <td>{longDate(u.joined)}</td>
                  <td>{relativeDate(u.lastActive)}</td>
                  <td className="num">{u.savedLawyers}</td>
                  <td className="num">{u.enquiries}</td>
                  <td className="num">{u.reviewsLeft}</td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'verified' : u.status === 'new' ? 'pending' : 'neutral'}`}>
                      {u.status === 'active' ? 'Active' : u.status === 'new' ? 'New' : 'Dormant'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><span className="muted small">No users match this filter.</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="callout info" style={{ marginTop: 16 }}>
        <Icon.shield size={16} />
        <span>
          Firebase Authentication holds the real account records. This table cannot read them from the browser —
          a production build would list users through the Firebase Admin SDK on a server, never with a client key.
        </span>
      </div>
    </>
  );
};
