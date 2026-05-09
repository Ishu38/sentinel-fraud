# Deploying the engine to Hugging Face Spaces (Docker SDK)

The `Dockerfile` in this directory is HF-Spaces compatible. The model artifacts in `models/` should be committed to the Space repo (or downloaded at startup if you'd rather not commit binaries).

## One-time setup

1. Train the model locally and produce `models/xgb.json`, `models/artifacts.pkl`, `models/meta.json`.
2. Create a new Space on https://huggingface.co/new-space
   - SDK: **Docker**
   - Hardware: **CPU basic** (free)
3. Clone the Space repo and copy the contents of `engine/` (excluding `data/`, `.venv/`) into it.
4. `git add . && git commit -m "init engine" && git push`

## Required Space file: README.md frontmatter

Hugging Face needs a Space metadata block. Create `README.md` in the Space root:

```markdown
---
title: Sentinel Fraud Engine
emoji: 🛡️
colorFrom: blue
colorTo: red
sdk: docker
app_port: 8000
pinned: false
---

FastAPI fraud-scoring service for the Sentinel dashboard.
```

After push, the Space builds the Dockerfile and exposes the engine at:

```
https://<your-username>-<space-name>.hf.space
```

Set this URL as `ENGINE_URL` on the Render-deployed gateway.

## Notes

- HF Spaces sleep after inactivity on the free tier — the first request after sleep takes ~10 s. For demo purposes, fine. For production, upgrade to a paid hardware tier.
- The model artifacts (`xgb.json` ~5 MB, `artifacts.pkl` ~30 KB) commit cleanly to git.
- Do **not** commit `data/*.csv` — those are 1.3 GB and HF rejects pushes >5 GB.
