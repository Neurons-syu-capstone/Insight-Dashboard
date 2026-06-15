"""
AI 컨설턴트 라우터
원본: Review-Consultant-AI/backend/api_server.py (Flask → FastAPI 변환)

필요 환경변수:
  OPENAI_API_KEY  — OpenAI API 키
  OPENAI_MODEL    — 사용할 모델 (기본값: gpt-4o-mini)
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

_scores:    dict       = {}
_sentences: list[dict] = []

CATEGORIES = ["comfort", "design", "size", "durability", "price"]
CAT_KR = {
    "comfort":    "착용감",
    "design":     "디자인",
    "size":       "사이즈",
    "durability": "내구성",
    "price":      "가격",
}
CAT_EMOJI = {
    "comfort":    "🦶",
    "design":     "🎨",
    "size":       "📏",
    "durability": "🔩",
    "price":      "💰",
}


def startup(scores_path: str, sentences_path: str) -> int:
    global _scores, _sentences

    sp = Path(scores_path)
    if sp.exists():
        with open(sp, encoding="utf-8") as f:
            _scores = json.load(f)
        logger.info(f"Consultant scores 로딩: {len(_scores):,}개 상품")
    else:
        logger.warning(f"scores 파일 없음: {scores_path}")

    sep = Path(sentences_path)
    if sep.exists():
        with open(sep, encoding="utf-8") as f:
            _sentences = json.load(f)
        logger.info(f"Consultant sentences 로딩: {len(_sentences):,}건")
    else:
        logger.warning(f"sentences 파일 없음: {sentences_path}")

    return len(_scores)


def _get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
    from openai import OpenAI
    return OpenAI(api_key=api_key)


def _score_status(score: float) -> str:
    if score < 4:
        return "위험"
    if score < 7:
        return "주의"
    return "양호"


# ── 브랜드 목록 ───────────────────────────────────────────────────
@router.get("/brands")
def get_brands():
    brands = sorted({info.get("brand", "") for info in _scores.values() if info.get("brand")})
    return brands


# ── 상품 목록 ─────────────────────────────────────────────────────
@router.get("/products")
def get_products(brand: Optional[str] = None, search: Optional[str] = None):
    products = []
    for asin, info in _scores.items():
        if brand and info.get("brand") != brand:
            continue
        if search and search.lower() not in info.get("product_title", "").lower():
            continue

        scores = info.get("scores", {})
        product = {
            "asin":          asin,
            "brand":         info.get("brand", "Unknown"),
            "product_title": info.get("product_title", ""),
            "avg_rating":    info.get("avg_rating"),
            "review_count":  info.get("review_count", 0),
        }
        for cat in CATEGORIES:
            s = scores.get(cat, {})
            product[f"{cat}_score"]     = s.get("score")
            product[f"{cat}_pos_count"] = s.get("pos_count", s.get("positive", 0))
            product[f"{cat}_neg_count"] = s.get("neg_count", s.get("negative", 0))
        products.append(product)

    return products


# ── 속성별 점수 개요 (GPT 없음) ───────────────────────────────────
@router.get("/overview/{asin}")
def get_overview(asin: str):
    info = _scores.get(asin)
    if not info:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")

    scores = info.get("scores", {})
    result = []
    for cat in CATEGORIES:
        s     = scores.get(cat, {})
        score = s.get("score")
        if score is None:
            continue
        result.append({
            "category": cat,
            "cat_kr":   CAT_KR[cat],
            "emoji":    CAT_EMOJI[cat],
            "score":    score,
            "pos":      s.get("pos_count", s.get("positive", 0)),
            "neg":      s.get("neg_count", s.get("negative", 0)),
            "status":   _score_status(score),
        })

    return result


# ── 전체 속성 종합 AI 진단 ───────────────────────────────────────
class OverviewDiagnoseRequest(BaseModel):
    asin: str


@router.post("/diagnose/overview")
def diagnose_overview(body: OverviewDiagnoseRequest):
    asin   = body.asin
    info   = _scores.get(asin, {})
    title  = info.get("product_title", "")
    scores = info.get("scores", {})

    score_lines = []
    for cat in CATEGORIES:
        s  = scores.get(cat, {})
        sc = s.get("score")
        if sc is not None:
            score_lines.append(f"- {CAT_KR[cat]}: {sc:.1f}/10점")

    neg_sents = [
        s for s in _sentences
        if str(s.get("asin")) == str(asin) and s.get("sentiment") == "negative"
    ]

    if not neg_sents:
        raise HTTPException(status_code=400, detail="분석할 부정 리뷰 데이터가 없습니다.")

    ev_col = "evidence" if neg_sents and "evidence" in neg_sents[0] else "sentence_en"
    review_samples = "\n".join(
        f"- [{CAT_KR.get(s.get('category', ''), s.get('category', ''))}] {s.get(ev_col, '')}"
        for s in neg_sents[:15]
    )

    prompt = f"""당신은 이커머스 신발 판매자를 위한 상품 품질 분석 전문가입니다.
아래는 '{title}'의 속성별 만족도 점수와 고객 부정 리뷰입니다.

[속성별 점수]
{chr(10).join(score_lines)}

[고객 부정 리뷰 샘플]
{review_samples}

