import type { Lawyer } from '../data/types';

export type SortKey = 'recommended' | 'rating' | 'reviews' | 'fee-asc' | 'fee-desc' | 'experience';

export interface Filters {
  query: string;
  practiceAreas: string[];
  city: string;
  languages: string[];
  maxFee: number;
  minRating: number;
  minReviews: number;
  verifiedOnly: boolean;
  acceptingOnly: boolean;
  sort: SortKey;
}

export const FEE_CEILING = 5000;

export const defaultFilters = (): Filters => ({
  query: '',
  practiceAreas: [],
  city: 'All cities',
  languages: [],
  maxFee: FEE_CEILING,
  minRating: 0,
  minReviews: 0,
  verifiedOnly: true,
  acceptingOnly: false,
  sort: 'recommended',
});

export const isDefaultFilters = (f: Filters): boolean => {
  const d = defaultFilters();
  return (
    f.query.trim() === '' &&
    f.practiceAreas.length === 0 &&
    f.city === d.city &&
    f.languages.length === 0 &&
    f.maxFee === d.maxFee &&
    f.minRating === 0 &&
    f.minReviews === 0 &&
    f.verifiedOnly === d.verifiedOnly &&
    f.acceptingOnly === false
  );
};

export const activeFilterCount = (f: Filters): number => {
  const d = defaultFilters();
  let n = 0;
  if (f.query.trim()) n += 1;
  n += f.practiceAreas.length;
  if (f.city !== d.city) n += 1;
  n += f.languages.length;
  if (f.maxFee !== d.maxFee) n += 1;
  if (f.minRating > 0) n += 1;
  if (f.minReviews > 0) n += 1;
  if (!f.verifiedOnly) n += 1;
  if (f.acceptingOnly) n += 1;
  return n;
};

const matchesQuery = (lawyer: Lawyer, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/);
  const haystack = [
    lawyer.name,
    lawyer.headline,
    lawyer.city,
    lawyer.state,
    lawyer.about,
    ...lawyer.practiceAreas,
    ...lawyer.languages,
    ...lawyer.highlights,
    ...lawyer.courts,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
};

/**
 * Organic ranking only. Paid placement never enters this score — promoted profiles are
 * surfaced in a separate, labelled row and keep the position they earn in this list.
 */
const recommendedScore = (l: Lawyer): number => {
  const rating = l.rating ?? 0;
  const confidence = Math.log10(l.reviewCount + 1);
  const freshness = l.acceptsNewClients ? 0.25 : 0;
  const responsiveness = Math.max(0, 1 - l.responseTimeHours / 48) * 0.35;
  return rating * 1.6 + confidence * 1.1 + freshness + responsiveness;
};

/** Placement lapses on its end date without anyone having to switch it off. */
export const isPromoted = (l: Lawyer, today = new Date().toISOString().slice(0, 10)): boolean =>
  l.promoted && l.listed && (!l.promotedUntil || l.promotedUntil >= today);

export const applyFilters = (lawyers: Lawyer[], f: Filters): Lawyer[] => {
  const filtered = lawyers.filter((l) => {
    // A suspended profile is out of the directory entirely.
    if (!l.listed) return false;
    if (f.verifiedOnly && !l.verified) return false;
    if (f.acceptingOnly && !l.acceptsNewClients) return false;
    if (!matchesQuery(l, f.query)) return false;
    if (f.city !== 'All cities' && l.city !== f.city) return false;
    if (f.practiceAreas.length && !f.practiceAreas.some((a) => l.practiceAreas.includes(a))) return false;
    if (f.languages.length && !f.languages.every((lang) => l.languages.includes(lang))) return false;
    if (f.maxFee < FEE_CEILING && l.fees.consultation > f.maxFee) return false;
    if (f.minRating > 0 && (l.rating ?? 0) < f.minRating) return false;
    if (f.minReviews > 0 && l.reviewCount < f.minReviews) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (f.sort) {
    case 'rating':
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
      break;
    case 'reviews':
      sorted.sort((a, b) => b.reviewCount - a.reviewCount || (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'fee-asc':
      sorted.sort((a, b) => a.fees.consultation - b.fees.consultation);
      break;
    case 'fee-desc':
      sorted.sort((a, b) => b.fees.consultation - a.fees.consultation);
      break;
    case 'experience':
      sorted.sort((a, b) => b.experienceYears - a.experienceYears);
      break;
    default:
      sorted.sort((a, b) => recommendedScore(b) - recommendedScore(a));
  }
  return sorted;
};

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  rating: 'Highest rated',
  reviews: 'Most reviewed',
  'fee-asc': 'Consultation fee: low to high',
  'fee-desc': 'Consultation fee: high to low',
  experience: 'Most experienced',
};
