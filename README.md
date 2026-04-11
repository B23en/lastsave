# 막차세이브 (LastSave)

> **2026 전국 통합데이터 활용 공모전 출품작**
>
> 심야 시간대, 사용자의 현재 위치와 목적지를 기반으로
> **"지금 타려는 버스를 그대로 탈까"** vs
> **"근처 공영자전거로 갈아탈까"** 를 실시간 공공데이터로 비교해
> 가장 빠르고 안전한 귀갓길을 추천하는 반응형 웹앱.

- 기획 문서: [`SPEC.md`](./SPEC.md)
- 구현 계획: [`tasks/plan.md`](./tasks/plan.md)
- 실행 체크리스트: [`tasks/todo.md`](./tasks/todo.md)
- 제출 체크리스트: [`tasks/submission-checklist.md`](./tasks/submission-checklist.md)

---

## 핵심 기능

| 기능 | 설명 |
|---|---|
| 🧭 자동 출발지 | 브라우저 Geolocation 으로 현재 위치를 출발지로 세팅. 정확도가 100m 를 넘으면 경고 표시, 권한 거부 시 지도 탭으로 수동 선택 가능 |
| 🔎 목적지 검색 | 카카오 로컬 API 키워드 검색, 250ms debounce + AbortController |
| 🚌 🚲 두 경로 동시 비교 | 버스(ODsay) vs 공영자전거(행안부 한국지역정보개발원 공영자전거 실시간 정보)를 한 화면에 카드 + 지도 폴리라인으로 표시 |
| 🏷️ 자동 추천 | 운행 종료·대여 불가·리스크·소요시간을 평가해 `추천` 배지를 자동 부여 |
| 🚨 막차 놓침 리스크 배너 | 버스 카드 선택 시 `slack = 막차 ETA − 도보 시간` 기반 safe/caution/danger 등급, "자전거로 전환" CTA |
| 📡 실시간 버스 위치 polling | 15초 refetch, 탭이 백그라운드면 자동 중단 (TAGO 초정밀버스) |
| 🌙 다크/라이트 토글 | next-themes + 시스템 설정 지원, 심야 UX 기준 다크 기본 |
| ♿ 접근성 | aria-label, role, prefers-reduced-motion, focus-visible 글로벌 스타일 |

---

## 활용 공공데이터

| 데이터 | 출처 | 용도 | 엔드포인트 |
|---|---|---|---|
| 전국 공영자전거 실시간 정보 | 공공데이터포털 15126639 (행안부 한국지역정보개발원) | 거치대 위치·잔여 자전거 | `B551982/pbdo_v2/inf_101_00010002_v2` |
| 전국 초정밀버스 실시간 위치 | 공공데이터포털 15157601 (행안부 한국지역정보개발원) | 버스 GPS·노선 | `B551982/rte/rtm_loc_info` |
| 대중교통 경로 탐색 | ODsay LAB | 버스·지하철 경로 | `searchPubTransPathT` |
| 지도·주소검색 | 카카오 Developers | 지도 타일·POI | `kakao.maps.sdk` + `dapi.kakao.com/v2/local` |

> 공모전 심사 기준의 "통합 데이터 활용"에 맞춰 **행정안전부 한국지역정보개발원의 전국 통합데이터 2종**을 실시간 polling + 경로 산정에 결합합니다. 두 API 는 같은 공공데이터포털 계정의 단일 서비스키로 호출되며, `.env.local` 에 `REALTIME_BUS_SERVICE_KEY`, `PUBLIC_BIKE_SERVICE_KEY` 로 설정합니다 (같은 값을 두 변수에 넣어도 됩니다).

---

## 아키텍처 요약

