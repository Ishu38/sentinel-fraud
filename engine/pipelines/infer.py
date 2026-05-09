from __future__ import annotations
import json
from pathlib import Path

import joblib
import pandas as pd
import xgboost as xgb

from schemas import Transaction
from .features import FeatureArtifacts, transform

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


class Scorer:
    def __init__(
        self,
        model: xgb.XGBClassifier,
        artifacts: FeatureArtifacts,
        threshold: float,
        version: str,
    ) -> None:
        self.model = model
        self.artifacts = artifacts
        self.threshold = threshold
        self.version = version

    @classmethod
    def load_or_warn(cls) -> "Scorer | None":
        model_path = MODELS_DIR / "xgb.json"
        artifacts_path = MODELS_DIR / "artifacts.pkl"
        meta_path = MODELS_DIR / "meta.json"
        if not (model_path.exists() and artifacts_path.exists()):
            print("[infer] no trained model found — /score will return 503 until training completes")
            return None

        model = xgb.XGBClassifier()
        model.load_model(str(model_path))
        artifacts: FeatureArtifacts = joblib.load(artifacts_path)
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        return cls(
            model=model,
            artifacts=artifacts,
            threshold=float(meta.get("threshold", 0.5)),
            version=str(meta.get("model_version", "unversioned")),
        )

    def score(self, tx: Transaction) -> tuple[float, bool]:
        row = tx.model_dump()
        extra = row.pop("extra", {}) or {}
        row.update(extra)
        df = pd.DataFrame([row])
        X = transform(df, self.artifacts)
        p = float(self.model.predict_proba(X)[:, 1][0])
        return p, p >= self.threshold
