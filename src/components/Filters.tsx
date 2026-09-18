'use client';

import type { Lawyer } from '../data/types';
import { compactInr } from '../lib/format';
import { activeFilterCount, defaultFilters, FEE_CEILING, type Filters as F } from '../lib/search';
import { Icon } from './ui';

interface Props {
  filters: F;
  onChange: (next: F) => void;
  lawyers: Lawyer[];
  cities: string[];
  areas: string[];
  languages: string[];
  open: boolean;
}

const toggle = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export const FiltersPanel = ({ filters, onChange, lawyers, cities, areas, languages, open }: Props) => {
  const set = <K extends keyof F>(key: K, value: F[K]) => onChange({ ...filters, [key]: value });
  const countFor = (area: string) => lawyers.filter((l) => l.practiceAreas.includes(area)).length;
  const active = activeFilterCount(filters);

  return (
    <aside className={`filters${open ? ' open' : ''}`} aria-label="Filter lawyers">
      <div className="row" style={{ justifyContent: 'space-between', paddingBottom: 6 }}>
        <strong style={{ fontSize: 14 }} className="row gap-8"><Icon.filter size={15} /> Filters {active > 0 && <span className="badge neutral">{active}</span>}</strong>
        {active > 0 && (
          <button className="btn ghost sm" onClick={() => onChange({ ...defaultFilters(), sort: filters.sort })} data-testid="clear-filters">
            Clear
          </button>
        )}
      </div>

      <div className="group">
        <h4>Trust</h4>
        <div className="stack gap-10">
          <label className="switch">
            <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => set('verifiedOnly', e.target.checked)} data-testid="verified-only" />
            <span>Verified profiles only</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={filters.acceptingOnly} onChange={(e) => set('acceptingOnly', e.target.checked)} />
            <span>Accepting new clients</span>
          </label>
        </div>
      </div>

      <div className="group">
        <h4>Consultation fee <span className="tiny muted">up to {filters.maxFee >= FEE_CEILING ? 'any' : compactInr(filters.maxFee)}</span></h4>
        <input
          type="range" min={500} max={FEE_CEILING} step={250} value={filters.maxFee}
          onChange={(e) => set('maxFee', Number(e.target.value))}
          aria-label="Maximum consultation fee" data-testid="fee-range"
        />
        <div className="row tiny muted" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <span>₹500</span><span>₹5,000+</span>
        </div>
      </div>

      <div className="group">
        <h4>Minimum rating</h4>
        <div className="row wrap gap-6">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button key={r} className="chip" aria-pressed={filters.minRating === r} onClick={() => set('minRating', r)}>
              {r === 0 ? 'Any' : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h4>Review volume</h4>
        <div className="row wrap gap-6">
          {[0, 25, 50, 100].map((n) => (
            <button key={n} className="chip" aria-pressed={filters.minReviews === n} onClick={() => set('minReviews', n)} data-testid={`min-reviews-${n}`}>
              {n === 0 ? 'Any' : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h4>Practice area</h4>
        <div className="options">
          {areas.map((a) => (
            <label className="check" key={a}>
              <input type="checkbox" checked={filters.practiceAreas.includes(a)} onChange={() => set('practiceAreas', toggle(filters.practiceAreas, a))} />
              <span>{a}</span>
              <span className="count">{countFor(a)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="group">
        <h4>City</h4>
        <select value={filters.city} onChange={(e) => set('city', e.target.value)} aria-label="City">
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="group">
        <h4>Language</h4>
        <div className="options">
          {languages.map((l) => (
            <label className="check" key={l}>
              <input type="checkbox" checked={filters.languages.includes(l)} onChange={() => set('languages', toggle(filters.languages, l))} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
};
