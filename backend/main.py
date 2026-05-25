"""
Insight Dashboard 통합 백엔드
실행: uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.scoreboard.routers import products as scoreboard_products
from src.scoreboard.routers import sentences as scoreboard_sentences
from src.risk_radar import router as rr_module
from src.risk_radar.router import router as rr_router

DATA_PATH = os.getenv("DATA_PATH", "data/shoes_sample.json")


@asynccontextmanager
async def lifespan(app: FastAPI):
    count = rr_module.startup(DATA_PATH)
    print(f"✅ RiskRadar 초기화 완료 | 상품 수: {count}")
    yield


app = FastAPI(title="Insight Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scoreboard_products.router, prefix="/api/scoreboard/products", tags=["scoreboard"])
app.include_router(scoreboard_sentences.router, prefix="/api/scoreboard/sentences", tags=["scoreboard"])
app.include_router(rr_router, prefix="/api/risk-radar", tags=["risk-radar"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Insight Dashboard API"}
