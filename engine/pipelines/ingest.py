from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_ieee_cis(split: str = "train") -> pd.DataFrame:
    """Merge IEEE-CIS transaction + identity tables on TransactionID.
    Identity is left-joined; ~75% of transactions have no identity row."""

    tx_path = DATA_DIR / f"{split}_transaction.csv"
    id_path = DATA_DIR / f"{split}_identity.csv"
    if not tx_path.exists():
        raise FileNotFoundError(
            f"Missing {tx_path}. Download IEEE-CIS Fraud Detection from Kaggle "
            f"and place CSVs in {DATA_DIR}."
        )

    tx = pd.read_csv(tx_path)
    if id_path.exists():
        ident = pd.read_csv(id_path)
        df = tx.merge(ident, on="TransactionID", how="left")
    else:
        df = tx
    return df
