# 막차세이브 (LastSave)

> **2026 전국 통합데이터 활용 공모전 출품작**
>
> 심야 시간대, 사용자의 현재 위치와 목적지를 기반으로
> **"지금 타려는 버스를 그대로 탈까"** vs
> **"근처 공영자전거로 갈아탈까"** 를 실시간 공공데이터로 비교해
> 가장 빠르고 안전한 귀갓길을 추천하는 반응형 웹앱.

- 배포 URL: [https://lastsave-phi.vercel.app](https://lastsave-phi.vercel.app)
- 기획 문서: [`SPEC.md`](./SPEC.md)

---

## 핵심 기능

| 기능 | 설명 |
|---|---|
| 🧭 자동 출발지 | 브라우저 Geolocation으로 현재 위치를 출발지로 세팅. GPS 거부 시 서울시청을 기본 출발지로 설정. 언제든 "출발지 변경" 버튼으로 지도 탭 수동 선택 가능, "현재 위치로 복원"으로 GPS 복귀 |
| 🔎 목적지 검색 | 카카오 로컬 API 키워드 검색 (250ms debounce) |
| 🚌🚲 두 경로 동시 비교 | 버스(ODsay 대중교통) vs 공영자전거(행안부 전국 통합데이터)를 카드 + 지도 폴리라인으로 비교 |
| 🏷️ 자동 추천 | 운행 종료·대여 불가·리스크·소요시간을 평가해 추천 배지 자동 부여 |
| 🚨 막차 리스크 배너 | 버스 선택 시 막차까지 여유 시간 기반 safe/caution/danger 등급 표시, "자전거로 전환" CTA |
| 📡 실시간 버스 ETA | 실시간 버스 위치(15초 polling)로 가장 가까운 버스의 도착 예상 시간 계산·표시 |
| 🗺️ 도로 기반 자전거 경로 | OSRM 오픈소스 라우팅으로 실제 도로를 따르는 자전거·도보 경로 및 폴리라인 표시 |
| ✨ AI 귀가 코칭 | OpenAI OpenAI를 활용해 비교 결과를 2-3문장 자연어 귀가 조언으로 요약 |
| 🌙 다크/라이트 토글 | 심야 UX 기준 다크 모드 기본, 시스템 설정 연동 |

---

## 활용 데이터

| 데이터 | 출처 | 용도 |
|---|---|---|
| 전국 공영자전거 실시간 정보 | 공공데이터포털 15126639 (행안부 한국지역정보개발원) | 거치대 위치·잔여 자전거 |
| 전국 초정밀버스 실시간 위치 | 공공데이터포털 15157601 (행안부 한국지역정보개발원) | 버스 GPS·노선·속도 |
| 대중교통 경로 탐색 | ODsay LAB | 버스·지하철 경로 산정 |
| 지도·주소검색 | 카카오 Developers | 지도 타일·POI·역지오코딩 |
| 자전거·도보 경로 | OSRM (Open Source Routing Machine) | 실제 도로 폴리라인·거리·소요시간 |
| AI 자연어 코칭 | OpenAI API (OpenAI) | 경로 비교 결과 자연어 요약 |

> **행정안전부 한국지역정보개발원의 전국 통합데이터 2종**을 핵심 데이터로 활용하며, 실시간 polling + 경로 산정에 결합합니다.

---

## 아키텍처 요약

```
┌─────────────────────────────────────────────┐
│ Next.js App Router (client)                 │
│                                             │
│  ┌──────────────┐   ┌────────────────────┐ │
│  │  MapCanvas   │◀──│   Zustand Store    │ │
│  │  (카카오맵)  │   │  origin, dest,     │ │
│  └──────┬───────┘   │  compare, selected │ │
│         │           └──────────▲─────────┘ │
│  ┌──────▼───────┐              │           │
│  │ CompareSheet │──────────────┘           │
│  │ CoachSection │  AI 코칭                 │
│  │ RiskBanner   │  막차 리스크             │
│  │ SearchBar    │  React Query 15s polling │
│  └──────┬───────┘                          │
└─────────┼──────────────────────────────────┘
          │ fetch /api/*
          ▼
┌─────────────────────────────────────────────┐
│ Next.js Route Handlers (server, BFF)       │
│                                             │
│  /api/route/compare → ODsay + PBDO + OSRM  │
│  /api/bus/positions → 통합데이터 실시간버스  │
│  /api/bike/stations → PBDO 공영자전거       │
│  /api/ai/coach      → OpenAI OpenAI   │
│  /api/kakao/search  → Kakao Local          │
│  /api/region        → Kakao 역지오코딩      │
│                                             │
│  server-only | 15s 캐시 | 2s 타임아웃       │
│  60s 서킷브레이커 | fixture 폴백            │
└─────────────┬───────────────────────────────┘
              ▼
       외부 API + fixtures
```

---

## 로컬 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 준비

```bash
cp .env.example .env.local
```

`.env.local`을 열어 아래 키를 채웁니다. **모든 키는 선택 사항**이며, 비어 있으면 해당 API는 자동으로 fixture로 폴백합니다.

| 환경 변수 | 발급처 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | [카카오 Developers](https://developers.kakao.com) → JavaScript 키 | 카카오맵 렌더 |
| `KAKAO_REST_KEY` | 동일 앱의 REST API 키 | 주소/키워드 검색 |
| `ODSAY_KEY` | [ODsay LAB](https://lab.odsay.com) | 대중교통 경로 |
| `REALTIME_BUS_SERVICE_KEY` | [data.go.kr 15157601](https://www.data.go.kr/data/15157601/openapi.do) | 초정밀버스 실시간 위치 |
| `PUBLIC_BIKE_SERVICE_KEY` | [data.go.kr 15126639](https://www.data.go.kr/data/15126639/openapi.do) | 공영자전거 실시간 정보 |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) | AI 귀가 코칭 |

### 3. 개발 서버

```bash
pnpm dev
# → http://localhost:3000
```

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (100 tests) |

---

## 디버그 훅

| URL 파라미터 | 효과 |
|---|---|
| `?now=23:58` | 막차 리스크 배너의 현재 시각을 임의 KST로 고정 |

예: `http://localhost:3000/?now=00:28` → 버스 카드 선택 → "막차 놓칠 가능성 높음" 배너 확인

---

## 프로젝트 구조

```
.
├─ app/
│  ├─ page.tsx                  # 메인 — 지도 + 오버레이 + 바텀시트
│  └─ api/
│     ├─ route/compare/         # 버스 vs 자전거 비교 (ODsay + PBDO + OSRM)
│     ├─ bus/positions/         # 실시간 버스 위치
│     ├─ bike/stations/         # 자전거 거치대
│     ├─ ai/coach/              # AI 귀가 코칭 (OpenAI)
│     ├─ kakao/search/          # 장소 검색
│     └─ region/                # 지역 자동 감지
├─ components/
│  ├─ map/MapCanvas.tsx         # 카카오맵 + 마커 + 폴리라인 + 실시간 버스
│  ├─ compare/CompareSheet.tsx  # 비교 카드 + AI 코칭 + 실시간 ETA
│  ├─ risk/RiskBanner.tsx       # 막차 리스크 배너
│  ├─ search/SearchBar.tsx      # 목적지 검색
│  └─ location/LocationGate.tsx # GPS 권한 + 출발지 변경
├─ lib/
│  ├─ api/                      # server-only 외부 API 클라이언트
│  │  ├─ osrm.ts                # OSRM 자전거/도보 경로
│  │  ├─ odsay.ts               # 대중교통 경로
│  │  ├─ realtimeBus.ts         # 초정밀버스 실시간 위치
│  │  ├─ pbdo.ts                # 공영자전거
│  │  └─ kakao.ts               # 장소 검색 + 역지오코딩
│  ├─ domain/                   # 순수 함수 (I/O 없음, TDD)
│  │  ├─ busEta.ts              # 실시간 버스 ETA 계산
│  │  ├─ coachPrompt.ts         # AI 코칭 프롬프트 구성
│  │  ├─ risk.ts                # safe/caution/danger 등급
│  │  ├─ recommend.ts           # 추천 로직
│  │  ├─ bikeRoute.ts           # 자전거 경로 빌더
│  │  └─ odsayMapper.ts         # ODsay → BusRoute 변환
│  ├─ hooks/useBusPositions.ts  # 15s 버스 polling 훅
│  └─ store/useTripStore.ts     # Zustand 전역 상태
├─ types/                       # 도메인 + 외부 API 타입
├─ tests/                       # 100 tests (unit + integration)
└─ .env.example                 # 환경 변수 템플릿
```

---

## 라이선스 / 데이터 출처

공공데이터 활용 시 각 제공 기관의 약관을 준수합니다.

- 행정안전부 한국지역정보개발원 · 전국 공영자전거 실시간 정보 (공공데이터포털 15126639)
- 행정안전부 한국지역정보개발원 · 전국 통합데이터 초정밀버스 위치 실시간 정보 (공공데이터포털 15157601)
- ODsay LAB · 대중교통 경로 탐색 API
- Kakao Developers · 카카오맵 SDK + 로컬 API
- OSRM · Open Source Routing Machine (자전거/도보 경로)
