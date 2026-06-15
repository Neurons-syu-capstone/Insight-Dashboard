# 통합 작업 기록 (Integration Changelog)

> 4개 서브모듈(Review-Aspect-Scoreboard, Review-Risk-Radar, Review-Sum-Map, Review-Consultant-AI)을  
> Insight-Dashboard로 통합하면서 수행한 모든 변경 사항을 기록합니다.

---

## Phase 1 — 초기 3개 모듈 통합

### 새로 만든 파일

| 파일 | 설명 |
|---|---|
| `backend/main.py` | 세 백엔드를 하나로 묶는 FastAPI 진입점. `include_router()`로 각 모듈 연결 |
| `backend/src/risk_radar/router.py` | Risk Radar의 `main.py`에서 엔드포인트만 추출해 `APIRouter`로 변환 |
| `backend/src/sum_map/router.py` | Sum Map의 `api_server.py`에서 엔드포인트 추출 (`/keyword-counts`, `/search`) |
| `backend/src/sum_map/__init__.py` | sum_map 패키지 초기화 (`startup()` 함수 노출) |
| `frontend/src/App.jsx` | React Router 기반 라우팅 설정 |
| `frontend/src/components/NavBar.jsx` | 상단 공통 내비게이션 바 |
| `frontend/src/components/sum_map/ShoeWordCloud.jsx` | 캔버스 기반 워드클라우드 (아르키메데스 나선, Oswald 폰트) |
| `frontend/src/components/sum_map/WordCloudSection.jsx` | 워드클라우드 + 키워드 클릭 리뷰 패널 |
| `frontend/src/index.css` | CSS 변수 + 유틸리티 클래스 합본 |

### 백엔드 변경

**Scoreboard — import 경로 변경**

폴더 구조가 `src/routers/` → `src/scoreboard/routers/`로 바뀌면서 상대경로 수정.

```python
# 변경 전
from src.models.schemas import ProductScore, CategoryScore
# 변경 후
from ..models.schemas import ProductScore, CategoryScore
```

**Scoreboard — DATA_PATH 수정**

파일 위치가 한 단계 깊어져서 `.parent` 수를 3 → 4개로 변경.

**Risk Radar — 엔드포인트 APIRouter로 분리**

```python
# 변경 전: main.py에 app = FastAPI() + @app.get("/api/meta")
# 변경 후: router.py에 router = APIRouter() + @router.get("/meta")
```

**API prefix 추가**

| 모듈 | 변경 전 | 변경 후 |
|---|---|---|
| Scoreboard | `/api/products`, `/api/sentences` | `/api/scoreboard/products`, `/api/scoreboard/sentences` |
| Risk Radar | `/api/meta`, `/api/alerts` | `/api/risk-radar/meta`, `/api/risk-radar/alerts` |
| Sum Map | `http://127.0.0.1:8000` | `/api/sum-map` |

### 프론트엔드 변경

- 컴포넌트를 모듈별 폴더(`scoreboard/`, `risk_radar/`, `sum_map/`)로 분리
- ScoreboardPage 전체 높이 `100vh` → `calc(100vh - 52px)` (NavBar 52px 확보)
- 내부 헤더 `sticky top: 0` → `top: 52`
- SumMapPage에서 데이터 로딩 로직 내부로 이동 (App.jsx 역할 분리)
- `setDrawerState(null)` 잔존 버그 제거
- Sum Map UI 전면 교체: AspectPanel/DonutChart/KeywordPanel/ReviewDrawer → ShoeWordCloud + WordCloudSection
- Oswald 폰트 Google Fonts 링크 추가

---

## Phase 2 — Review-Consultant-AI 통합

### 배경

팀원(JunHyeongKim)이 `feat/consultant-ai/JunHyeongKim` 브랜치에 Flask 기반 AI 컨설턴트를 개발.  
기존 Flask → FastAPI로 변환하여 통합 백엔드에 편입.

### 새로 만든 파일