```
┌───────────────────────────────────────────┐
│ Next.js App Router (client)               │
│                                           │
│  ┌──────────────┐   ┌──────────────────┐ │
│  │  MapCanvas   │◀──│  Zustand Store   │ │
│  │  (카카오맵)  │   │  origin, dest,   │ │
│  └──────┬───────┘   │  compare, selected│ │
│         │           └──────────▲───────┘ │
│  ┌──────▼───────┐              │         │
│  │ CompareSheet │──────────────┘         │
│  │ RiskBanner   │                        │
│  │ SearchBar    │    React Query 15s     │
│  │ ThemeToggle  │    useBusPositions     │
│  └──────┬───────┘                        │
└─────────┼────────────────────────────────┘
          │ fetch /api/*
          ▼
┌───────────────────────────────────────────┐
│ Next.js Route Handlers (server, BFF)     │
│                                           │
│  /api/route/compare  → ODsay + PBDO       │
│  /api/bus/positions  → 통합데이터 실시간버스│
│  /api/bike/stations  → PBDO (B551982)     │
│  /api/kakao/search   → Kakao Local        │
│                                           │
│  lib/api/*.ts  — server-only, 15s memo   │
│                 cache + 2s timeout +      │
│                 60s circuit breaker +     │
│                 fixture fallback          │
└───────────┬───────────────────────────────┘
            │
            ▼
     외부 공공 API + fixtures
```

핵심 디자인 포인트:
- **API 키 격리**: 모든 외부 공공데이터 키는 `app/api/*` 서버 사이드에서만 로드, 클라이언트 번들 스캔 검증 (`rg "SERVICE_KEY" .next/static` → 0건)
- **Fixture 폴백**: 키 미발급/전파 지연/네트워크 장애 시에도 dev·preview 가 정상 동작
- **2초 타임아웃 + 60초 서킷 브레이커**: 실패한 upstream 에 매달리지 않고 즉시 fixture 로 전환, 사용자가 대기하는 시간은 사실상 첫 호출 1회뿐
- **순수 도메인**: `lib/domain/{eta,risk,recommend,bikeRoute,odsayMapper,lastBus}` 는 I/O 없이 순수 함수로 분리돼 단위 테스트 커버리지 ~97%

---

## 로컬 실행

### 1. 의존성 설치

```bash
pnpm install
```

> pnpm 이 없으면 `corepack enable pnpm` 한 번 실행 후 위 명령을 쓰세요.

### 2. 환경 변수 준비

```bash
cp .env.example .env.local
```

`.env.local` 을 열어 아래 키를 채웁니다. **모든 키는 선택 사항**이며, 비어 있으면 해당 API 호출은 자동으로 fixture 로 폴백합니다.

