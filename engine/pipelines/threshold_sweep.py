"""Honest threshold sweep on a held-out split (re-splits with the same seed
as train.py so we score points the model never saw)."""
from __future__ import annotations
import joblib
import numpy as np
import xgboost as xgb
from pathlib import Path
from sklearn.metrics import precision_recall_fscore_support
from sklearn.model_selection import train_test_split

from .features import fit_transform
from .ingest import load_ieee_cis

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def main() -> None:
    df = load_ieee_cis("train")
    X, y, _ = fit_transform(df)
    _, X_va, _, y_va = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)

    model = xgb.XGBClassifier()
    model.load_model(str(MODELS_DIR / "xgb.json"))
    p = model.predict_proba(X_va)[:, 1]

    print(f"holdout: n={len(y_va):,}  fraud={int(y_va.sum()):,}  rate={y_va.mean():.4%}")
    print(f"\n{'thr':>6} {'flagged':>8} {'flag%':>7} {'prec':>7} {'recall':>7} {'F1':>7}")
    for thr in (0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 0.95, 0.99):
        pred = (p >= thr).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_va, pred, average="binary", zero_division=0
        )
        print(f"{thr:>6.2f} {int(pred.sum()):>8d} {pred.mean()*100:>6.2f}% {prec:>7.4f} {rec:>7.4f} {f1:>7.4f}")

    for target_rec in (0.50, 0.60, 0.70, 0.80):
        idx = np.argsort(p)[::-1]
        cum_pos = np.cumsum(y_va.values[idx])
        total_pos = int(y_va.sum())
        k = int(np.searchsorted(cum_pos, total_pos * target_rec) + 1)
        thr = float(p[idx[k - 1]])
        flagged = k
        precision = cum_pos[k - 1] / k
        print(f"recall {target_rec:.0%} -> threshold {thr:.4f}  flag {flagged:,} ({flagged/len(y_va):.2%})  precision {precision:.4f}")


if __name__ == "__main__":
    main()
