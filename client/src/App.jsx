import { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import Stats from './components/Stats.jsx';
import ScoreDistribution from './components/ScoreDistribution.jsx';
import ScoreForm from './components/ScoreForm.jsx';
import AlertsTable from './components/AlertsTable.jsx';
import EventStream from './components/EventStream.jsx';
import Watchlist from './components/Watchlist.jsx';
import Simulator from './components/Simulator.jsx';
import { subscribeStream } from './lib/api.js';

const POLL_MS = 8000;
const THRESHOLD = 0.7;

export default function App() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const close = subscribeStream({ onTransaction: refresh });
    return close;
  }, []);

  return (
    <div className="app">
      <TopBar refreshKey={tick} />
      <div className="body">
        <Stats refreshKey={tick} />
        <ScoreDistribution refreshKey={tick} threshold={THRESHOLD} />

        <div className="main-grid">
          <ScoreForm onScored={refresh} />
          <div className="right-stack">
            <AlertsTable refreshKey={tick} onChange={refresh} />
            <EventStream refreshKey={tick} />
          </div>
        </div>

        <div className="main-grid">
          <Simulator onRun={refresh} />
          <Watchlist refreshKey={tick} onChange={refresh} />
        </div>
      </div>
    </div>
  );
}
