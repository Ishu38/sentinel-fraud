from __future__ import annotations
import json
from pathlib import Path

import joblib
import numpy as np
import xgboost as xgb
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)

from .features import transform
from .ingest import load_ieee_cis

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def main() -> None:
    artifacts = joblib.load(MODELS_DIR / "artifacts.pkl")
    model = xgb.XGBClassifier()
    model.load_model(str(MODELS_DIR / "xgb.json"))
    meta = json.loads((MODELS_DIR / "meta.json").read_text())
    threshold = meta.get("threshold", 0.5)

    df = load_ieee_cis("train")
    sample = df.sample(min(50_000, len(df)), random_state=7)
    y = sample["isFraud"].astype("int8")
    X = transform(sample, artifacts)
    p = model.predict_proba(X)[:, 1]
    pred = (p >= threshold).astype(int)

    print(f"AUC={roc_auc_score(y, p):.4f}  AP={average_precision_score(y, p):.4f}")
    print(f"threshold={threshold:.4f}")
    print("confusion_matrix:")
    print(confusion_matrix(y, pred))
    print(classification_report(y, pred, digits=4))


if __name__ == "__main__":
    main()
