import { useEffect, useState } from 'react';
import { api, DEMO_MODE } from '../lib/api.js';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TopBar({ refreshKey }) {
  const [health, setHealth] = useState(null);
  const [latency, setLatency] = useState(null);
  const now = useClock();

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    api.health()
      .then((d) => {
        if (cancelled) return;
        setHealth(d);
        setLatency(Math.round(performance.now() - t0));
      })
      .catch(() => !cancelled && setHealth({ status: 'down' }));
    return () => { cancelled = true; };
  }, [refreshKey]);

  const live = health?.status === 'ok' && health?.engine?.model_loaded;
  const utc = now.toISOString().slice(11, 19) + 'Z';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-name">
          Sentinel <span className="sep">//</span> <span className="v">Fraud Intelligence</span>
        </div>
      </div>

      <div className="topbar-meta">
        <div className="meta-cell"><span className="k">ENGINE</span><span className="v">{DEMO_MODE ? 'Heuristic · synthetic data' : live ? 'XGBoost · IEEE-CIS' : '—'}</span></div>
        <div className="meta-cell"><span className="k">LATENCY</span><span className="v">{latency != null ? `${latency} ms` : '—'}</span></div>
        <div className="meta-cell"><span className="k">UTC</span><span className="v">{utc}</span></div>
      </div>

      <div className="topbar-status">
        {DEMO_MODE && <span className="demo-pill">DEMO</span>}
        <span className={`live ${live ? '' : 'offline'}`}>
          <span className="dot" />
          {live ? 'Online' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
