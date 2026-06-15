# API 명세서

> Base URL: `http://localhost:8000`  
> 전체 Swagger UI: `http://localhost:8000/docs`  
> OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## 공통

### 속성(Category) 코드표

| 코드 | 한국어 | 이모지 |
|---|---|---|
| `comfort` | 착용감 | 🦶 |
| `design` | 디자인 | 🎨 |
| `size` | 사이즈 | 📏 |
| `durability` | 내구성 | 🔩 |
| `price` | 가격 | 💰 |

### 점수 기준

| 범위 | 상태 |
|---|---|
| 7.0 ~ 10.0 | 양호 |
| 4.0 ~ 6.9 | 주의 |
| 0.0 ~ 3.9 | 위험 |
| `null` | 데이터 없음 |

---

## 스코어보드 (`/api/scoreboard`)

### `GET /api/scoreboard/products`

브랜드·검색어 필터링 상품 목록과 속성별 만족도 점수를 반환합니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `brand` | string | 선택 | 브랜드명 필터 (정확히 일치) |
| `search` | string | 선택 | 상품명 부분 검색 (대소문자 무시) |

**Response** `200 OK`

```json
[
  {
    "asin": "B09ABC1234",
    "brand": "Nike",
    "product_title": "Nike Air Max 270",
    "avg_rating": 4.3,
    "review_count": 1842,
    "scores": {
      "comfort":    { "score": 7.8, "count": 320, "pos_count": 249, "neg_count": 71 },
      "design":     { "score": 8.5, "count": 210, "pos_count": 179, "neg_count": 31 },
      "size":       { "score": 5.2, "count": 180, "pos_count":  94, "neg_count": 86 },
      "durability": { "score": 6.1, "count": 150, "pos_count":  92, "neg_count": 58 },
      "price":      { "score": 4.8, "count": 120, "pos_count":  58, "neg_count": 62 }
    }
  }
]
```

---

### `GET /api/scoreboard/products/brands`

전체 브랜드 목록을 알파벳 순으로 반환합니다.

**Response** `200 OK`

```json
["ASICS", "Clarks", "Crocs", "KEEN", "Merrell", "Nike", "PUMA", "Skechers", "adidas"]
```

---

### `GET /api/scoreboard/products/{asin}`

단일 상품의 상세 점수를 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `asin` | string | 상품 ASIN (parent_asin) |

**Response** `200 OK` — `GET /api/scoreboard/products` 단일 항목과 동일한 구조

**Error** `404` — 상품을 찾을 수 없을 때

---

### `GET /api/scoreboard/sentences/{asin}`

상품의 속성별 분류 문장(리뷰 근거)을 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `asin` | string | 상품 ASIN |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `category` | string | 선택 | 속성 코드 (`comfort` / `design` / ...) |
| `sentiment` | string | 선택 | `positive` 또는 `negative` |

**Response** `200 OK`

```json
[
  {
    "asin": "B09ABC1234",
    "brand": "Nike",
    "product_title": "Nike Air Max 270",
    "evidence": "The cushioning is excellent and my feet never hurt.",
    "full_review": "I've been wearing these for 3 months...",
    "category": "comfort",
    "sentiment": "positive",
    "score": 1.0
  }
]
```

**Error** `404` — 상품 문장 데이터 없음

---

## 리스크 레이더 (`/api/risk-radar`)

### `GET /api/risk-radar/meta`

전체 상품 목록, 데이터 날짜 범위, 감지 대상 속성 목록을 반환합니다.

**Response** `200 OK`

```json
{
  "products": [
    { "product_id": "B09ABC1234", "title": "Nike Air Max 270", "brand": "Nike", "review_count": 1842 }
  ],
  "date_range": { "min": "2019-01-01", "max": "2023-12-31" },
  "attributes": ["comfort", "design", "size", "durability", "price"]
}
```

---

### `GET /api/risk-radar/alerts/{product_id}`

기준 날짜 이전 윈도우 구간과 이전 구간을 비교해 이상 패턴(경보)을 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `product_id` | string | 상품 parent_asin |

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `reference_date` | string | 데이터 최신 날짜 | 기준 날짜 (`YYYY-MM-DD`) |
| `window_days` | integer | `90` | 비교 윈도우 (30~365) |

**Response** `200 OK`

