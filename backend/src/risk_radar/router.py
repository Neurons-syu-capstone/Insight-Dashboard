import os
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from .risk_radar import RiskRadar
from .detectors.keyword_detector import ATTRIBUTE_KEYWORDS

router = APIRouter()
_radar: Optional[RiskRadar] = None


def startup(data_path: str) -> int:
    """앱 시작 시 호출 — 데이터 로딩 후 RiskRadar 초기화."""
    global _radar
    df = _load_data(data_path)
    _radar = RiskRadar(df)
    return len(_radar.processor.get_products())


def _get_radar() -> RiskRadar:
    if _radar is None:
        raise RuntimeError("RiskRadar가 초기화되지 않았습니다.")
    return _radar


def _load_data(data_path: str) -> pd.DataFrame:
    if os.path.exists(data_path):
        if data_path.endswith(".parquet"):
            df = pd.read_parquet(data_path)
        elif data_path.endswith(".json"):
            df = pd.read_json(data_path, convert_dates=False)
        else:
            df = pd.read_csv(data_path)
        return _normalize_columns(df)

    print("⚠️  실제 데이터 없음 → 목업 데이터로 실행합니다.")
    return _mock_data()


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    if "review_date" in df.columns and "timestamp" not in df.columns:
        df = df.rename(columns={"review_date": "timestamp"})
        parsed = pd.to_datetime(df["timestamp"], errors="coerce")
        if parsed.notna().any():
            df["timestamp"] = parsed
        else:
            df["timestamp"] = pd.to_datetime(
                pd.to_numeric(df["timestamp"], errors="coerce"), unit="ms", errors="coerce"
            )
        df = df.dropna(subset=["timestamp"])
        df["timestamp"] = df["timestamp"].astype("int64") // 10 ** 9

    if "product_title" in df.columns:
        df = df.drop(columns=["title"], errors="ignore")
        df = df.rename(columns={"product_title": "title"})

    return df


def _mock_data() -> pd.DataFrame:
    rng = np.random.default_rng(42)

    products = [
        ("B001NIK001", "Nike Air Max 270"),
        ("B001NIK002", "Nike Revolution 6"),
        ("B001ADI001", "Adidas Ultraboost 22"),
        ("B001ADI002", "Adidas Grand Court"),
        ("B001NB001",  "New Balance 574"),
        ("B001NB002",  "New Balance Fresh Foam 1080"),
        ("B001CRO001", "Crocs Classic Clog"),
        ("B001CRO002", "Crocs LiteRide"),
        ("B001SKE001", "Skechers Go Walk 6"),
        ("B001SKE002", "Skechers Max Cushioning"),
    ]

    rows = []
    neg_keywords = ["too narrow", "size issue", "fell apart", "broke",
                    "uncomfortable", "returned", "tight", "blister"]

    for parent_asin, title in products:
        n = rng.integers(800, 1200)
        timestamps = pd.date_range("2018-01-01", "2023-12-31", periods=n)
        is_post_2021 = timestamps >= pd.Timestamp("2021-01-01")

        ratings = rng.choice([1, 2, 3, 4, 5], size=n, p=[0.08, 0.07, 0.10, 0.25, 0.50])
        ratings = np.where(
            is_post_2021,
            np.clip(ratings - rng.integers(0, 2, n), 1, 5),
            ratings
        )

        def make_text(i):
            if is_post_2021[i] and rng.random() < 0.20:
                kw = rng.choice(neg_keywords)
                return f"Really disappointed. The shoe is {kw}. Would not buy again."
            if ratings[i] >= 4:
                return "Great shoes, very comfortable and good support."
            return "Decent shoes but not perfect."

        rows.extend(
            {
                "parent_asin": parent_asin,
                "title": title,
                "rating": float(ratings[i]),
                "text": make_text(i),
                "timestamp": int(timestamps[i].timestamp()),
            }
            for i in range(n)
        )

    return pd.DataFrame(rows)


@router.get("/meta")
def get_meta():
    radar = _get_radar()
    min_d, max_d = radar.processor.get_date_range()
    return {
        "products": radar.processor.get_products(),
        "date_range": {"min": min_d, "max": max_d},
        "attributes": list(ATTRIBUTE_KEYWORDS.keys()),
    }


@router.get("/alerts/{product_id}")
def get_alerts(
    product_id: str,
    reference_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    window_days: int = Query(90, ge=30, le=365),
):
    radar = _get_radar()
    alerts = radar.scan(product_id, reference_date=reference_date, window_days=window_days)
    return {
        "product_id": product_id,
        "reference_date": reference_date,
        "window_days": window_days,
        "alerts": [vars(a) for a in alerts],
    }


@router.get("/trend/rating/{product_id}")
def get_rating_trend(product_id: str):
    radar = _get_radar()
    return {"product_id": product_id, "trend": radar.rating_trend(product_id)}


@router.get("/trend/keyword/{product_id}/{attribute}")
def get_keyword_trend(product_id: str, attribute: str):
    radar = _get_radar()
    if attribute not in ATTRIBUTE_KEYWORDS:
        raise HTTPException(status_code=404, detail=f"Unknown attribute: {attribute}")
    return {
        "product_id": product_id,
        "attribute": attribute,
        "trend": radar.keyword_trend(product_id, attribute),
    }
