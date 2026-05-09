import { useState } from 'react';
import { api } from '../lib/api.js';
import DecisionPanel from './DecisionPanel.jsx';

const PRODUCT_CDS = ['W', 'C', 'R', 'H', 'S'];
const CARD_BRANDS = ['visa', 'mastercard', 'american express', 'discover'];
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'protonmail.com', 'anonymous.com'];

export default function ScoreForm({ onScored }) {
  const [amount, setAmount] = useState('125.50');
  const [productCD, setProductCD] = useState('W');
  const [card4, setCard4] = useState('visa');
  const [card6, setCard6] = useState('credit');
  const [emailDomain, setEmailDomain] = useState('gmail.com');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await api.scoreTransaction({
        TransactionID: Date.now(),
        TransactionDT: Math.floor(Date.now() / 1000),
        TransactionAmt: Number(amount),
        ProductCD: productCD,
        card1: 80000 + (Date.now() % 19999),
        card4,
        card6,
        P_emaildomain: emailDomain,
        ...(recipientEmail ? { R_emaildomain: recipientEmail } : {}),
      });
      setResult(data);
      onScored?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <div className="label">Manual score</div>
        <div className="meta">POST /api/transactions</div>
      </div>

      <div className="card-body">
        <form className="form-grid" onSubmit={submit}>
          <label className="field">Amount · USD
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>

          <div className="field-row">
            <label className="field">Product
              <select value={productCD} onChange={(e) => setProductCD(e.target.value)}>
                {PRODUCT_CDS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field">Card brand
              <select value={card4} onChange={(e) => setCard4(e.target.value)}>
                {CARD_BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">Card type
              <select value={card6} onChange={(e) => setCard6(e.target.value)}>
                <option>credit</option>
                <option>debit</option>
              </select>
            </label>
            <label className="field">Payer domain
              <select value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)}>
                {EMAIL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>

          <label className="field">Recipient domain · optional
            <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="—" />
          </label>

          <button className="exec" disabled={busy}>{busy ? '· · · scoring' : '▶ Execute scoring'}</button>
        </form>

        {error && <div className="toast-error">Error: {error}</div>}

        {result && <DecisionPanel result={result} />}
      </div>
    </section>
  );
}
