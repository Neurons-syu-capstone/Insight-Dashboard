"""
Sum Map 키워드 검색 API 라우터
원본: Review-Sum-Map/backend/api_server.py
"""

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter()

_reviews: list[dict] = []
_results: list[dict] = []
_brand_map: dict[str, str] = {}


def startup(reviews_path: str, results_path: str) -> int:
    global _reviews, _results, _brand_map

    rp = Path(reviews_path)
    if rp.exists():
        with open(rp, encoding="utf-8") as f:
            _reviews = json.load(f)
        logger.info(f"SumMap 리뷰 로딩: {len(_reviews):,}건")
    else:
        logger.warning(f"리뷰 파일 없음: {reviews_path}")

    rsp = Path(results_path)
    if rsp.exists():
        with open(rsp, encoding="utf-8") as f:
            _results = json.load(f)
        logger.info(f"SumMap results 로딩: {len(_results):,}개 상품")
    else:
        logger.warning(f"results 파일 없음: {results_path}")

    _brand_map = {}
    for r in _reviews:
        pid = r.get("parent_asin") or r.get("asin")
        if pid and pid not in _brand_map:
            b = r.get("brand", "")
            if b:
                _brand_map[pid] = b

    return len(_results)


@router.get("/brands")
def get_brands():
    result_ids = {p.get("product_id") for p in _results}
    brands = sorted({_brand_map.get(pid, "") for pid in result_ids} - {""})
    return brands


@router.get("/products")
def get_products_list(brand: str = Query(None), search: str = Query(None)):
    products = [{
        "product_id":     p.get("product_id", ""),
        "product_name":   p.get("product_name", ""),
        "brand":          _brand_map.get(p.get("product_id", ""), ""),
        "average_rating": p.get("average_rating", 0),
        "review_count":   p.get("review_count", 0),
    } for p in _results]

    if brand and brand != "전체":
        products = [p for p in products if p["brand"] == brand]
    if search:
        s = search.lower()
        products = [p for p in products if s in p["product_name"].lower() or s in p["brand"].lower()]

    return products


def _matches_keyword(text: str, keyword: str) -> bool:
    STOPWORDS = {"is", "the", "a", "an", "in", "of", "for", "to", "and", "or", "on", "at", "my", "me"}
    text_lower = text.lower()
    words = [w for w in keyword.lower().split() if w not in STOPWORDS]
    if not words:
        return keyword.lower() in text_lower
    return all(w in text_lower for w in words)


def _get_aspect_review_ids(product_id: str, aspect: str) -> set[str]:
    for p in _results:
        if p.get("product_id") == product_id:
            data = p.get("aspect_analysis", {}).get(aspect, {})
            return {
                r["text"][:60]
                for r in (data.get("representative_reviews") or [])
                if r.get("text")
            }
    return set()


@router.get("/keyword-counts")
def keyword_counts(product_id: str = Query(..., description="상품 parent_asin")):
    product_result = next((p for p in _results if p.get("product_id") == product_id), None)
    if not product_result:
        return {"product_id": product_id, "counts": {}}

    product_reviews = [
        r for r in _reviews
        if (r.get("parent_asin") or r.get("asin")) == product_id
    ]
    if not product_reviews:
        return {"product_id": product_id, "counts": {}}

    all_keywords: set[str] = set()
    for aspect_data in product_result.get("aspect_analysis", {}).values():
        if not aspect_data:
            continue
        for kw in (aspect_data.get("issue_keywords") or []):
            if kw:
                all_keywords.add(kw)
        for kw in (aspect_data.get("strength_keywords") or []):
            if kw:
                all_keywords.add(kw)

    counts = {
        kw: sum(1 for r in product_reviews if _matches_keyword(r.get("text") or "", kw))
        for kw in all_keywords
    }
    return {"product_id": product_id, "counts": counts}


@router.get("/search")
def search_reviews(
    keyword:    str           = Query(..., description="검색할 키워드"),
    product_id: str           = Query(..., description="상품 parent_asin"),
    limit:      int           = Query(30,  description="최대 반환 수"),
    aspect:     Optional[str] = Query(None, description="aspect 필터"),
):
    product_reviews = [
        r for r in _reviews
        if (r.get("parent_asin") or r.get("asin")) == product_id
        and _matches_keyword(r.get("text") or "", keyword)
    ]

    if aspect:
        aspect_keys = _get_aspect_review_ids(product_id, aspect)
        if aspect_keys:
            product_reviews = [r for r in product_reviews if (r.get("text") or "")[:60] in aspect_keys]

    def _parse_date(r):
        return r.get("review_date") or r.get("reviewTime") or ""

    product_reviews.sort(key=_parse_date, reverse=True)
    product_reviews = product_reviews[:limit]

    results = []
    for r in product_reviews:
        rating = float(r.get("rating") or r.get("overall") or 0)
        results.append({
            "text":              r.get("text") or "",
            "date":              (r.get("review_date") or r.get("reviewTime") or "")[:10],
            "rating":            rating,
            "helpful_vote":      int(r.get("helpful_vote") or 0),
            "verified_purchase": bool(r.get("verified_purchase", False)),
            "sentiment":         "issue" if rating <= 2 else "strength",
        })

    return {
        "keyword":    keyword,
        "product_id": product_id,
        "aspect":     aspect,
        "total":      len(results),
        "reviews":    results,
    }
