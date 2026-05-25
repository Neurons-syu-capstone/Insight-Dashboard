# 통합 변경 사항 (Integration Changes)

> Review-Aspect-Scoreboard, Review-Risk-Radar, Review-Sum-Map을 Insight-Dashboard로 통합하면서 수정/추가한 내용을 정리합니다.

---

## 새로 만든 파일

| 파일 | 설명 |
|---|---|
| `backend/main.py` | 두 백엔드를 하나로 묶는 FastAPI 진입점. `include_router()`로 각 모듈 연결 |
| `backend/src/risk_radar/router.py` | Risk Radar의 `main.py`에서 엔드포인트만 추출해 `APIRouter`로 변환 |
| `frontend/src/App.jsx` | React Router(`BrowserRouter`, `Routes`, `Route`) 기반 라우팅 설정 |
| `frontend/src/components/NavBar.jsx` | 상단 공통 내비게이션 바 (페이지 간 이동) |
| `frontend/src/index.css` | 두 프로젝트의 CSS 합본 (CSS 변수 + 유틸리티 클래스) |
| `frontend/src/pages/ConsultantPage.jsx` | Review Consultant AI 플레이스홀더 ("준비 중") |

---

## 합치기 위해 수정한 내용

### 백엔드

#### 1. Python 임포트 경로 변경 (Scoreboard)

폴더 구조가 `src/routers/` → `src/scoreboard/routers/`로 바뀌면서 import 경로 수정.

```python
# 변경 전 (Review-Aspect-Scoreboard/backend/src/routers/products.py)
from src.models.schemas import ProductScore, CategoryScore

# 변경 후 (backend/src/scoreboard/routers/products.py)
from ..models.schemas import ProductScore, CategoryScore
```

#### 2. DATA_PATH 상대경로 수정 (Scoreboard)

파일 위치가 한 단계 깊어져서 `.parent` 수를 3→4개로 변경.

```python
# 변경 전 (src/routers/products.py 기준 → backend/)
DATA_PATH = Path(__file__).parent.parent.parent / "data" / "llm_scores_by_product.json"

# 변경 후 (src/scoreboard/routers/products.py 기준 → backend/)
DATA_PATH = Path(__file__).parent.parent.parent.parent / "data" / "llm_scores_by_product.json"
```

#### 3. Risk Radar 엔드포인트 추출

기존 Risk Radar는 `main.py` 하나에 데이터 로딩 + API 엔드포인트가 모두 있었음.
통합 앱에서 `include_router()`로 붙이려면 `APIRouter` 형태가 필요해서 `router.py`로 분리.

```python
# 변경 전 (Review-Risk-Radar/backend/main.py)
app = FastAPI(...)

@app.get("/api/meta")
def get_meta(): ...

# 변경 후 (backend/src/risk_radar/router.py)
router = APIRouter()

@router.get("/meta")   # prefix는 main.py에서 "/api/risk-radar"로 지정
def get_meta(): ...
```

---

### 프론트엔드

#### 4. API URL prefix 추가

두 백엔드의 API 경로가 겹치지 않도록 각 모듈에 prefix 추가.

| 모듈 | 변경 전 | 변경 후 |
|---|---|---|
| Scoreboard | `/api/products` | `/api/scoreboard/products` |
| Scoreboard | `/api/sentences` | `/api/scoreboard/sentences` |
| Risk Radar | `/api/meta` | `/api/risk-radar/meta` |
| Risk Radar | `/api/alerts` | `/api/risk-radar/alerts` |
| Risk Radar | `/api/trend/...` | `/api/risk-radar/trend/...` |

```js
// scoreboardApi.js
const BASE = "/api/scoreboard"   // 변경 전: "/api"

// riskApi.js
const BASE = "/api/risk-radar"   // 변경 전: "/api"
```

#### 5. 컴포넌트 import 경로 변경

컴포넌트를 모듈별 폴더(`scoreboard/`, `risk_radar/`, `sum_map/`)로 분리하면서 경로 수정.

```js
// 변경 전 (ScoreboardPage.jsx)
import RadarChart from "../components/RadarChart"

// 변경 후
import RadarChart from "../components/scoreboard/RadarChart"
```

#### 6. ScoreboardPage 레이아웃 높이 조정

상단 NavBar(52px)가 추가되면서 Scoreboard의 전체 높이를 조정.
또한 Scoreboard 내부 헤더의 `sticky` 위치도 NavBar 아래로 내림.

```js
// 변경 전
<div style={{ height: "100vh", ... }}>
<header style={{ position: "sticky", top: 0, ... }}>

// 변경 후
<div style={{ height: "calc(100vh - 52px)", ... }}>
<header style={{ position: "sticky", top: 52, ... }}>
```

#### 7. SumMapPage — 헤더 sticky 제거

SumMapPage(구 DashboardPage)의 헤더에서 `position: sticky`를 제거.
NavBar가 이미 상단에 고정되어 있어 내부 헤더는 굳이 sticky일 필요 없음.

---

### Sum Map

#### 8. DashboardPage → SumMapPage 구조 변경

원본은 `App.jsx`에서 데이터를 로딩해 `DashboardPage`에 props로 전달하는 구조였음.
통합본에서는 React Router가 `App.jsx`를 라우팅 용도로 쓰기 때문에, 데이터 로딩 로직을 `SumMapPage` 안으로 이동.

```jsx
// 변경 전: App.jsx가 데이터 로딩
export default function App() {
  const [data, setData] = useState([])
  useEffect(() => { fetchResults().then(setData) }, [])
  return <DashboardPage data={data} />
}

// 변경 후: SumMapPage가 직접 로딩 + Dashboard는 내부 컴포넌트로
function Dashboard({ data }) { /* 기존 DashboardPage 로직 */ }

export default function SumMapPage() {
  const [data, setData] = useState([])
  useEffect(() => { fetchResults().then(setData) }, [])
  return <Dashboard data={data} />
}
```

#### 9. Sum Map 백엔드 — 통합 대상 아님

원본 `Review-Sum-Map/backend/`는 웹 서버가 아니라 **데이터 처리 파이프라인 스크립트**임.
(`pipeline.py` → `llm_analyzer.py` → `results.json` 생성)

따라서 Insight-Dashboard 백엔드에 통합하지 않고, 파이프라인 실행 결과인 `results.json`만 `frontend/public/`에 정적 파일로 복사해 서빙.

```
Review-Sum-Map/backend/data/results.json
    → Insight-Dashboard/frontend/public/results.json
```

---

## 변경하지 않은 것

아래 코드는 **그대로 복사**되었으며 로직 변경 없음.

- Risk Radar 감지 파이프라인 (`risk_radar.py`, `keyword_detector.py`, `rating_detector.py`, `alert_generator.py`, `review_processor.py`, `event_types.py`)
- Scoreboard Pydantic 모델 (`schemas.py`)
- 모든 UI 컴포넌트 내부 렌더링 로직
- Sum Map의 `results.json` 로딩 방식 (백엔드 없이 `public/results.json` 정적 파일로 서빙)