```json
{
  "product_id": "B09ABC1234",
  "reference_date": "2023-12-31",
  "window_days": 90,
  "alerts": [
    {
      "type": "keyword_surge",
      "level": "위험",
      "attribute": "size",
      "message": "부정 키워드 급증: 'too narrow' (+45%)",
      "current_ratio": 0.32,
      "previous_ratio": 0.22,
      "change": 0.10
    },
    {
      "type": "rating_drop",
      "level": "경고",
      "attribute": null,
      "message": "평점 하락: 4.3 → 3.8",
      "current_avg": 3.8,
      "previous_avg": 4.3,
      "change": -0.5
    }
  ]
}
```

**Alert level**

| `level` | 설명 |
|---|---|
| `위험` | 즉각 조치 필요 |
| `경고` | 주의 관찰 |
| `양호` | 정상 범위 |

---

### `GET /api/risk-radar/trend/rating/{product_id}`

월별 평균 평점 추이를 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `product_id` | string | 상품 parent_asin |

**Response** `200 OK`

```json
{
  "product_id": "B09ABC1234",
  "trend": [
    { "month": "2023-01", "avg_rating": 4.2, "count": 145 },
    { "month": "2023-02", "avg_rating": 4.0, "count": 132 }
  ]
}
```

---

### `GET /api/risk-radar/trend/keyword/{product_id}/{attribute}`

속성별 부정 키워드 비율 월별 추이를 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `product_id` | string | 상품 parent_asin |
| `attribute` | string | 속성 코드 |

**Response** `200 OK`

```json
{
  "product_id": "B09ABC1234",
  "attribute": "size",
  "trend": [
    { "month": "2023-01", "neg_ratio": 0.18, "count": 80 },
    { "month": "2023-02", "neg_ratio": 0.25, "count": 76 }
  ]
}
```

**Error** `404` — 존재하지 않는 속성 코드

---

## 리뷰 키워드 맵 (`/api/sum-map`)

### `GET /api/sum-map/brands`

리뷰 키워드 맵에 포함된 상품들의 브랜드 목록을 반환합니다.

**Response** `200 OK`

```json
["ASICS", "Crocs", "Nike", "Skechers"]
```

---

### `GET /api/sum-map/products`

브랜드·검색어 필터링 상품 목록을 반환합니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `brand` | string | 선택 | 브랜드명 필터 |
| `search` | string | 선택 | 상품명 부분 검색 |

**Response** `200 OK`

```json
[
  {
    "product_id": "B09ABC1234",
    "product_name": "Nike Air Max 270",
    "brand": "Nike",
    "average_rating": 4.3,
    "review_count": 1842
  }
]
```

---

### `GET /api/sum-map/keyword-counts`

상품의 모든 키워드(긍정+부정) 리뷰 출현 횟수를 반환합니다. 워드클라우드 크기 계산에 사용됩니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `product_id` | string | 필수 | 상품 parent_asin |

**Response** `200 OK`

```json
{
  "product_id": "B09ABC1234",
  "counts": {
    "comfortable": 312,
    "too narrow": 87,
    "great support": 145,
    "fell apart": 43
  }
}
```

---

### `GET /api/sum-map/search`

키워드를 포함하는 리뷰를 검색합니다. 워드클라우드 키워드 클릭 시 호출됩니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `keyword` | string | 필수 | — | 검색 키워드 |
| `product_id` | string | 필수 | — | 상품 parent_asin |
| `limit` | integer | 선택 | `30` | 최대 반환 수 |
| `aspect` | string | 선택 | — | 속성 코드 필터 |

**Response** `200 OK`

```json
{
  "keyword": "comfortable",
  "product_id": "B09ABC1234",
  "aspect": "comfort",
  "total": 12,
  "reviews": [
    {
      "text": "These shoes are incredibly comfortable for all-day wear.",
      "date": "2023-10-15",
      "rating": 5.0,
      "helpful_vote": 23,
      "verified_purchase": true,
      "sentiment": "strength"
    }
  ]
}
```

**`sentiment` 값**

| 값 | 조건 |
|---|---|
| `strength` | rating ≥ 3 |
| `issue` | rating ≤ 2 |

---

## AI 컨설턴트 (`/api/consultant`)

> `POST /diagnose` 및 `POST /diagnose/overview`는 OpenAI API를 호출합니다.  
> `OPENAI_API_KEY` 환경변수가 없으면 `503` 오류를 반환합니다.

### `GET /api/consultant/brands`