전체 속성을 종합하여 아래 형식으로 한국어로 분석해주세요.
절대로 마크다운 문법(**굵게**, *기울임* 등)을 사용하지 마세요. 일반 텍스트로만 작성하세요.

⚡ 가장 시급한 문제
(단 하나의 가장 중요한 문제를 한 문장으로)

📋 속성별 개선 우선순위
1위: 속성명 — 이유
2위: 속성명 — 이유
3위: 속성명 — 이유
4위: 속성명 — 이유
5위: 속성명 — 이유

💊 즉시 실행 가이드라인
1. (가장 먼저 해야 할 것)
2. (그 다음)
3. (장기적으로)"""

    client = _get_client()
    model  = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "당신은 이커머스 상품 품질 분석 전문가입니다."},
                {"role": "user",   "content": prompt},
            ],
            max_completion_tokens=600,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    raw    = response.choices[0].message.content or ""
    tokens = response.usage.total_tokens
    cost   = (response.usage.prompt_tokens / 1_000_000 * 0.75
              + response.usage.completion_tokens / 1_000_000 * 4.50)

    sections: dict[str, object] = {}
    lines = raw.splitlines()
    cur_key, buf = None, []

    MARKERS = {
        "⚡": "urgent",
        "📋": "priority",
        "💊": "guidelines",
    }

    def _flush():
        if cur_key is None:
            return
        text = "\n".join(buf).strip()
        if cur_key in ("guidelines", "priority"):
            sections[cur_key] = [l for l in text.splitlines() if l.strip()]
        else:
            sections[cur_key] = text

    for line in lines:
        matched = next((v for k, v in MARKERS.items() if line.startswith(k)), None)
        if matched:
            _flush()
            cur_key, buf = matched, []
        else:
            buf.append(line)
    _flush()

    return {
        "sections": sections,
        "usage":    {"tokens": tokens, "cost": round(cost, 5)},
    }


# ── 속성별 AI 진단 ────────────────────────────────────────────────
class DiagnoseRequest(BaseModel):
    asin:     str
    category: str


@router.post("/diagnose")
def diagnose(body: DiagnoseRequest):
    asin = body.asin
    cat  = body.category

    info   = _scores.get(asin, {})
    title  = info.get("product_title", "")
    scores = info.get("scores", {})
    sc     = scores.get(cat, {}).get("score", 0) or 0

    neg_sents = [
        s for s in _sentences
        if str(s.get("asin")) == str(asin)
        and s.get("category") == cat
        and s.get("sentiment") == "negative"
    ]

    if not neg_sents:
        raise HTTPException(status_code=400, detail="분석할 부정 리뷰 데이터가 없습니다.")

    ev_col = "evidence" if neg_sents and "evidence" in neg_sents[0] else "sentence_en"
    review_block = "\n".join(f"- {s.get(ev_col, '')}" for s in neg_sents[:10])

    prompt = f"""당신은 이커머스 신발 판매자를 위한 상품 품질 분석 전문가입니다.
아래는 '{title}'의 [{CAT_KR.get(cat, cat)}] 속성 관련 고객 부정 리뷰입니다.
현재 [{CAT_KR.get(cat, cat)}] 만족도 점수: {sc:.1f}/10점

[부정 리뷰]
{review_block}

다음 형식으로 한국어로 분석해주세요.
절대로 마크다운 문법(**굵게**, *기울임* 등)을 사용하지 마세요. 일반 텍스트로만 작성하세요.

🔍 진단 요약
(반복되는 문제 패턴과 고객 불만의 핵심을 2~3문장으로)

⚡ 가장 시급한 문제
(단 하나의 가장 중요한 문제를 한 문장으로)

💊 운영 개선 가이드라인
1. (즉시 조치 가능한 개선안)
2. (중기적 개선안)
3. (장기적 개선안)

📊 예상 효과
(개선 시 기대할 수 있는 구체적 효과)"""

    client = _get_client()
    model  = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "당신은 이커머스 상품 품질 분석 전문가입니다."},
                {"role": "user",   "content": prompt},
            ],
            max_completion_tokens=700,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    raw    = response.choices[0].message.content or ""
    tokens = response.usage.total_tokens
    cost   = (response.usage.prompt_tokens / 1_000_000 * 0.75
              + response.usage.completion_tokens / 1_000_000 * 4.50)

    # 섹션 파싱
    sections: dict[str, object] = {}
    lines = raw.splitlines()
    cur_key, buf = None, []

    MARKERS = {
        "🔍": "diagnosis",
        "⚡": "urgent",
        "💊": "guidelines",
        "📊": "effect",
    }

    def _flush():
        if cur_key is None:
            return
        text = "\n".join(buf).strip()
        if cur_key == "guidelines":
            sections["guidelines"] = [l for l in text.splitlines() if l.strip()]
        else:
            sections[cur_key] = text

    for line in lines:
        matched = next((v for k, v in MARKERS.items() if line.startswith(k)), None)
        if matched:
            _flush()
            cur_key, buf = matched, []
        else:
            buf.append(line)
    _flush()

    return {
        "sections": sections,
        "cat_kr":   CAT_KR.get(cat, cat),
        "score":    sc,
        "usage":    {"tokens": tokens, "cost": round(cost, 5)},
    }
