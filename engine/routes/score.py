from fastapi import APIRouter, HTTPException, Request

from schemas import ScoreResponse, Transaction

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
async def score(tx: Transaction, request: Request) -> ScoreResponse:
    scorer = getattr(request.app.state, "scorer", None)
    if scorer is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run `python -m pipelines.train` first.",
        )

    prob, is_fraud = scorer.score(tx)
    return ScoreResponse(
        transaction_id=tx.TransactionID,
        fraud_probability=prob,
        is_fraud=is_fraud,
        threshold=scorer.threshold,
        model_version=scorer.version,
    )
