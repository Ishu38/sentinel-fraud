# IEEE-CIS Fraud Detection — data

Place these files here:

```
train_transaction.csv
train_identity.csv
test_transaction.csv      # optional
test_identity.csv         # optional
```

## Download

Kaggle CLI:

```bash
kaggle competitions download -c ieee-fraud-detection -p .
unzip -o ieee-fraud-detection.zip
```

You must accept the competition rules on Kaggle once before the CLI will let you download.

## Schema notes

- `train_transaction.csv` — ~590k rows, 394 columns. Target is `isFraud`. Class balance ~3.5% positive.
- `train_identity.csv` — ~144k rows, 41 columns. Joined to transactions on `TransactionID`. ~75% of transactions have no identity row, which is expected.
- Anonymized blocks: `C1..C14` (counts), `D1..D15` (timedeltas in days), `M1..M9` (match flags), `V1..V339` (Vesta engineered features).
