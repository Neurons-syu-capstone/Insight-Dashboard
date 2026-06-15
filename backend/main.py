"""
Insight Dashboard 통합 백엔드
실행: uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.scoreboard.routers import products as scoreboard_products
from src.scoreboard.routers import sentences as scoreboard_sentences
from src.risk_radar import router as rr_module
from src.risk_radar.router import router as rr_router
from src.sum_map import router as sm_module
from src.sum_map.router import router as sm_router
from src.consultant import router as cs_module
from src.consultant.router import router as cs_router

DATA_PATH       = os.getenv("DATA_PATH",       "data/shoes_sample.json")
RESULTS_PATH    = os.getenv("RESULTS_PATH",    "data/results.json")
SCORES_PATH     = os.getenv("SCORES_PATH",     "data/llm_scores_by_product.json")
SENTENCES_PATH  = os.getenv("SENTENCES_PATH",  "data/llm_sentences.json")


@asynccontextmanager
async def lifespan(app: FastAPI):
    count = rr_module.startup(DATA_PATH)
    print(f"✅ RiskRadar 초기화 완료 | 상품 수: {count}")
    sm_count = sm_module.startup(DATA_PATH, RESULTS_PATH)
    print(f"✅ SumMap 초기화 완료 | 상품 수: {sm_count}")
    cs_count = cs_module.startup(SCORES_PATH, SENTENCES_PATH)
    print(f"✅ Consultant 초기화 완료 | 상품 수: {cs_count}")
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
app.include_router(sm_router, prefix="/api/sum-map", tags=["sum-map"])
app.include_router(cs_router, prefix="/api/consultant", tags=["consultant"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Insight Dashboard API"}
