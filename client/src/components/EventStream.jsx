import { useEffect, useRef, useState } from 'react';
import { api, subscribeStream } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

const MAX = 80;

export default function EventStream({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const seen = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    api.listEvents(40)
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        for (const ev of d.items ?? []) seen.current.add(ev._id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const close = subscribeStream({
      onEvent: (ev) => {
        if (seen.current.has(ev._id)) return;
        seen.current.add(ev._id);
        setItems((prev) => [ev, ...prev].slice(0, MAX));
      },
      onError: () => setStreaming(false),
    });
    setStreaming(true);
    return () => {
      close();
      setStreaming(false);
    };
  }, []);

  return (
    <section className="card">
      <div className="section-head">
        <div className="label">Audit · event stream</div>
        <div className="meta">
          <span className={`stream-pill ${streaming ? 'on' : 'off'}`}>
            <span className="dot" />
            {streaming ? 'SSE LIVE' : 'reconnecting'}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="title">No events</div>
          The audit log streams here once activity begins.
        </div>
      ) : (
        <div className="evlog">
          {items.map((ev) => (
            <div key={ev._id} className={`evrow sev-${ev.severity}`}>
              <span className="evt mono mute2">{formatLogTime(ev.createdAt)}</span>
              <span className={`sev sev-${ev.severity}`}>{ev.severity.toUpperCase()}</span>
              <span className="code mono">{ev.code}</span>
              <span className="msg mono">{ev.message ?? ev.entityKey ?? ''}</span>
              {ev.transactionId ? <span className="tx mono mute2">tx {ev.transactionId}</span> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatLogTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().slice(11, 23);
}
