# Deploying Sentinel

The stack splits across four hosts in production:

```
┌─ Vercel ─────────┐    ┌─ Render ──────────┐    ┌─ HF Spaces ──────┐
│ React client     │───▶│ Express gateway   │───▶│ FastAPI engine    │
│ (static)         │    │ (SSE, decisions)  │    │ (XGBoost + rules) │
└──────────────────┘    └─────────┬─────────┘    └──────────────────┘
                                  │
                                  ▼
                        ┌─ MongoDB Atlas ──┐
                        │ free M0 tier     │
                        └──────────────────┘
```

Why not all on Vercel? Vercel serverless can't host a long-running SSE stream or a 200 MB+ Python ML wheel. Each piece goes where it fits.

---

## 1. MongoDB Atlas (5 min)

1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create a free **M0 cluster** (any region).
3. Database access → add a user, save the password.
4. Network access → add `0.0.0.0/0` (or restrict to Render's egress IPs later).
5. Connect → copy the SRV connection string. Looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net
   ```

Save this — you'll set it as `MONGO_URI` on Render.

---

## 2. Engine on Hugging Face Spaces (10 min)

See `engine/README_HF_SPACE.md` for the step-by-step. The `Dockerfile` already works as-is.

After deploy you'll have a public URL like:
```
https://<username>-sentinel-engine.hf.space
```

Set this as `ENGINE_URL` on Render in the next step.

---

## 3. Gateway on Render (5 min)

1. Sign up at https://render.com (free).
2. New → **Web Service** → connect your GitHub repo → pick the `sentinel` repo.
3. Render auto-detects `server/render.yaml`. Confirm:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
4. In **Environment**, set:
   - `MONGO_URI` = your Atlas SRV string
   - `ENGINE_URL` = your HF Spaces URL
5. Deploy. You'll get a URL like `https://sentinel-gateway.onrender.com`.

---

## 4. Client on Vercel (3 min)

1. Sign up at https://vercel.com (free, GitHub auth).
2. Add New → **Project** → import the same GitHub repo.
3. Configure:
   - Root directory: `client`
   - Framework: Vite (auto-detected)
4. Environment Variables:
   - `VITE_API_BASE_URL` = your Render gateway URL (e.g. `https://sentinel-gateway.onrender.com`)
5. Deploy.

You get a URL like `https://sentinel.vercel.app`.

---

## 5. Cold-start caveat

Render free tier sleeps after 15 min idle (~30 s cold start). HF Spaces free tier behaves similarly. Acceptable for portfolio demos; upgrade either tier for paid client work.

---

## Local-only quick start

```bash
docker compose up --build
# http://localhost:5173
```
