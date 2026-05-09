from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict:
    scorer = getattr(request.app.state, "scorer", None)
    return {
        "status": "ok",
        "model_loaded": scorer is not None,
        "model_version": scorer.version if scorer else None,
    }