| 파일 | 설명 |
|---|---|
| `backend/src/consultant/router.py` | Flask api_server.py를 FastAPI APIRouter로 재작성 |
| `backend/src/consultant/__init__.py` | consultant 패키지 초기화 (`startup()` 함수 노출) |
| `backend/.env` | `OPENAI_API_KEY`, `OPENAI_MODEL` 환경변수 파일 (gitignore 처리) |
| `frontend/src/pages/ConsultantPage.jsx` | AI 컨설턴트 전체 페이지 (플레이스홀더 → 실제 구현) |
| `frontend/src/pages/ConsultantPage.css` | 컨설턴트 페이지 전용 스타일 (`.consultant-page` 스코프) |

### 백엔드 변경

**Flask → FastAPI 변환 주요 사항**

```python
# Flask
@app.route("/brands")
def get_brands(): ...

# FastAPI
@router.get("/brands")
def get_brands(): ...
```

- `jsonify()` → `return dict` (FastAPI 자동 직렬화)
- `request.json` → Pydantic `BaseModel` 요청 바디
- `abort(503)` → `raise HTTPException(status_code=503, ...)`
- 전역 데이터 로딩을 `startup()` 함수 패턴으로 통일

**새로 추가된 엔드포인트** (Flask 원본에 없었던 것)

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/consultant/brands` | 브랜드 목록 |
| `GET /api/consultant/overview/{asin}` | 속성별 개요 카드 데이터 |
| `POST /api/consultant/diagnose/overview` | 전체 속성 종합 진단 (GPT) |

### 프론트엔드 변경

- ConsultantPage: 속성 선택 진단(기존) 외에 전체 종합 진단(AI 종합 진단) 섹션을 메인으로 추가
- 라이트 테마 적용: CSS 변수 전부 밝은 색상으로 재정의
- 페이지 상단 sticky 헤더 추가 (`🤖 AI 컨설턴트`)
- Urgent 배너 텍스트 색상 → `#ffffff` (JSX 인라인)
- `main.py`에 `cs_router` include 및 `lifespan`에 `cs_module.startup()` 추가

---

## Phase 3 — UI 통일 및 기능 개선

### 페이지 헤더 통일

모든 페이지에 동일한 구조의 sticky 상단 헤더 추가.

```jsx
<header style={{ position: "sticky", top: 52, height: 64, zIndex: 100, ... }}>
  <span>{emoji}</span>
  <span style={{ fontSize: 24, fontWeight: 800 }}>{페이지명}</span>
  <span style={{ marginLeft: "auto" }}>{부제}</span>
</header>
```

- 스코어보드: `👟 신발 리뷰 다차원 만족도 스코어보드`
- 리스크 레이더: 기존 h1 방식 유지 (사이드바 레이아웃 전환 시 조정)
- 리뷰 키워드 맵: `🗺 리뷰 키워드 맵` (NavBar 레이블도 동일하게 변경)
- AI 컨설턴트: `🤖 AI 컨설턴트`

### 리스크 레이더 배경색 반전

`.rr-page` 전용 CSS 클래스 추가로 다른 페이지에 영향 없이 배경/카드 색상 교체.

```css
.rr-page { background: #fff; }
.rr-page .card { background: #f5f6fa; border: 1px solid #e5e7eb; box-shadow: none; }
```

---

## Phase 4 — 상품 검색 사이드바 (Risk Radar · SumMap)

### 배경

두 페이지에서 상품이 드롭다운 select 하나에 모두 나열되어 상품 수가 많을 때 선택 불편.  
Scoreboard · Consultant처럼 브랜드 필터 + 텍스트 검색 + 스크롤 목록을 제공.

### 새로 만든 파일

| 파일 | 설명 |
|---|---|
| `frontend/src/components/ProductSidebar.jsx` | 브랜드 필터 + 텍스트 검색 + 상품 목록 공용 사이드바 컴포넌트 |

### 백엔드 변경

**Risk Radar — `get_products()`에 brand 필드 추가**

`review_processor.py`에서 shoes_sample.json의 `brand` 컬럼을 상품 목록에 포함.

