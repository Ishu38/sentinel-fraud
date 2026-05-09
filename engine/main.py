from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pipelines.infer import Scorer
from routes import health, score


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.scorer = Scorer.load_or_warn()
    yield


app = FastAPI(title="Fraud Detection Engine", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(score.router)
