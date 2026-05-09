from __future__ import annotations
import json
import time
from pathlib import Path

import joblib
import numpy as np
import xgboost as xgb
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split

from .features import fit_transform
from .ingest import load_ieee_cis

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    print("[train] loading IEEE-CIS train split…")
    df = load_ieee_cis("train")
    print(f"[train] rows={len(df):,} cols={df.shape[1]} fraud_rate={df['isFraud'].mean():.4%}")

    print("[train] feature engineering…")
    X, y, artifacts = fit_transform(df)

    X_tr, X_va, y_tr, y_va = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )
    pos_weight = float((y_tr == 0).sum()) / max(int((y_tr == 1).sum()), 1)
    print(f"[train] scale_pos_weight={pos_weight:.2f}")

    model = xgb.XGBClassifier(
        n_estimators=600,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=pos_weight,
        eval_metric="aucpr",
        tree_method="hist",
        n_jobs=-1,
        early_stopping_rounds=30,
    )

    t0 = time.time()
    model.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=50)
    elapsed = time.time() - t0

    p_va = model.predict_proba(X_va)[:, 1]
    auc = roc_auc_score(y_va, p_va)
    ap = average_precision_score(y_va, p_va)
    print(f"[train] done in {elapsed:.1f}s  AUC={auc:.4f}  AP={ap:.4f}")

    model_path = MODELS_DIR / "xgb.json"
    artifacts_path = MODELS_DIR / "artifacts.pkl"
    meta_path = MODELS_DIR / "meta.json"

    model.save_model(str(model_path))
    joblib.dump(artifacts, artifacts_path)

    threshold = float(np.quantile(p_va, 0.99))
    meta = {
        "model_version": time.strftime("xgb-%Y%m%d-%H%M%S"),
        "auc": auc,
        "average_precision": ap,
        "threshold": threshold,
        "n_features": len(artifacts.feature_cols),
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"[train] wrote {model_path.name}, {artifacts_path.name}, {meta_path.name}")
    print(f"[train] suggested threshold (P99 of val scores) = {threshold:.4f}")


if __name__ == "__main__":
    main()
