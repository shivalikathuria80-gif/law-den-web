import { useEffect, useMemo, useState } from 'react';
import { FiltersPanel } from '../components/Filters';
import { LawyerCard } from '../components/LawyerCard';
import { Icon, InfoTip } from '../components/ui';
import { LANGUAGES } from '../data/seed';
import { applyFilters, defaultFilters, isDefaultFilters, SORT_LABELS, type Filters, type SortKey } from '../lib/search';
import { navigate } from '../lib/router';
import { useStore } from '../store';

const QUICK_PICKS = ['Family & Divorce', 'Criminal Defence', 'Property & Real Estate', 'Employment & Labour', 'Consumer Protection', 'Startups & Fundraising'];

export const Directory = () => {
  const { lawyers } = useStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showPromoted, setShowPromoted] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cities = useMemo(
    () => ['All cities', ...Array.from(new Set(lawyers.map((l) => l.city))).sort()],
    [lawyers],
  );
  const areas = useMemo(
    () => Array.from(new Set(lawyers.flatMap((l) => l.practiceAreas))).sort(),
    [lawyers],
  );
  const languages = useMemo(
    () => LANGUAGES.filter((l) => lawyers.some((x) => x.languages.includes(l))),
    [lawyers],
  );

  const results = useMemo(() => applyFilters(lawyers, filters), [lawyers, filters]);
  const promoted = useMemo(() => results.filter((l) => l.promoted), [results]);

  // Brief skeleton pass so that filter changes read as a deliberate, snappy transition.
  useEffect(() => {
    setBusy(true);
    const t = window.setTimeout(() => setBusy(false), 160);
    return () => window.clearTimeout(t);
  }, [filters]);

  const verifiedCount = lawyers.filter((l) => l.verified).length;
  const totalReviews = lawyers.reduce((n, l) => n + l.reviewCount, 0);

  return (
    <>
      <section className="hero">
        <div className="shell">
          <span className="eyebrow"><Icon.scales size={14} /> Prototype · fictional sample data</span>
          <h1 className="display">Find a lawyer whose credentials have actually been checked.</h1>
          <p className="lede">
            Every profile in this directory is reviewed by the Law Den team — bar enrolment, degree and identity
            documents — before it is published. Compare fees, ratings and real client reviews side by side.
          </p>

          <div className="searchbar" role="search">
            <Icon.search size={19} />
            <input
              className="grow"
              type="text"
              placeholder="Try “cheque bounce Chandigarh” or “trademark opposition”"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              aria-label="Search lawyers by name, practice area, city or keyword"
              data-testid="search-input"
            />
            <span className="sep" />
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              aria-label="City"
              data-testid="city-select"
            >
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
              Search
            </button>
          </div>

          <div className="quick-picks">
            <span className="label">Common needs:</span>
            {QUICK_PICKS.map((p) => (
              <button
                key={p}
                className="chip"
                aria-pressed={filters.practiceAreas.includes(p)}
                onClick={() => setFilters({
                  ...filters,
                  practiceAreas: filters.practiceAreas.includes(p)
                    ? filters.practiceAreas.filter((x) => x !== p)
                    : [...filters.practiceAreas, p],
                })}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="hero-stats">
            <div className="stat"><div className="n">{verifiedCount}</div><div className="l">Verified profiles</div></div>
            <div className="stat"><div className="n">{totalReviews.toLocaleString('en-IN')}</div><div className="l">Client reviews</div></div>
            <div className="stat"><div className="n">{cities.length - 1}</div><div className="l">Cities covered</div></div>
            <div className="stat"><div className="n">6</div><div className="l">Checks before listing</div></div>
          </div>
        </div>
      </section>

      <div className="shell" id="results">
        <div className="directory">
          <FiltersPanel
            filters={filters}
            onChange={setFilters}
            lawyers={lawyers}
            cities={cities}
            areas={areas}
            languages={languages}
            open={panelOpen}
          />

          <div>
            <div className="results-head">
              <button className="btn secondary sm mobile-only" onClick={() => setPanelOpen((v) => !v)}>
                <Icon.filter size={15} /> {panelOpen ? 'Hide filters' : 'Filters'}
              </button>
              <span className="count" data-testid="result-count">
                <strong>{results.length}</strong> {results.length === 1 ? 'lawyer' : 'lawyers'}
                {isDefaultFilters(filters) ? ' listed' : ' match your filters'}
              </span>
              <div className="sort-wrap">
                <label htmlFor="sort">Sort by</label>
                <select
                  id="sort"
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })}
                  data-testid="sort-select"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="tiny muted" style={{ marginBottom: 16 }}>
              Results are ordered by rating, number of reviews, responsiveness and whether the lawyer is taking new
              clients. Paid placement never changes this order.{' '}
              <a href="#/trust" style={{ color: 'var(--gold)', fontWeight: 550 }}>How ranking and verification work →</a>
            </p>

            {promoted.length > 0 && showPromoted && (
              <section className="promoted-strip" aria-label="Promoted placements" data-testid="promoted-strip">
                <header>
                  <span className="badge promoted"><Icon.spark size={12} /> Promoted placement</span>
                  <span className="tiny muted">Paid by the lawyer</span>
                  <InfoTip text="These lawyers pay for extra visibility. They are shown here in addition to — not ahead of — their earned position in the results below." />
                  <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setShowPromoted(false)} data-testid="hide-promoted">
                    Hide promoted
                  </button>
                </header>
                <p className="explain">
                  Paid placements are shown in this separate box, marked as promoted, and they still appear in the ranked
                  results below in exactly the position their ratings and reviews earn. Payment buys the box — not the rank,
                  not the verified badge, and not a better rating.
                </p>
                <div className="results" style={{ marginTop: 12 }}>
                  {promoted.map((l) => <LawyerCard key={`promo-${l.id}`} lawyer={l} showPromotedBadge />)}
                </div>
              </section>
            )}

            {promoted.length > 0 && !showPromoted && (
              <div className="callout gold" style={{ marginBottom: 16 }}>
                <Icon.spark size={16} />
                <span>
                  Promoted placements hidden. Ranked results are unchanged — they never included a paid boost.{' '}
                  <button className="btn ghost sm" onClick={() => setShowPromoted(true)}>Show again</button>
                </span>
              </div>
            )}

            {busy ? (
              <div className="results" aria-hidden="true">
                {[0, 1, 2].map((i) => <div className="skeleton" key={i} />)}
              </div>
            ) : results.length === 0 ? (
              <div className="empty">
                <h3>No lawyers match these filters</h3>
                <p className="muted small" style={{ marginBottom: 16 }}>
                  Try widening the fee range, clearing a practice area, or searching a different city.
                </p>
                <button className="btn secondary" onClick={() => setFilters(defaultFilters())}>Reset all filters</button>
              </div>
            ) : (
              <div className="results" data-testid="results">
                {results.map((l) => <LawyerCard key={l.id} lawyer={l} />)}
              </div>
            )}

            <div className="callout info" style={{ marginTop: 24 }}>
              <Icon.alert size={16} />
              <span>
                Are you an advocate? Submit your credentials and the review team will check them before your profile
                appears here.{' '}
                <button className="btn ghost sm" onClick={() => navigate('/for-lawyers')}>List your practice →</button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
