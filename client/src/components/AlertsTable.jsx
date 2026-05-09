import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatMoney, formatPercent, tierFor, timeAgo } from '../lib/format.js';

export default function AlertsTable({ refreshKey, onChange }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.listAlerts()
      .then((d) => !cancelled && setItems(d.items ?? []))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [refreshKey]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.updateAlert(id, { status });
      onChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const open = items.filter((a) => a.status === 'open').length;

  return (
    <section className="card alerts-card">
      <div className="section-head">
        <div className="label">Alert queue</div>
        <div className="meta">{open} open · {items.length} total</div>
      </div>

      {error && <div className="toast-error">Error: {error}</div>}

      {items.length === 0 ? (
        <div className="empty">
          <div className="title">Queue empty</div>
          No transactions have crossed the threshold.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tx ID</th>
              <th>Amount</th>
              <th>p(fraud)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const tier = tierFor(a.fraudProbability ?? 0);
              return (
                <tr key={a._id}>
                  <td className="mono mute2">{timeAgo(a.createdAt)}</td>
                  <td className="mono">{a.transactionId ?? '—'}</td>
                  <td className="amount">{formatMoney(a.amount)}</td>
                  <td>
                    <span className={`prob-cell tier-${tier.id}`}>
                      <span className="swatch" />
                      {formatPercent(a.fraudProbability)}
                    </span>
                  </td>
                  <td><span className={`status ${a.status}`}>{a.status}</span></td>
                  <td>
                    <div className="actions">
                      {a.status === 'open' ? (
                        <>
                          <button className="bare" disabled={busyId === a._id} onClick={() => updateStatus(a._id, 'reviewed')}>Review</button>
                          <button className="bare danger" disabled={busyId === a._id} onClick={() => updateStatus(a._id, 'dismissed')}>Dismiss</button>
                        </>
                      ) : (
                        <span className="mute2 mono" style={{ fontSize: 11 }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
