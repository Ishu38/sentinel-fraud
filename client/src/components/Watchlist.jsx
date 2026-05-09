import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatPercent, timeAgo } from '../lib/format.js';

export default function Watchlist({ refreshKey, onChange }) {
  const [data, setData] = useState({ items: [], counts: {} });
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.listEntities()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [refreshKey]);

  const setStatus = async (key, status) => {
    setBusyKey(key);
    try {
      await api.patchEntity(key, { status });
      onChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <div className="label">Threat watchlist</div>
        <div className="meta">
          {(data.counts?.blocked ?? 0)} blocked · {(data.counts?.watch ?? 0)} watch · {(data.counts?.clean ?? 0)} clean
        </div>
      </div>

      {error && <div className="toast-error">{error}</div>}

      {data.items.length === 0 ? (
        <div className="empty">
          <div className="title">No tracked entities</div>
          Cards and email domains appear here as they're scored.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Status</th>
              <th>Tx</th>
              <th>Hits</th>
              <th>Risk</th>
              <th>Last seen</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e.key}>
                <td className="mono"><span className="ent-type">{e.type}</span> {e.key.split(':')[1]}</td>
                <td><span className={`status status-${e.status}`}>{e.status}</span></td>
                <td className="mono">{e.txCount}</td>
                <td className="mono">{e.fraudCount}</td>
                <td className="mono">{formatPercent(e.riskScore ?? 0, 1)}</td>
                <td className="mono mute2">{timeAgo(e.lastSeen)}</td>
                <td>
                  <div className="actions">
                    {e.status !== 'blocked' && (
                      <button className="bare danger" disabled={busyKey === e.key} onClick={() => setStatus(e.key, 'blocked')}>Block</button>
                    )}
                    {e.status !== 'clean' && (
                      <button className="bare" disabled={busyKey === e.key} onClick={() => setStatus(e.key, 'clean')}>Clear</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
