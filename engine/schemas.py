from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class Transaction(BaseModel):
    """Single IEEE-CIS-shaped transaction. All fields optional except amount;
    the feature pipeline imputes anything missing. Extra fields (V1..V339,
    C1..C14, D1..D15, M*, identity columns) are accepted and forwarded."""

    model_config = ConfigDict(extra="allow")

    TransactionID: int | None = None
    TransactionDT: int | None = None
    TransactionAmt: float = Field(..., ge=0)
    ProductCD: str | None = None
    card1: int | None = None
    card2: float | None = None
    card3: float | None = None
    card4: str | None = None
    card5: float | None = None
    card6: str | None = None
    addr1: float | None = None
    addr2: float | None = None
    dist1: float | None = None
    dist2: float | None = None
    P_emaildomain: str | None = None
    R_emaildomain: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class ScoreResponse(BaseModel):
    transaction_id: int | None
    fraud_probability: float
    is_fraud: bool
    threshold: float
    model_version: str
