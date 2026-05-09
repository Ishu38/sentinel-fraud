import { useState } from 'react';
import { api } from '../lib/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => Math.floor(Math.random() * 90_000) + 10_000;

const SCENARIOS = [
  {
    id: 'card_testing',
    name: 'Card-testing burst',
    desc: 'Many small charges on one card to find live numbers · trips velocity rule, then auto-blocklist.',
    icon: '⚡',
    plan: () => {
      const card = rid();
      return Array.from({ length: 8 }, (_, i) => ({
        TransactionID: Date.now() + i,
        TransactionAmt: 1.99 + i * 0.50,
        ProductCD: 'C',
        card1: card,
        card4: 'visa',
        card6: 'credit',
        P_emaildomain: 'protonmail.com',
      }));
    },
  },
  {
    id: 'takeover',
    name: 'Account takeover',
    desc: 'Same card, escalating amounts after a small probe purchase.',
    icon: '🎯',
    plan: () => {
      const card = rid();
      return [
        { card1: card, TransactionAmt: 4.99, ProductCD: 'W', card4: 'visa', card6: 'credit', P_emaildomain: 'gmail.com' },
        { card1: card, TransactionAmt: 1850, ProductCD: 'W', card4: 'visa', card6: 'credit', P_emaildomain: 'gmail.com' },
        { card1: card, TransactionAmt: 4200, ProductCD: 'W', card4: 'visa', card6: 'credit', P_emaildomain: 'gmail.com' },
      ].map((t, i) => ({ ...t, TransactionID: Date.now() + i }));
    },
  },
  {
    id: 'synthetic',
    name: 'Synthetic identity',
    desc: 'Brand-new card + risky email domain + outlier amount.',
    icon: '🪪',
    plan: () => [{
      TransactionID: Date.now(),
      TransactionAmt: 6500,
      ProductCD: 'R',
      card1: rid(),
      card4: 'discover',
      card6: 'credit',
      P_emaildomain: 'anonymous.com',
      R_emaildomain: 'protonmail.com',
    }],
  },
  {
    id: 'cross_domain',
    name: 'Cross-domain wire',
    desc: 'High-value transfer between mismatched email domains.',
    icon: '↔',
    plan: () => [{
      TransactionID: Date.now(),
      TransactionAmt: 2750,
      ProductCD: 'C',
      card1: rid(),
      card4: 'mastercard',
      card6: 'credit',
      P_emaildomain: 'yahoo.com',
      R_emaildomain: 'mail.com',
    }],
  },
];

export default function Simulator({ onRun }) {
  const [running, setRunning] = useState(null);
  const [trace, setTrace] = useState([]);

  const run = async (scenario) => {
    setRunning(scenario.id);
    setTrace([]);
    const txs = scenario.plan();
    for (let i = 0; i < txs.length; i++) {
      try {
        const r = await api.scoreTransaction(txs[i]);
        setTrace((prev) => [
          ...prev,
          {
            i: i + 1,
            verdict: r.decision.verdict,
            p: r.score.fraud_probability,
            codes: [...new Set(r.decision.reasons.map((x) => x.code))],
            autoBlocked: (r.entityUpdates ?? []).some((u) => u.autoBlocked),
          },
        ]);
        await sleep(120);
      } catch (e) {
        setTrace((prev) => [...prev, { i: i + 1, error: e.message }]);
        break;
      }
    }
    setRunning(null);
    onRun?.();
  };

  return (
    <section className="card">
      <div className="section-head">
        <div className="label">Adversarial simulator</div>
        <div className="meta">replay attack patterns</div>
      </div>

      <div className="sim-grid">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`sim-card ${running === s.id ? 'running' : ''}`}
            onClick={() => run(s)}
            disabled={!!running}
          >
            <div className="sim-icon">{s.icon}</div>
            <div className="sim-name">{s.name}</div>
            <div className="sim-desc">{s.desc}</div>
            <div className="sim-launch mono">
              {running === s.id ? 'RUNNING…' : '▶ EXECUTE'}
            </div>
          </button>
        ))}
      </div>

      {trace.length > 0 && (
        <div className="sim-trace">
          <div className="sim-trace-head">Last run · {trace.length} step{trace.length !== 1 ? 's' : ''}</div>
          {trace.map((t) => (
            <div key={t.i} className={`sim-step ${t.verdict?.toLowerCase() ?? 'err'}`}>
              <span className="mono mute2">step {t.i}</span>
              {t.error
                ? <span className="mono" style={{ color: 'var(--red)' }}>error: {t.error}</span>
                : <>
                  <span className={`status sim-verdict ${t.verdict?.toLowerCase()}`}>{t.verdict}</span>
                  <span className="mono mute2">p={t.p.toFixed(3)}</span>
                  <span className="mono">{t.codes.slice(0, 4).join(' · ')}</span>
                  {t.autoBlocked && <span className="auto-block-tag">⚑ AUTO-BLOCK</span>}
                </>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
