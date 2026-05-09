import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const BINS = 24;
const W = 760;
const H = 160;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 22;

export default function ScoreDistribution({ refreshKey, threshold = 0.7 }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.listTransactions(200)
      .then((d) => !cancelled && setItems(d.items ?? []))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [refreshKey]);

  const { bins, max, total, flagged } = useMemo(() => {
    const arr = new Array(BINS).fill(0);
    let total = 0;
    let flagged = 0;
    for (const t of items) {
      const p = t?.score?.fraudProbability;
      if (typeof p !== 'number') continue;
      const idx = Math.min(BINS - 1, Math.floor(p * BINS));
      arr[idx] += 1;
      total += 1;
      if (p >= threshold) flagged += 1;
    }
    return { bins: arr, max: Math.max(...arr, 1), total, flagged };
  }, [items, threshold]);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = innerW / BINS;
  const thrX = PAD_L + innerW * threshold;

  return (
    <section className="card">
      <div className="section-head">
        <div className="label">Score distribution · last {total} scored</div>
        <div className="meta" style={{ display: 'flex', gap: 18 }}>
          <span className="dist-legend"><span className="swatch" style={{ background: '#5eff8a' }} />below threshold</span>
          <span className="dist-legend"><span className="swatch" style={{ background: '#ff3358' }} />flagged ({flagged})</span>
        </div>
      </div>

      <div className="dist-wrap">
        {error && <div className="toast-error">{error}</div>}
        {total === 0 && !error ? (
          <div className="empty">
            <div className="title">No traffic yet</div>
            POST a transaction to populate the distribution.
          </div>
        ) : (
          <>
            <svg className="dist-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <line x1={PAD_L} y1={PAD_T + innerH} x2={W - PAD_R} y2={PAD_T + innerH} stroke="#1c1c26" strokeWidth="1" />
              {[0.25, 0.5, 0.75, 1].map((tick) => {
                const y = PAD_T + innerH - innerH * tick;
                return (
                  <g key={tick}>
                    <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#16161e" strokeDasharray="2 4" />
                    <text x={PAD_L - 8} y={y + 4} fill="#4d4d56" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="end">
                      {Math.round(max * tick)}
                    </text>
                  </g>
                );
              })}

              {bins.map((count, i) => {
                const h = (count / max) * innerH;
                const x = PAD_L + i * barW;
                const y = PAD_T + innerH - h;
                const binStart = i / BINS;
                const above = binStart + 1 / BINS > threshold;
                const fill = above ? '#ff3358' : '#5eff8a';
                return (
                  <rect
                    key={i}
                    x={x + 1}
                    y={y}
                    width={barW - 2}
                    height={h || 0}
                    fill={fill}
                    fillOpacity={count ? 0.9 : 0}
                  />
                );
              })}

              <line
                x1={thrX} y1={PAD_T - 4}
                x2={thrX} y2={PAD_T + innerH + 4}
                stroke="#e8e8ec" strokeWidth="1" strokeDasharray="3 3"
              />
              <text x={thrX + 5} y={PAD_T + 8} fill="#e8e8ec" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1.5">
                THR {threshold.toFixed(2)}
              </text>

              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const x = PAD_L + innerW * tick;
                return (
                  <text key={tick} x={x} y={H - 6} fill="#4d4d56" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                    {tick.toFixed(2)}
                  </text>
                );
              })}
            </svg>
          </>
        )}
      </div>
    </section>
  );
}
