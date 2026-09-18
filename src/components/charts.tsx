import { useState } from 'react';

/**
 * Two-series categorical palette, validated for CVD separation and contrast against
 * both the light (#fcfcfb) and dark (#121722) chart surfaces. Charts never use more
 * than these two categorical hues; magnitude charts use a single sequential hue.
 */
export const SERIES = { primary: '#2a6fc4', secondary: '#b8862a' } as const;
const SEQUENTIAL = '#2a6fc4';

const PAD = { top: 14, right: 16, bottom: 26, left: 32 };

export interface SeriesSpec {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/** Multi-series line chart with a shared y-scale, hover crosshair and end labels. */
export const LineChart = ({
  labels, series, height = 210, unit = '',
}: { labels: string[]; series: SeriesSpec[]; height?: number; unit?: string }) => {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const ceiling = Math.ceil(max / 4) * 4;   // keeps 0 / mid / top on whole numbers
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / ceiling) * innerH;
  const ticks = [0, ceiling / 2, ceiling];

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img"
        aria-label={`${series.map((s) => s.label).join(' and ')} by week`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const i = Math.round(((px - PAD.left) / innerW) * (labels.length - 1));
          setHover(i >= 0 && i < labels.length ? i : null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--muted-2)">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          i % 2 === 0 ? <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--muted-2)">{l}</text> : null
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {series.map((s) => (
          <g key={s.key}>
            <path
              d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')}
              fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            />
            <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1]!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            {hover !== null && (
              <circle cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            )}
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / width) * 100}%`, top: 4, transform: 'translateX(-50%)' }}>
          <strong>{labels[hover]}</strong>
          {series.map((s) => <div key={s.key}>{s.label}: {s.values[hover]}{unit}</div>)}
        </div>
      )}

      <div className="legend">
        {series.map((s) => (
          <span className="key" key={s.key}>
            <span className="swatch" style={{ background: s.color }} /> {s.label}
            <strong style={{ color: 'var(--ink-2)' }}>{s.values[s.values.length - 1]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
};

/** Horizontal magnitude bars on a single sequential hue. */
export const BarList = ({
  items, suffix = '', color = SEQUENTIAL,
}: { items: { label: string; value: number }[]; suffix?: string; color?: string }) => {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bar-list">
      {items.map((i, idx) => (
        <div className="item" key={i.label}>
          <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.label}</span>
          <span className="track">
            <span
              className="fill"
              style={{ width: `${Math.max((i.value / max) * 100, 2)}%`, background: color, opacity: 1 - idx * 0.07 }}
            />
          </span>
          <span className="num">{i.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};

/** Compact trend line for a KPI tile — one series, no axis, no legend. */
export const Sparkline = ({ values, color = SERIES.primary }: { values: number[]; color?: string }) => {
  const w = 120, h = 30, max = Math.max(...values, 1), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ marginTop: 6 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((values[values.length - 1]! - min) / span) * (h - 4) - 2} r={3} fill={color} />
    </svg>
  );
};
