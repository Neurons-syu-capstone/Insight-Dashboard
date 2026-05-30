# Insight Dashboard

> 뉴런스 팀 캡스톤 프로젝트 | 리뷰 기반 상품 분석 인사이트 대시보드

수만 건의 리뷰를 직접 읽지 않아도 속성별 만족도, 부정 리스크, 키워드 트렌드, AI 진단을 한 화면에서 확인할 수 있는 통합 분석 플랫폼입니다.

---

## 주요 기능

| 페이지 | 설명 |
|---|---|
| 📊 **스코어보드** | LLM 기반 Aspect-Level 감성 분석으로 속성(착용감·디자인·사이즈·내구성·가격)별 만족도 점수화 및 레이더 차트 시각화 |
| 🔔 **리스크 레이더** | 기준 날짜·비교 윈도우 설정 기반으로 부정 키워드 급증·평점 하락 이상 패턴 자동 감지 및 경보 발령 |
| 🗺 **리뷰 키워드 맵** | 긍정·부정 키워드를 속성별로 캔버스 워드클라우드로 시각화, 키워드 클릭 시 관련 리뷰 즉시 검색 |
| 🤖 **AI 컨설턴트** | GPT-4o-mini 기반 전체 종합 진단 및 속성별 상세 진단, 즉시 실행 가이드라인 제공 |

---

## 기술 스택

**Backend**
- Python 3.11+
- FastAPI · Uvicorn
- Pandas · NumPy
- OpenAI API (gpt-4o-mini)

**Frontend**
- React 18 · Vite
- React Router v6
- Recharts (차트)
- Canvas API (워드클라우드)

---

## 프로젝트 구조

```
Insight-Dashboard/
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── requirements.txt
│   ├── .env                     # 환경변수 (직접 생성 필요)
│   ├── data/
│   │   ├── shoes_sample.json    # 리뷰 원본 데이터
│   │   ├── results.json         # 워드클라우드용 분석 결과
│   │   ├── llm_scores_by_product.json  # 속성별 LLM 점수
│   │   └── llm_sentences.json   # 속성별 분류 문장
│   └── src/
│       ├── scoreboard/          # 스코어보드 모듈
│       ├── risk_radar/          # 리스크 레이더 모듈
│       ├── sum_map/             # 리뷰 키워드 맵 모듈
│       └── consultant/          # AI 컨설턴트 모듈
└── frontend/
    ├── src/
    │   ├── pages/               # 4개 페이지 컴포넌트
    │   ├── components/          # 공용 및 페이지별 컴포넌트
    │   └── api/                 # API 호출 함수
    └── public/
        └── results.json         # 워드클라우드 정적 데이터 (백업용)
```

---

## 시작하기

### 1. 데이터 파일 준비

`backend/data/` 디렉토리에 아래 4개 파일을 배치합니다.

| 파일 | 설명 |
|---|---|
| `shoes_sample.json` | 리뷰 원본 데이터 (parent_asin, rating, text, brand, product_title 등 포함) |
| `results.json` | 워드클라우드용 분석 결과 (product_id, aspect_analysis 포함) |
| `llm_scores_by_product.json` | 속성별 LLM 점수 데이터 |
| `llm_sentences.json` | 속성별 분류 문장 데이터 |

### 2. 환경변수 설정

`backend/.env` 파일을 생성합니다.

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

> AI 컨설턴트 기능을 사용하지 않는 경우 `OPENAI_API_KEY`는 생략 가능합니다.

### 3. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

서버 시작 시 아래 메시지가 출력되면 정상입니다.

```
✅ RiskRadar 초기화 완료 | 상품 수: N
✅ SumMap 초기화 완료 | 상품 수: N
✅ Consultant 초기화 완료 | 상품 수: N
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.

> 프론트엔드는 `/api` 경로를 `http://localhost:8000` 으로 프록시합니다. 백엔드가 먼저 실행되어야 합니다.

---

## API 엔드포인트

| 모듈 | 엔드포인트 | 설명 |
|---|---|---|
| 스코어보드 | `GET /api/scoreboard/products` | 브랜드·검색어 필터링 상품 목록 |
| 스코어보드 | `GET /api/scoreboard/sentences` | 속성별 대표 문장 조회 |
| 리스크 레이더 | `GET /api/risk-radar/meta` | 상품 목록·날짜 범위·속성 목록 |
| 리스크 레이더 | `GET /api/risk-radar/alerts` | 이상 패턴 경보 목록 |
| 리스크 레이더 | `GET /api/risk-radar/rating-trend` | 월별 평균 평점 추이 |
| 리스크 레이더 | `GET /api/risk-radar/keyword-trend` | 속성별 부정 키워드 비율 추이 |
| 키워드 맵 | `GET /api/sum-map/products` | 브랜드 포함 상품 목록 |
| 키워드 맵 | `GET /api/sum-map/brands` | 브랜드 목록 |
| 키워드 맵 | `GET /api/sum-map/keyword-counts` | 상품별 키워드 출현 횟수 |
| 키워드 맵 | `GET /api/sum-map/search` | 키워드 기반 리뷰 검색 |
| AI 컨설턴트 | `GET /api/consultant/brands` | 브랜드 목록 |
| AI 컨설턴트 | `GET /api/consultant/products` | 상품 목록 |
| AI 컨설턴트 | `GET /api/consultant/overview/{asin}` | 상품 속성별 개요 |
| AI 컨설턴트 | `POST /api/consultant/diagnose/overview` | 전체 종합 진단 (GPT) |
| AI 컨설턴트 | `POST /api/consultant/diagnose` | 속성별 상세 진단 (GPT) |

전체 API 문서: `http://localhost:8000/docs` (Swagger UI)

---