```python
if "brand" in self.df.columns:
    brands_df = self.df.drop_duplicates("_product")[["_product", "brand"]]
    products = products.merge(brands_df.rename(columns={"_product": "product_id"}), ...)
```

**SumMap — 브랜드 맵 및 신규 엔드포인트 추가**

`sum_map/router.py`에서 startup 시 `_brand_map` 구축, 두 엔드포인트 추가.

```
GET /api/sum-map/brands          → 브랜드 목록
GET /api/sum-map/products        → 브랜드·검색어 필터링 상품 목록 (brand, review_count 포함)
```

### 프론트엔드 변경

- Risk Radar: `className="page rr-page"` 제거, flex 레이아웃으로 `ProductSidebar` + 기존 내용 배치
- SumMap: `<main>` 내부를 flex로 변환, `ProductSidebar` 추가, 기존 "상품 변경" 드롭다운 제거
- SumMap: `selectedIdx` 방식 → `selectedProductId` 방식으로 변경 (product_id 기반 선택)

---

## Phase 5 — sessionStorage 상태 유지

### 배경

React Router로 페이지 이동 시 컴포넌트가 unmount되어 선택 상태·진단 결과가 초기화되는 문제.

### 적용 패턴

**핵심 원칙**: `useEffect`로 복원하면 비동기 타이밍에 의한 race condition 발생.  
→ `useState` lazy initializer로 첫 렌더링부터 sessionStorage 값을 초기값으로 사용.

```js
const getSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}") } catch { return {} }
}

const [selAsin, setSelAsin] = useState(() => getSaved().selAsin || "")
```

**필터 변경 시 상태 초기화** — `prevFiltersRef` 패턴으로 마운트 시와 사용자 변경 시 구분.

```js
const prevFiltersRef = useRef({ brand: null, search: null })

useEffect(() => {
  const prev = prevFiltersRef.current
  const filtersChanged = prev.brand !== null && (prev.brand !== brand || prev.search !== search)
  prevFiltersRef.current = { brand, search }

  fetch(...)
    .then(data => {
      setProducts(data)
      if (filtersChanged) { setSelAsin(""); setDiag(null) }
    })
}, [brand, search])
```

### 적용 페이지 및 유지 항목

| 페이지 | sessionStorage 키 | 유지 항목 |
|---|---|---|
| AI 컨설턴트 | `consultant_state` | 선택 브랜드·검색어·상품·overview 데이터·진단 결과·선택 속성 |
| 스코어보드 | `scoreboard_state` | 선택 브랜드·검색어·선택 상품·선택 카테고리 |
| 리스크 레이더 | `risk_radar_state` | 선택 상품·기준 날짜·비교 윈도우·선택 속성 |
| 리뷰 키워드 맵 | `sum_map_state` | 선택 상품 ID |

---

## Phase 6 — 초기 상품 미선택 상태 (빈 화면)

### 배경

Risk Radar · 리뷰 키워드 맵은 첫 진입 시 products[0]를 자동 선택해 바로 데이터를 표시했음.  
Scoreboard · AI 컨설턴트와 동일하게 "상품을 선택해주세요" 안내 화면으로 통일.

### 변경 내용

- Risk Radar: meta 로딩 후 `setProductId(data.products[0])` 제거 → `productId === ""` 이면 빈 화면
- 리뷰 키워드 맵: `selectedIdx = 0` → `selectedProductId = ""` → `product === null` 이면 빈 화면
- 각 페이지에 빈 화면 UI 추가 (이모지 + 안내 문구)

---

## 변경하지 않은 것

아래 코드는 **원본 서브모듈에서 그대로 복사**되었으며 로직 변경 없음.

- Risk Radar 감지 파이프라인 전체 (`risk_radar.py`, `keyword_detector.py`, `rating_detector.py`, `alert_generator.py`, `event_types.py`)
- Scoreboard Pydantic 모델 (`schemas.py`) 및 sentences 라우터
- 모든 UI 컴포넌트 내부 렌더링 로직 (RadarChart, ScoreCard, SentencePanel, AlertCard, TrendChart)
- Sum Map의 `results.json` 정적 서빙 (`frontend/public/results.json`)
