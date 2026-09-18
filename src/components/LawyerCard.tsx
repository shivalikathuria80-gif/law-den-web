import type { Lawyer } from '../data/types';
import { inr, responseTime } from '../lib/format';
import { navigate } from '../lib/router';
import { Avatar, Icon, PromotedBadge, Stars, VerifiedBadge } from './ui';

export const LawyerCard = ({ lawyer, showPromotedBadge = false }: { lawyer: Lawyer; showPromotedBadge?: boolean }) => (
  <button
    className={`lawyer-card${showPromotedBadge ? ' is-promoted' : ''}`}
    onClick={() => navigate(`/lawyer/${lawyer.slug}`)}
    data-testid="lawyer-card"
    data-name={lawyer.name}
    aria-label={`View the profile of ${lawyer.name}`}
  >
    <Avatar name={lawyer.name} tone={lawyer.tone} />

    <div className="stack" style={{ minWidth: 0 }}>
      <div className="row wrap gap-8">
        <h3>{lawyer.name}</h3>
        {lawyer.verified && <VerifiedBadge title={lawyer.verifiedOn ? `Credentials checked on ${lawyer.verifiedOn}` : undefined} />}
        {showPromotedBadge && <PromotedBadge />}
      </div>
      <p className="headline">{lawyer.headline}</p>

      <div className="meta-row">
        <span className="row gap-4"><Icon.pin size={13} /> {lawyer.city}</span>
        <span className="dot" />
        <span>{lawyer.experienceYears} yrs experience</span>
        <span className="dot" />
        <span className="row gap-4"><Icon.clock size={13} /> {responseTime(lawyer.responseTimeHours)}</span>
      </div>

      <div className="row wrap gap-6" style={{ marginTop: 10 }}>
        {lawyer.practiceAreas.slice(0, 3).map((a) => <span className="tag" key={a}>{a}</span>)}
        <span className="tag">{lawyer.languages.slice(0, 3).join(' · ')}</span>
      </div>
    </div>

    <div className="card-side">
      <div className="stack gap-4" style={{ alignItems: 'inherit' }}>
        {lawyer.rating !== null && lawyer.reviewCount > 0 ? (
          <>
            <Stars value={lawyer.rating} />
            <div className="rating-line">
              <span className="value">{lawyer.rating.toFixed(1)}</span>
              <span className="n">({lawyer.reviewCount} reviews)</span>
            </div>
          </>
        ) : (
          <span className="badge neutral">No reviews yet</span>
        )}
      </div>
      <div>
        <div className="fee">{inr(lawyer.fees.consultation)}</div>
        <div className="fee-label">
          {lawyer.fees.offersFirstCallFree ? 'consultation · free first call' : 'consultation'}
        </div>
      </div>
    </div>
  </button>
);