| 환경 변수 | 발급처 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | [카카오 Developers](https://developers.kakao.com) → 내 애플리케이션 → JavaScript 키 | 카카오맵 렌더 |
| `KAKAO_REST_KEY` | 동일 앱의 REST API 키 | 주소/키워드 검색 (서버 전용) |
| `ODSAY_KEY` | [ODsay LAB](https://lab.odsay.com) | 대중교통 경로 산정 |
| `REALTIME_BUS_SERVICE_KEY` | [data.go.kr 15157601](https://www.data.go.kr/data/15157601/openapi.do) | (전국 통합데이터) 초정밀버스 실시간 위치 |
| `PUBLIC_BIKE_SERVICE_KEY` | [data.go.kr 15126639](https://www.data.go.kr/data/15126639/openapi.do) | 전국 공영자전거 실시간 정보 |

> 위 두 data.go.kr 키는 하나의 계정이 발급한 동일한 값이어도 됩니다 (각 API 에 활용 신청이 따로 필요할 뿐, 서비스키 자체는 계정 공용).

> **중요**: 카카오맵 키 발급 후 반드시 Developers 콘솔에서 **카카오맵 서비스 활성화 ON** + **Web 플랫폼 도메인에 `http://localhost:3000` 등록** 두 단계를 모두 해야 지도가 로드됩니다.

### 3. 개발 서버 기동

```bash
pnpm dev
# → http://localhost:3000
```

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 빌드 결과 로컬 기동 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`next/core-web-vitals` + TS) |
| `pnpm test` | Vitest 단위/통합 테스트 |
| `pnpm test:watch` | Vitest watch 모드 |
| `pnpm test:coverage` | 도메인 커버리지 리포트 |

---

## 디버그 훅

| URL 파라미터 | 효과 | 사용처 |
|---|---|---|
| `?now=23:58` | RiskBanner 의 현재 시각을 임의 KST 로 고정 | 막차 리스크 배너 시연 (safe/caution/danger 경계 검증) |

예: `http://localhost:3000/?now=00:28` 로 접속 → 버스 카드 탭 → "막차 놓칠 가능성 높음" 배너 확인.

---

## 프로젝트 구조

```
.
├─ app/                         # Next.js App Router
│  ├─ layout.tsx                # Theme + Query provider
│  ├─ page.tsx                  # 메인 — 지도 + 오버레이 + 바텀시트
│  └─ api/                      # BFF 라우트 (키는 여기서만 사용)
│     ├─ route/compare/         # ODsay + PBDO 를 합쳐 CompareResponse 반환
│     ├─ bus/positions/         # TAGO 초정밀버스 → LiveBus[]
│     ├─ bike/stations/         # PBDO → BikeStation[]
│     └─ kakao/search/          # 카카오 로컬 키워드 검색
├─ components/
│  ├─ map/MapCanvas.tsx         # 카카오맵 + 마커 + 폴리라인 + 실시간 버스
│  ├─ compare/CompareSheet.tsx  # 두 카드 비교 바텀시트
│  ├─ risk/RiskBanner.tsx       # 막차 리스크 배너 (safe/caution/danger)
│  ├─ search/SearchBar.tsx      # 목적지 debounce 검색
│  ├─ location/LocationGate.tsx # Geolocation 권한 플로우
│  ├─ theme/*                   # next-themes 토글
│  └─ providers/                # Query + Theme 프로바이더
├─ lib/
│  ├─ api/                      # server-only 외부 API 클라이언트
│  │  ├─ cache.ts               # 15s TTL 메모리 캐시
│  │  ├─ http.ts                # fetchWithTimeout + 서킷 브레이커
│  │  ├─ fixtures.ts            # 오프라인 폴백 로더
│  │  ├─ realtimeBus.ts         # 통합데이터 초정밀버스
│  │  ├─ pbdo.ts                # 공영자전거
│  │  ├─ odsay.ts               # 대중교통 경로
│  │  └─ kakao.ts               # 로컬 키워드 검색
│  ├─ domain/                   # 순수 함수 — I/O 금지
│  │  ├─ eta.ts                 # Haversine + 보행/자전거 속도
│  │  ├─ risk.ts                # safe/caution/danger 등급
│  │  ├─ recommend.ts           # 버스 vs 자전거 선택 로직
│  │  ├─ bikeRoute.ts           # 최근접 거치대 + BikeRoute 빌더
│  │  ├─ odsayMapper.ts         # ODsay 응답 → BusRoute
│  │  └─ lastBus.ts             # 다음 막차 출발 시각 계산
│  ├─ hooks/useBusPositions.ts  # 15s 버스 polling 훅
│  ├─ store/useTripStore.ts     # Zustand 전역 trip 상태
│  ├─ config.ts                 # 공용 상수 (시청 좌표 등)
│  └─ utils.ts                  # cn() 헬퍼
├─ types/                       # 외부/도메인 타입
│  ├─ trip.ts                   # Coord, BusRoute, BikeRoute, RiskLevel
│  ├─ kakao.ts, odsay.ts
│  ├─ pbdo.ts, realtimeBus.ts
├─ tests/
│  ├─ unit/                     # 도메인 단위 테스트 (82 cases)
│  ├─ integration/              # 라우트 핸들러 통합 테스트
│  ├─ fixtures/                 # 공공 API 샘플 응답
│  └─ stubs/                    # `server-only` 가드 stub
├─ .env.example                 # 환경 변수 템플릿
├─ SPEC.md                      # 기획 명세
└─ tasks/                       # plan / todo / 제출 체크리스트
```

---

## 테스트 & 품질 게이트

현재 상태:
- **82 tests / 10 test files** (단위 + 통합) — `pnpm test`
- **도메인 커버리지 ≥ 97%** — `pnpm test:coverage`
- **typecheck / lint / build 모두 green**
- API 키 번들 누출 검사: `rg "SERVICE_KEY|ODSAY_KEY|KAKAO_REST_KEY" .next/static` → 0건

TDD 대상 도메인 모듈:
- `eta` — Haversine, 보행 1.2 m/s, 자전거 5 m/s 경계값 + 음수 거리 처리
- `risk` — 2분/5분 경계, 막차 시각 컷오프, 명시적 `now` override
- `recommend` — only_option / safer / faster / tie 우선순위
- `bikeRoute` — 최근접 거치대 + 양쪽 가용성 + 폴리라인 구조
- `odsayMapper` — 최단 경로 선택, walk/bus/subway 분류, polyline 추출, lane → routeName
- `lastBus` — 오늘/내일 00:30 KST 경계
- `http` — 서킷 브레이커 scope 격리 + cooldown 만료

---

## Lighthouse 측정 (수동)

```bash
pnpm build
pnpm start &
npx lighthouse http://localhost:3000 \
  --preset=desktop \
  --view \
  --output=html \
  --output-path=./lighthouse-desktop.html

npx lighthouse http://localhost:3000 \
  --view \
  --output=html \
  --output-path=./lighthouse-mobile.html
```

목표 (SPEC §1.5):
- Performance ≥ 80 (모바일)
- Accessibility ≥ 90
- 주요 상호작용 TTI < 3s (모바일 3G Fast)

---

## 배포 (Vercel)

```bash
# 1. Vercel CLI 로그인 (최초 1회)
pnpm dlx vercel login

# 2. 프로젝트 연결 + 프리뷰 배포
pnpm dlx vercel

# 3. 환경 변수 등록 (각각 한 번씩)
pnpm dlx vercel env add NEXT_PUBLIC_KAKAO_MAP_KEY
pnpm dlx vercel env add KAKAO_REST_KEY
pnpm dlx vercel env add ODSAY_KEY
pnpm dlx vercel env add REALTIME_BUS_SERVICE_KEY
pnpm dlx vercel env add PUBLIC_BIKE_SERVICE_KEY

# 4. 프로덕션 배포
pnpm dlx vercel --prod
```

배포 후 카카오 Developers → **Web 플랫폼 도메인** 항목에 Vercel 도메인 (`*.vercel.app` 또는 커스텀)을 **추가**해야 지도가 프로덕션에서 로드됩니다.

---

## 보안 원칙

- 공공 API 키는 반드시 `.env.local` / Vercel 환경 변수에만 저장. **절대 커밋 금지** (`.gitignore` 에 `.env*` 등록, `!.env.example` 예외)
- 공공데이터 관련 서버 전용 키(`ODSAY_KEY`, `REALTIME_BUS_SERVICE_KEY`, `PUBLIC_BIKE_SERVICE_KEY`, `KAKAO_REST_KEY`)는 `app/api/*` 및 `lib/api/*` 에서만 로드하며 `import "server-only"` 가드로 클라이언트 번들 유입을 차단
- `NEXT_PUBLIC_KAKAO_MAP_KEY` 만 클라이언트에 노출되며, 카카오 Developers 에서 허용 도메인 화이트리스트로 보호

---

## 라이선스 / 데이터 출처

공공데이터 활용 시 각 제공 기관의 약관을 준수합니다. 배포 환경에서는 이용 기관명·출처를 푸터에 명시합니다.

- 행정안전부 한국지역정보개발원 · 전국 공영자전거 실시간 정보 (공공데이터포털 15126639)
- 행정안전부 한국지역정보개발원 · 전국 통합데이터 초정밀버스 위치 실시간 정보 (공공데이터포털 15157601)
- ODsay LAB · 대중교통 경로 탐색 API
- Kakao Developers · 카카오맵 SDK + 로컬 API
