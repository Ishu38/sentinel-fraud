from __future__ import annotations
from dataclasses import dataclass
import numpy as np
import pandas as pd

TARGET = "isFraud"
ID_COL = "TransactionID"

CATEGORICAL_BASE = [
    "ProductCD", "card4", "card6",
    "P_emaildomain", "R_emaildomain",
    "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9",
    "DeviceType", "DeviceInfo",
]


@dataclass
class FeatureArtifacts:
    """Stateful objects produced at training time and reused at inference."""
    feature_cols: list[str]
    categorical_cols: list[str]
    category_maps: dict[str, dict[str, int]]
    medians: dict[str, float]


def _hour_of_day(dt_seconds: pd.Series) -> pd.Series:
    return ((dt_seconds / 3600) % 24).astype("float32")


def _day_of_week(dt_seconds: pd.Series) -> pd.Series:
    return ((dt_seconds / (3600 * 24)) % 7).astype("float32")


def _email_provider(s: pd.Series) -> pd.Series:
    return s.fillna("missing").astype(str).str.split(".").str[0]


def engineer(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    if "TransactionDT" in out.columns:
        out["hour"] = _hour_of_day(out["TransactionDT"])
        out["dow"] = _day_of_week(out["TransactionDT"])

    if "TransactionAmt" in out.columns:
        out["amt_log"] = np.log1p(out["TransactionAmt"]).astype("float32")
        out["amt_decimal"] = (out["TransactionAmt"] - out["TransactionAmt"].astype(int)).astype("float32")

    for col in ("P_emaildomain", "R_emaildomain"):
        if col in out.columns:
            out[f"{col}_provider"] = _email_provider(out[col])

    if {"card1", "addr1"}.issubset(out.columns):
        out["card1_addr1"] = (
            out["card1"].astype(str) + "_" + out["addr1"].fillna(-1).astype(int).astype(str)
        )

    return out


def fit_transform(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, FeatureArtifacts]:
    df = engineer(df)
    y = df[TARGET].astype("int8")
    drop_cols = {TARGET, ID_COL}
    feature_cols = [c for c in df.columns if c not in drop_cols]

    categorical_cols = [
        c for c in feature_cols
        if df[c].dtype == object or c in CATEGORICAL_BASE or c.endswith("_provider") or c == "card1_addr1"
    ]
    numeric_cols = [c for c in feature_cols if c not in categorical_cols]

    medians = {c: float(df[c].median()) if pd.notna(df[c].median()) else 0.0 for c in numeric_cols}
    category_maps: dict[str, dict[str, int]] = {}
    X = pd.DataFrame(index=df.index)

    for c in numeric_cols:
        X[c] = df[c].fillna(medians[c]).astype("float32")

    for c in categorical_cols:
        s = df[c].fillna("missing").astype(str)
        cats = sorted(s.unique())
        mapping = {v: i for i, v in enumerate(cats)}
        category_maps[c] = mapping
        X[c] = s.map(mapping).astype("int32")

    artifacts = FeatureArtifacts(
        feature_cols=list(X.columns),
        categorical_cols=categorical_cols,
        category_maps=category_maps,
        medians=medians,
    )
    return X, y, artifacts


def transform(df: pd.DataFrame, artifacts: FeatureArtifacts) -> pd.DataFrame:
    df = engineer(df)
    X = pd.DataFrame(index=df.index)

    for c in artifacts.feature_cols:
        if c in artifacts.categorical_cols:
            mapping = artifacts.category_maps[c]
            s = df[c].fillna("missing").astype(str) if c in df.columns else pd.Series("missing", index=df.index)
            X[c] = s.map(mapping).fillna(mapping.get("missing", 0)).astype("int32")
        else:
            median = artifacts.medians.get(c, 0.0)
            s = df[c] if c in df.columns else pd.Series(median, index=df.index)
            X[c] = pd.to_numeric(s, errors="coerce").fillna(median).astype("float32")

    return X[artifacts.feature_cols]
