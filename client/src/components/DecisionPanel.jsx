import { formatPercent } from '../lib/format.js';

const VERDICT_META = {
  ALLOW:     { label: 'Allow',     color: 'var(--green)',   glyph: '✓', desc: 'Authorise transaction' },
  CHALLENGE: { label: 'Challenge', color: 'var(--amber)',   glyph: '?', desc: 'Step-up authentication required' },
  REVIEW:    { label: 'Review',    color: 'var(--red)',     glyph: '!', desc: 'Hold for analyst review' },
  BLOCK:     { label: 'Block',     color: 'var(--magenta)', glyph: '✕', desc: 'Decline · counter-measures armed' },
};

export default function DecisionPanel({ result }) {
  if (!result) return null;
  const { decision, score } = result;
  const v = VERDICT_META[decision.verdict] ?? VERDICT_META.ALLOW;
  const p = score?.fraud_probability ?? decision.mlProbability ?? 0;

  const reasonGroups = decision.reasons.reduce((acc, r) => {
    (acc[r.code] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="decision-panel">
      <div className="decision-head">
        <div className="decision-side">
          <div className="decision-label">Decision</div>
          <div className="decision-verdict" style={{ color: v.color, borderColor: v.color }}>
            <span className="glyph">{v.glyph}</span> {decision.verdict}
          </div>
          <div className="decision-desc">{v.desc}</div>
        </div>
        <div className="decision-side right">
          <div className="decision-label">ML probability</div>
          <div className="decision-prob mono">{formatPercent(p, 2)}</div>
          <div className="decision-meta mono">threshold 0.70 · review · 0.85 · block</div>
        </div>
      </div>

      <div className="decision-bar">
        <div className="decision-bar-track">
          <div className="zone allow"  style={{ left: '0%',  width: '50%' }} />
          <div className="zone challenge" style={{ left: '50%', width: '20%' }} />
          <div className="zone review" style={{ left: '70%', width: '15%' }} />
          <div className="zone block"  style={{ left: '85%', width: '15%' }} />
          <div className="marker" style={{ left: `calc(${p * 100}% - 1px)` }} />
        </div>
        <div className="decision-bar-axis">
          <span>0.00</span><span>0.50</span><span>0.70</span><span>0.85</span><span>1.00</span>
        </div>
      </div>

      <div className="reasons-block">
        <div className="reasons-label">Signals · {decision.reasons.length}</div>
        <ul className="reasons-list">
          {Object.entries(reasonGroups).map(([code, items]) => (
            <li key={code}>
              <span className={`reason-code ${codeClass(code)}`}>{code}</span>
              <span className="reason-detail">
                {items.map((i) => i.detail).filter(Boolean).join(' · ') || '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function codeClass(code) {
  if (code.startsWith('BLOCK') || code === 'AUTO_BLOCK' || code === 'RULE_BLOCK' || code === 'VELOCITY_BURST') return 'sev-critical';
  if (code === 'ML_CRITICAL' || code === 'ML_HIGH') return 'sev-alert';
  if (code === 'EMAIL_LOW_REPUTATION' || code === 'AMOUNT_OUTLIER' || code === 'CROSS_DOMAIN_HIGH_VALUE' || code === 'VELOCITY_ELEVATED' || code === 'ML_ELEVATED') return 'sev-warn';
  return 'sev-info';
}
