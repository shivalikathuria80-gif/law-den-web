import { useEffect, type ReactNode } from 'react';
import { initials } from '../lib/format';

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */
type IconProps = { size?: number; className?: string };
const svg = (path: ReactNode, size = 16, className?: string) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {path}
  </svg>
);

export const Icon = {
  search: (p: IconProps = {}) => svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>, p.size, p.className),
  scales: (p: IconProps = {}) => svg(<><path d="M12 4v16M7 20h10M12 6 5 8m7-2 7 2" /><path d="m5 8-3 6h6zM19 8l-3 6h6z" /></>, p.size, p.className),
  check: (p: IconProps = {}) => svg(<path d="m4 12.5 5 5L20 6.5" />, p.size, p.className),
  shield: (p: IconProps = {}) => svg(<><path d="M12 3 5 6v6c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6z" /><path d="m9 12 2 2 4-4" /></>, p.size, p.className),
  star: (p: IconProps = {}) => svg(<path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" />, p.size, p.className),
  pin: (p: IconProps = {}) => svg(<><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>, p.size, p.className),
  clock: (p: IconProps = {}) => svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>, p.size, p.className),
  doc: (p: IconProps = {}) => svg(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 13h7M10 17h5" /></>, p.size, p.className),
  user: (p: IconProps = {}) => svg(<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1-3.6 3.7-5.4 7-5.4s6 1.8 7 5.4" /></>, p.size, p.className),
  spark: (p: IconProps = {}) => svg(<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />, p.size, p.className),
  chevron: (p: IconProps = {}) => svg(<path d="m9 5 7 7-7 7" />, p.size, p.className),
  back: (p: IconProps = {}) => svg(<path d="M15 5 8 12l7 7" />, p.size, p.className),
  close: (p: IconProps = {}) => svg(<path d="M6 6l12 12M18 6 6 18" />, p.size, p.className),
  filter: (p: IconProps = {}) => svg(<path d="M4 6h16M7 12h10M10 18h4" />, p.size, p.className),
  sun: (p: IconProps = {}) => svg(<><circle cx="12" cy="12" r="4" /><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>, p.size, p.className),
  moon: (p: IconProps = {}) => svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />, p.size, p.className),
  thumb: (p: IconProps = {}) => svg(<><path d="M7 11v9H4v-9z" /><path d="M7 11l4.2-7.4a2 2 0 0 1 3.7 1.3L14 9h4.6a2 2 0 0 1 2 2.5l-1.6 6A2 2 0 0 1 17 19H7" /></>, p.size, p.className),
  alert: (p: IconProps = {}) => svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5M12 16h.01" /></>, p.size, p.className),
  send: (p: IconProps = {}) => svg(<path d="M20 4 3.5 10.5 10 13l2.5 6.5z" />, p.size, p.className),
};

/* -------------------------------------------------------------------------- */
/* Stars                                                                       */
/* -------------------------------------------------------------------------- */
export const Stars = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) => (
  <span className={`stars${size === 'lg' ? ' lg' : ''}`} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
    {[0, 1, 2, 3, 4].map((i) => {
      const fill = Math.max(0, Math.min(1, value - i));
      const id = `st-${i}-${Math.round(fill * 100)}`;
      return (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id={id}>
              <stop offset={`${fill * 100}%`} stopColor="var(--gold)" />
              <stop offset={`${fill * 100}%`} stopColor="var(--line-strong)" />
            </linearGradient>
          </defs>
          <path d="m12 3.6 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 17.4 6.62 20.2l1.03-6L3.3 10l6-.9z" fill={`url(#${id})`} />
        </svg>
      );
    })}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Avatar — generated from the name, so no stock photography is implied         */
/* -------------------------------------------------------------------------- */
const TONES = [
  ['#1f3b63', '#37699f'], ['#4a2b52', '#7a4a86'], ['#12463b', '#1f7a63'], ['#5a3413', '#96612a'],
  ['#2b2f6b', '#4f56a8'], ['#603030', '#96504e'], ['#0f4452', '#1c7a91'], ['#3f3b12', '#7d7526'],
  ['#2c1f4d', '#5c4394'], ['#134a2a', '#2a8a50'], ['#4b1f38', '#8a3a68'], ['#1c3a4a', '#356b87'],
  ['#42351c', '#7e682f'], ['#213f2c', '#3d7a52'], ['#3a2233', '#6f4260'],
];

export const Avatar = ({ name, tone, large = false }: { name: string; tone: number; large?: boolean }) => {
  const [from, to] = TONES[tone % TONES.length]!;
  return (
    <div className={`avatar${large ? ' lg' : ''}`} style={{ background: `linear-gradient(140deg, ${from}, ${to})` }} aria-hidden="true">
      {initials(name)}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */
export const VerifiedBadge = ({ title }: { title?: string }) => (
  <span className="badge verified" title={title ?? 'Credentials checked by the Law Den review team'}>
    <Icon.shield size={12} /> Verified
  </span>
);

export const PromotedBadge = () => (
  <span className="badge promoted" title="Paid placement. Shown separately and never ranked above results by payment.">
    <Icon.spark size={12} /> Promoted
  </span>
);

export const InfoTip = ({ text }: { text: string }) => (
  <span className="info-dot" tabIndex={0} role="note" aria-label={text} title={text}>i</span>
);

export const Modal = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row gap-12" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><Icon.close size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Toast = ({ message }: { message: string }) => (
  <div className="toast" role="status">
    <Icon.check size={15} /> {message}
  </div>
);

export const Field = ({
  label, hint, error, children, full = false,
}: { label: string; hint?: string; error?: string; children: ReactNode; full?: boolean }) => (
  <div className={`field${full ? ' full' : ''}`}>
    <label>{label}</label>
    {children}
    {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
  </div>
);