컨설턴트 데이터에 포함된 브랜드 목록을 반환합니다.

**Response** `200 OK`

```json
["ASICS", "Crocs", "Nike", "PUMA", "Skechers"]
```

---

### `GET /api/consultant/products`

브랜드·검색어 필터링 상품 목록과 속성별 점수를 반환합니다.

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `brand` | string | 선택 | 브랜드명 필터 |
| `search` | string | 선택 | 상품명 부분 검색 |

**Response** `200 OK`

```json
[
  {
    "asin": "B09ABC1234",
    "brand": "Nike",
    "product_title": "Nike Air Max 270",
    "avg_rating": 4.3,
    "review_count": 1842,
    "comfort_score": 7.8,  "comfort_pos_count": 249,  "comfort_neg_count": 71,
    "design_score": 8.5,   "design_pos_count": 179,   "design_neg_count": 31,
    "size_score": 5.2,     "size_pos_count": 94,      "size_neg_count": 86,
    "durability_score": 6.1, "durability_pos_count": 92, "durability_neg_count": 58,
    "price_score": 4.8,    "price_pos_count": 58,     "price_neg_count": 62
  }
]
```

---

### `GET /api/consultant/overview/{asin}`

GPT 없이 속성별 점수 개요 카드 데이터를 반환합니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `asin` | string | 상품 ASIN |

**Response** `200 OK`

```json
[
  {
    "category": "size",
    "cat_kr": "사이즈",
    "emoji": "📏",
    "score": 5.2,
    "pos": 94,
    "neg": 86,
    "status": "주의"
  }
]
```

**Error** `404` — 상품 없음

---

### `POST /api/consultant/diagnose/overview`

전체 속성을 종합해 GPT가 개선 우선순위와 실행 가이드라인을 생성합니다.

**Request Body**

```json
{ "asin": "B09ABC1234" }
```

**Response** `200 OK`

```json
{
  "sections": {
    "urgent": "사이즈 불일치 문제가 반품과 부정 리뷰의 주요 원인입니다.",
    "priority": [
      "1위: 사이즈 — 전체 부정 리뷰의 38%가 사이즈 문제를 지적",
      "2위: 내구성 — 장기 사용 후 밑창 분리 사례 다수",
      "3위: 가격 — 품질 대비 가격이 높다는 의견"
    ],
    "guidelines": [
      "1. 상품 페이지에 발볼 넓이 기준 사이즈 가이드 추가",
      "2. 내구성 관련 품질 검수 기준 강화",
      "3. 프리미엄 포지셔닝에 맞는 브랜드 스토리 강조"
    ]
  },
  "usage": { "tokens": 842, "cost": 0.00391 }
}
```

**Error**

| 코드 | 설명 |
|---|---|
| `400` | 분석할 부정 리뷰 데이터 없음 |
| `500` | OpenAI API 호출 실패 |
| `503` | OPENAI_API_KEY 미설정 |

---

### `POST /api/consultant/diagnose`

특정 속성의 부정 리뷰를 분석해 GPT가 진단 및 실행 처방전을 생성합니다.

**Request Body**

```json
{
  "asin": "B09ABC1234",
  "category": "size"
}
```

**Response** `200 OK`

```json
{
  "sections": {
    "diagnosis": "사이즈가 전반적으로 작게 나오며, 특히 발볼이 넓은 고객들의 불만이 집중됩니다. 절반 사이즈 업을 권장하는 리뷰가 반복적으로 등장합니다.",
    "urgent": "발볼 너비 관련 정보가 상품 페이지에 전혀 없어 구매 전 판단이 불가합니다.",
    "guidelines": [
      "1. 상품 페이지에 발볼 기준 사이즈 추천표 게시",
      "2. '넓은 발용'과 '표준 발용' 옵션 분리 판매 검토",
      "3. 고객 리뷰 기반 사이즈 추천 배너 도입"
    ],
    "effect": "사이즈 정보 개선 시 반품율 20~30% 감소 및 사이즈 관련 별점 1점 이하 리뷰 40% 감소 기대"
  },
  "cat_kr": "사이즈",
  "score": 5.2,
  "usage": { "tokens": 631, "cost": 0.00289 }
}
```

**Error**

| 코드 | 설명 |
|---|---|
| `400` | 해당 속성의 부정 리뷰 데이터 없음 |
| `500` | OpenAI API 호출 실패 |
| `503` | OPENAI_API_KEY 미설정 |
