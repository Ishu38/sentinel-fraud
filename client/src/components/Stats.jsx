import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatPercent, timeAgo } from '../lib/format.js';

export default function Stats({ refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.stats()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (error) return <div className="toast-error">Stats unavailable: {error}</div>;

  const scored = data?.scored ?? 0;
  const verdicts = data?.verdicts ?? {};
  const flagRate = data?.flagRate ?? 0;
  const blocked = data?.entities?.blocked ?? 0;
  const watch = data?.entities?.watch ?? 0;
  const critical = data?.criticalEvents ?? 0;
  const last = data?.lastFlaggedAt;

  return (
    <div className="kpis">
      <div className="kpi">
        <div className="kpi-label">Scored / 24h</div>
        <div className="kpi-value">{scored.toLocaleString()}</div>
        <div className="kpi-sub">transactions evaluated</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">Verdict mix</div>
        <div className="kpi-strip mono">
          <span className="vchip vchip-allow">A {verdicts.ALLOW ?? 0}</span>
          <span className="vchip vchip-challenge">C {verdicts.CHALLENGE ?? 0}</span>
          <span className="vchip vchip-review">R {verdicts.REVIEW ?? 0}</span>
          <span className="vchip vchip-block">B {verdicts.BLOCK ?? 0}</span>
        </div>
        <div className="kpi-sub">{formatPercent(flagRate)} flagged</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">Blocklist</div>
        <div className="kpi-value red">{blocked}</div>
        <div className="kpi-sub">{watch} on watch</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">Critical events / 24h</div>
        <div className="kpi-value cyan">{critical}</div>
        <div className="kpi-sub">{last ? `last alert ${timeAgo(last)}` : 'none yet'}</div>
      </div>
    </div>
  );
}
