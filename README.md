# Fraud Detection — ML Pipeline + Gateway + Dashboard

Functional fraud-detection scaffold targeting the IEEE-CIS (Vesta) dataset.

## Architecture

```
[React/Vite client] → [Express gateway (ES modules)] → [FastAPI engine (Python)]
                                ↓
                            [MongoDB]
```

- **engine/** — FastAPI service. Owns ingestion, feature engineering, XGBoost training, and the `/score` inference endpoint.
- **server/** — Express gateway. Persists transactions and alerts to Mongo, proxies scoring to the engine asynchronously.
- **client/** — React dashboard. Submit transactions, view live alerts, see model stats.

## Quick start

### 1. Dataset
Download IEEE-CIS Fraud Detection from Kaggle and place the CSVs at:
```
engine/data/train_transaction.csv
engine/data/train_identity.csv
engine/data/test_transaction.csv      # optional
engine/data/test_identity.csv         # optional
```
Kaggle CLI: `kaggle competitions download -c ieee-fraud-detection -p engine/data && unzip -o engine/data/ieee-fraud-detection.zip -d engine/data`

### 2. Engine
```bash
cd engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m pipelines.train          # writes models/xgb.json + models/encoders.pkl
uvicorn main:app --reload --port 8000
```

### 3. Gateway
```bash
cd server
npm install
cp .env.example .env               # edit MONGO_URI and ENGINE_URL
npm run dev                        # listens on :4000
```

### 4. Client
```bash
cd client
npm install
npm run dev                        # http://localhost:5173
```

### 5. (Optional) Docker
```bash
docker compose up --build
```

## Endpoints

| Method | Path                    | Service  | Purpose                                |
|--------|-------------------------|----------|----------------------------------------|
| POST   | /score                  | engine   | Score a single transaction             |
| GET    | /health                 | engine   | Liveness                               |
| POST   | /api/transactions       | gateway  | Persist + score + emit alert if fraud  |
| GET    | /api/alerts             | gateway  | List recent alerts                     |
| GET    | /api/stats              | gateway  | Aggregate stats                        |

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md). The stack splits: **Vercel** (client) + **Render** (gateway) + **Hugging Face Spaces** (engine) + **MongoDB Atlas** (data).

## Roadmap

- [ ] Streaming Kafka ingestion in front of `/score`
- [ ] Drift monitoring + auto-retrain trigger
- [ ] SHAP-based explanations attached to each alert
- [ ] Feature store (Feast) for online/offline parity
