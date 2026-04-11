# 막차세이브(LastSave) — 구현 계획

> 기반 문서: [`SPEC.md`](../SPEC.md)
> 작성일: 2026-04-11
> 원칙: **수직 슬라이싱** — 각 슬라이스는 UI → API → 도메인 → 외부연동까지 완결된 경로를 내놓는다. 수평 레이어("모든 타입 먼저", "모든 API 클라이언트 먼저")로 쌓지 않는다.

---

## 0. 컨텍스트 요약

- **타깃:** 심야 귀가자(서울·따릉이 우선), 반응형 웹앱
- **핵심 가치:** 버스 그대로 타기 vs 자전거로 갈아타기 → 실시간 비교 + 막차 놓침 리스크 알림
- **스택:** Next.js 14 App Router + TypeScript strict, Tailwind + shadcn/ui (기본 테마 확정), Zustand + React Query, 카카오맵 SDK, ODsay, TAGO
- **배포:** Vercel
- **일정:** 1인 / 약 4주

---

## 1. 의존성 그래프

```
                ┌──────────────────────────┐
                │  P0. Bootstrap & Shell   │  ← 모든 슬라이스의 선행
                └────────────┬─────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌───────────────────┐ ┌──────────────┐ ┌────────────────────┐
│ P1. Hello Kakao   │ │ P2. BFF 프록 │ │ P3. 도메인 순수함수 │
│     Map           │ │   시 + 캐시  │ │   (risk/reco/eta)  │
└────────┬──────────┘ └──────┬───────┘ └──────────┬─────────┘
         │                   │                    │
         └───────────┬───────┴────────────────────┘
                     ▼
       ┌──────────────────────────────┐
       │ P4. 위치·목적지 입력(F1·F2a) │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P5. 버스 경로 슬라이스(F2-버)│
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P6. 자전거 경로 슬라이스(F2-자)│
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P7. 비교/추천 UI (F2 통합)   │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P8. 실시간 마커 polling (F3) │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P9. 막차 리스크 배너 (F4)    │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P10. 반응형·다크모드 다듬기  │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ P11. 배포·측정·제출 패키징   │
       └──────────────────────────────┘
```

- **P1/P2/P3는 병렬 가능** — UI 뼈대, BFF 프록시, 순수 도메인 함수는 독립
- **P4 이후는 직렬** — 수직 슬라이스가 누적되며 앱의 핵심 경로가 완성됨
- **P8은 P7 완료 시점에 시작 가능하지만, 데이터 스트림은 P2에서 이미 검증되어야 함**

---

## 2. 수직 슬라이스 목록

각 슬라이스는 **완결된 사용자 경로 한 줄**을 제공한다. 끝나면 `pnpm dev`에서 실제로 동작해야 한다.

---

### 🎯 Slice P0 — 프로젝트 부트스트랩 & 셸
**목표:** 빈 레포에서 `pnpm dev` → localhost:3000 → "막차세이브" 랜딩이 보인다.

**작업**
1. `pnpm create next-app@latest .` (TS, App Router, Tailwind, ESLint)
2. shadcn/ui init (기본 테마 — neutral/slate, 다크 모드 class 전략)
3. 디렉터리 스캐폴딩 (`lib/api`, `lib/domain`, `lib/store`, `types`, `tests/{unit,fixtures,e2e}`)
4. `tsconfig.json` strict + `noUncheckedIndexedAccess`, `noImplicitOverride`
5. ESLint `next/core-web-vitals` + `@typescript-eslint/recommended-type-checked`, Prettier
6. Vitest + Playwright + MSW 설치 및 hello 테스트 1개 통과
7. `.env.example`에 키 이름만 — `KAKAO_MAP_KEY`, `KAKAO_REST_KEY`, `ODSAY_KEY`, `TAGO_SERVICE_KEY`
8. `README.md`에 실행 커맨드·환경 변수 가이드

**수용 기준**
- [ ] `pnpm dev` → 기본 페이지에 "LastSave" 문구와 다크/라이트 토글 placeholder 노출
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` 모두 통과
- [ ] `.env.example`만 커밋, 실제 키는 커밋 금지

**검증 단계**
- 로컬에서 `pnpm dev` 실행 후 브라우저 확인
- `pnpm test`에서 더미 유닛 테스트 `it("boots")` 통과
- `git status` — 키 누락 없음

---

### 🎯 Slice P1 — 카카오맵 Hello (지도 표출만)
**목표:** 메인 페이지에 카카오맵이 **서울 시청 중심**으로 렌더되고, 한 개의 마커(시청)가 찍힌다.

**작업**
1. `react-kakao-maps-sdk` 설치
2. `app/(components)/MapCanvas.tsx` 클라이언트 컴포넌트 작성
3. `app/page.tsx`에서 MapCanvas 렌더
4. `next.config.mjs`에 카카오 도메인 스크립트 로드 처리

**수용 기준**
- [ ] 카카오맵이 전체 뷰포트에 렌더
- [ ] 시청 마커 표시
- [ ] 맵 로드 실패 시 에러 바운더리 문구 노출

**검증 단계**
- 모바일 에뮬레이션(360px)에서도 지도 영역이 풀스크린으로 나오는지 확인

---

### 🎯 Slice P2 — BFF 프록시 스켈레톤 + TTL 캐시
**목표:** `/api/bus/positions`, `/api/bike/stations` 가 **fixture**를 반환한다. (실제 TAGO 연결은 후속)

**작업**
1. `lib/api/tago.ts` — fetch wrapper, 서버 전용 모듈 표시(`import "server-only"`)
2. `lib/api/odsay.ts` — 동일 패턴
3. 메모리 TTL 캐시 유틸 `lib/api/cache.ts` (Map + timestamp, TTL 15초)
4. 라우트 핸들러 3개 작성:
   - `app/api/bus/positions/route.ts`
   - `app/api/bike/stations/route.ts`
   - `app/api/route/compare/route.ts` (우선 501 Not Implemented)
5. `tests/fixtures/` 에 TAGO/ODsay 샘플 JSON 수집(공식 샘플 응답 → 민감 필드 제거)
6. MSW 설치 + `tests/setup.ts`에서 fixture 응답 주입
7. 통합 테스트 — 각 엔드포인트가 200 + 스키마 일치

**수용 기준**
- [ ] 개발 모드에서 `curl http://localhost:3000/api/bus/positions?cityCode=11` → 샘플 JSON 반환
- [ ] 동일 요청 15초 내 반복 시 캐시 히트(`X-Cache: HIT` 헤더)
- [ ] 클라이언트 번들에 키 문자열이 포함되지 않음(`rg TAGO_SERVICE_KEY .next/static` 0건)

**검증 단계**
- curl 2회 실행 후 응답 시간 비교
- `pnpm build && rg "SERVICE_KEY" .next/static` 실행 결과 0건

---

### 🎯 Slice P3 — 도메인 순수 함수 + 단위 테스트
**목표:** `lib/domain/*` 에 `risk`, `recommend`, `eta`를 작성하고 단위 테스트로 완성한다. UI 연결은 없음.

**작업**
1. `types/trip.ts` — `Coord`, `RouteLeg`, `BusRoute`, `BikeRoute`, `RiskLevel` 타입 정의
2. `lib/domain/eta.ts` — Haversine + 평균 보행 속도(1.2m/s)로 도보 시간 추정
3. `lib/domain/risk.ts` — 입력(도보시간, 버스ETA, 현재시각, 막차시각) → `safe|caution|danger`
4. `lib/domain/recommend.ts` — 두 경로의 소요시간·리스크로 추천 라벨 반환
5. `tests/unit/eta.test.ts`, `risk.test.ts`, `recommend.test.ts` — 경계 케이스 포함(등차 2분, 5분 경계)
6. Vitest `vi.useFakeTimers`로 시간 고정

**수용 기준**
- [ ] 도메인 3개 모듈 라인 커버리지 ≥ 90%
- [ ] 경계 케이스: 여유 2분 정확히 → `caution`, 5분 정확히 → `safe`
- [ ] 막차 종료 후 호출 시 `recommend()` 는 자전거 우선 반환

**검증 단계**
- `pnpm test -- --coverage` 결과 첨부
- 리뷰: 각 함수는 I/O 없이 순수하게 인자만으로 동작하는가

---

### ✅ Checkpoint C1 — 기반 완성
> P0–P3 완료 후 멈춰서 수동 확인. 이 체크포인트를 통과해야 P4로 간다.

- [ ] 지도가 뜬다
- [ ] BFF가 fixture를 반환한다
- [ ] 도메인 로직이 테스트로 보호된다
- [ ] 린트·타입체크·테스트 모두 green

---

### 🎯 Slice P4 — 위치·목적지 입력 (F1 + F2 진입)
**목표:** 사용자가 앱을 열면 **자동 출발지 설정 → 목적지 검색창으로 POI 선택 → 두 마커가 지도에 뜬다**. (경로 비교 아직 없음)

**작업**
1. `lib/store/useTripStore.ts` — Zustand (origin, destination, status)
2. `app/(components)/LocationGate.tsx` — Geolocation 권한 요청 + 실패 폴백 안내
3. `app/(components)/SearchBar.tsx` — 카카오 로컬 API 주소/키워드 검색
4. `app/api/kakao/search/route.ts` — 카카오 REST 프록시(키 서버 격리)
5. MapCanvas가 스토어의 origin/destination을 관찰하여 마커·fitBounds 갱신
6. 권한 거부 시 수동 지도 탭으로 출발지 지정 가능

**수용 기준**
- [ ] 위치 권한 허용 → 출발지 마커가 현재 위치로 찍힌다
- [ ] 권한 거부 → 배너 노출 + "지도에서 선택" 동작
- [ ] 목적지 검색창에서 "강남역" 입력 → 3개 이상 제안 → 선택 시 마커 + fitBounds
- [ ] 정확도 100m 초과 시 "정확도 낮음" 배지

**검증 단계**
- 실제 기기(HTTPS tunnel — `pnpm dlx localtunnel` 또는 Vercel preview)에서 위치 권한 플로우 확인
- 권한 거부 케이스 수동 테스트

---

### 🎯 Slice P5 — 버스 경로 슬라이스 (F2-버스)
**목표:** 출발지·목적지가 세팅되면 **ODsay로 대중교통 경로 1건을 계산해서 카드 1개로 표시**하고, 지도에 파란 폴리라인을 그린다.

**작업**
1. `lib/api/odsay.ts`에 `searchPubTransPathT` 호출 함수 추가
2. `app/api/route/compare/route.ts` — origin/destination 입력 → ODsay 결과 파싱 → `BusRoute` 도메인 모델로 매핑
3. `app/(components)/CompareSheet.tsx` — 바텀시트(shadcn `Sheet`)에 버스 카드 1개 렌더
4. MapCanvas에 폴리라인 그리기 (카카오 `Polyline`)
5. 막차 종료 판정 — ODsay 응답이 없거나 지하철 막차 이후면 "운행 종료"
6. 통합 테스트 — fixture로 버스 응답 주입 시 카드/폴리라인 props 검증

**수용 기준**
- [ ] 서울 임의 두 지점 입력 시 버스 카드에 `총 소요시간`, `환승 수`, `도보 시간` 표시
- [ ] 지도에 해당 경로 폴리라인 표출
- [ ] 막차 이후 케이스 → "운행 종료" 배지

**검증 단계**
- 실제 ODsay 응답으로 한 번 수동 확인 후, fixture로 저장 → 단위/통합 테스트 고정

---

### 🎯 Slice P6 — 자전거 경로 슬라이스 (F2-자전거)
**목표:** 같은 입력으로 **근처 공영자전거 거치대 → 도보로 이동 → 자전거 주행 → 목적지 근처 거치대 → 도보**의 자전거 경로를 계산·표시.

**작업**
1. TAGO `getBicycleList` 프록시 완성 — `/api/bike/stations?lat&lng&radius`
2. `lib/domain/bikeRoute.ts` — 출발지 기준 최근접 거치대·도착지 기준 최근접 거치대 선정(잔여 자전거/거치대 고려)
3. 카카오 Mobility Directions(자전거/보행자) API 프록시 — `/api/route/bike`
4. `CompareSheet`에 자전거 카드 추가 (두 카드 나란히)
5. MapCanvas에 초록 폴리라인 + 거치대 마커
6. 대여 가능 자전거 0 또는 300m 내 거치대 없음 → "대여 불가" 카드

**수용 기준**
- [ ] 자전거 카드에 `총 소요시간`, `주행거리`, `출발 거치대 잔여`, `도착 거치대 반납 여유` 표시
- [ ] 가용 거치대 없을 때 카드가 비활성 상태
- [ ] 지도에 자전거 경로 폴리라인 + 거치대 마커

**검증 단계**
- 서울 시청 ↔ 신촌 케이스로 수동 검증
- 300m 내 거치대 없는 지점(가상)으로 "대여 불가" 분기 확인

---

### 🎯 Slice P7 — 비교/추천 UI 통합 (F2 완성)
**목표:** 두 카드가 나란히 뜨고, 추천 배지가 자동 부여되며, 카드-폴리라인 상호 하이라이트가 동작.

**작업**
1. `lib/domain/recommend.ts`를 CompareSheet에 연결
2. 카드 호버/탭 시 해당 폴리라인 강조 + 반대 카드 디밍
3. 모바일 바텀시트 드래그(접힘/펼침) 동작 — shadcn `Sheet` + `Drawer` 조합 또는 `vaul`
4. 추천 배지 ("더 빠름 🚲", "더 안전함 🚌") — 이모지 허용(UI 정보성)
5. 로딩 상태(Skeleton) + 에러 상태 처리

**수용 기준**
- [ ] 두 카드가 동시에 렌더, 최소 하나에 추천 배지가 달림
- [ ] 카드 탭 → 지도 하이라이트 갱신 < 150ms
- [ ] 에러 시 사용자 언어로 설명 + 재시도 버튼

**검증 단계**
- Playwright E2E: 목적지 검색 → 두 카드 → 탭 → 하이라이트

---

### ✅ Checkpoint C2 — 핵심 비교 경험 완성
> P4–P7 완료 후 멈춤. 공모전 제출의 **최소 버전**은 여기서 이미 완성됨. 이후는 임팩트 강화.

- [ ] 출발지/목적지 입력 → 버스/자전거 카드 비교 → 지도 시각화 한 사이클이 실동작
- [ ] Lighthouse 모바일 ≥ 70 (미튜닝 상태)
- [ ] E2E 1개 통과

**⚠️ 일정 슬리피지 시:** 이 지점에서 P8/P9를 포기하고 P10/P11로 스킵하는 옵션을 고려한다(SPEC §9의 버퍼 전략).

---

### 🎯 Slice P8 — 실시간 마커 polling (F3)
**목표:** 지도 위 버스 위치가 **15초마다 갱신**되고, 자전거 거치대 잔여 대수도 실시간 라벨로 갱신.

**작업**
1. React Query로 `/api/bus/positions` 15초 `refetchInterval`
2. 선택된 버스 노선만 필터링(비교 카드에서 선택한 노선 ID 기준)
3. 거치대 마커 — 출발/도착 반경 내만 렌더(성능 고려)
4. 가시성 변경 시 polling 일시 중단 (`document.visibilityState`)

**수용 기준**
- [ ] 버스 마커가 이동하는 모습이 보인다(육안 확인 수준이면 충분)
- [ ] 탭 백그라운드 시 네트워크 탭에서 polling 중단 확인
- [ ] 서버 캐시 덕분에 클라이언트 15초 polling에도 TAGO 원호출은 ≤ 4회/분

**검증 단계**
- 네트워크 탭 + 개발자 도구 Performance에서 확인

---

### 🎯 Slice P9 — 막차 리스크 배너 (F4)
**목표:** 버스 카드 선택 시 **상단 고정 배너**에 리스크 등급과 권장 행동 메시지.

**작업**
1. `lib/domain/risk.ts` 연결 — (도보시간, 버스ETA, 현재시각)
2. `RiskBanner.tsx` — safe(초록) / caution(노랑) / danger(빨강) 시각 토큰
3. 위험/주의 시 "자전거 경로 권장" CTA → 탭 시 자전거 카드로 포커스 전환
4. 막차 종료 후 진입 시 배너가 처음부터 danger

**수용 기준**
- [ ] 2분 이내 여유 → danger 배너 + CTA
- [ ] 5분 초과 → safe (배너 미노출 또는 축약)
- [ ] CTA 클릭 → 자전거 카드 강조 + 지도 하이라이트

**검증 단계**
- Vitest로 `risk.ts` 경계값 회귀
- 수동: 시간대를 `vi`로 조작하지 말고, URL 쿼리 `?now=23:55` 디버그 훅으로 시뮬(개발 빌드에서만)

---

### 🎯 Slice P10 — 반응형·다크모드·접근성 다듬기
**목표:** Lighthouse Performance ≥ 80, Accessibility ≥ 90.

**작업**
1. 360/768/1280 브레이크포인트 재점검
2. 다크 모드 기본 켜짐, 토글 제공 (`next-themes`)
3. 바텀시트 드래그 영역 hit area 확대
4. 대체 텍스트·aria-label·포커스 트랩(검색 모달)
5. 이미지/아이콘 최적화, 폰트 서브셋(한글)
6. Code splitting — MapCanvas는 `dynamic({ ssr: false })`

**수용 기준**
- [ ] Lighthouse 모바일 Performance ≥ 80, Accessibility ≥ 90
- [ ] 주요 상호작용 TTI < 3s (모바일 3G Fast)
- [ ] 다크 모드에서 대비(contrast ratio) 4.5:1 이상

**검증 단계**
- Lighthouse 리포트 3회 측정 평균
- `axe` 브라우저 확장으로 접근성 스캔

---

### 🎯 Slice P11 — 배포·측정·제출 패키징
**목표:** Vercel 배포된 퍼블릭 URL + 소스 + 시연 영상.

**작업**
1. Vercel 프로젝트 연결, 환경 변수 등록
2. 프리뷰 배포 링크로 실기기 QA 체크리스트 실행(SPEC §7.4)
3. README에 실행·배포·주요 기능 스크린샷
4. 심야 시간대 실사용 1회 + 녹화 → 제출용 2분 영상
5. 공모전 제출 폼 작성 준비 (URL, repo, 영상)

**수용 기준**
- [ ] 퍼블릭 URL에서 전체 플로우 동작
- [ ] README에 공공데이터 활용 내역 표 + 출처 명시
- [ ] 시연 영상 120초 이내, 4가지 핵심 기능 모두 등장

**검증 단계**
- 다른 기기(아이폰 or 안드로이드)에서 퍼블릭 URL 접속 교차 확인

---

### ✅ Checkpoint C3 — 제출 준비 완료
> P8–P11 중 일부가 컷되어도 이 체크포인트는 통과해야 한다.

- [ ] 공공 URL + repo + 영상 준비
- [ ] 오픈 퀘스천(SPEC §11) 해소 기록
- [ ] `draft.md` 원본 보존 확인

---

## 3. 슬라이스 × 일정 매핑 (4주 버전)

| 주차 | 슬라이스 | 비고 |
|---|---|---|
| **W1** | P0 → P1 → P2 → P3 | P1/P2/P3 일부 병행 가능. 주말까지 Checkpoint C1 |
| **W2** | P4 → P5 → P6 | 데이터 연동 주간. 실제 API 키 발급 병행 |
| **W3** | P7 → (C2) → P8 → P9 | C2 통과가 제출 최소 버전 — 여기까지가 데드라인 마지노선 |
| **W4** | P10 → P11 (C3) | 튜닝 + 배포 + 영상. 금요일 제출 |

---

## 4. 리스크 · 트레이드오프

| 이슈 | 옵션 | 선택 기준 |
|---|---|---|
| TAGO 실시간 버스 API 키 발급 지연 | (A) fixture만으로 P5·P8 진행 / (B) 지연 시 P8 단축 | 키가 W1 내 도착하면 A, 아니면 B |
| ODsay 자전거 경로 미지원 | 카카오 Mobility 대체 사용 중 — 구조는 유지, 클라이언트만 교체 가능 | 유지 |
| 자전거 가용성 낮은 지역(서울 외) | MVP는 서울 우선, 타 지역은 "지역 커버리지 안내" 배너 | 유지 |
| 1인 일정 슬리피지 | C2 이후 P8/P9 일부 컷 | W3 중반 버퍼 체크 |
| 키 노출 사고 | 커밋 훅 + `.env.example` + 빌드 산출물 grep 검사 | 항상 실행 |

---

## 5. 수직 슬라이스 점검 체크리스트 (각 슬라이스 완료 시)

- [ ] **E2E 동작:** 이 슬라이스가 제공하는 사용자 경로가 실제 앱에서 클릭 가능한가?
- [ ] **타입체크 통과:** `pnpm typecheck`
- [ ] **린트 통과:** `pnpm lint`
- [ ] **테스트 통과:** 해당 슬라이스 도메인·API 유닛/통합
- [ ] **키 노출 無:** `rg "SERVICE_KEY|ODSAY_KEY" .next/static` 0건
- [ ] **커밋 메시지:** Conventional Commits 규약 준수

---

## 6. 다음 단계

1. 이 계획서 리뷰 → 승인
2. 승인 후 `tasks/todo.md`의 체크박스를 따라 구현 개시
3. 슬라이스 1개 끝날 때마다 todo.md 체크 + 커밋

---

*SPEC.md와 본 plan은 살아있는 문서입니다. 구현 중 의사결정이 바뀌면 plan의 해당 슬라이스를 업데이트하고, 체크포인트에서 재검증합니다.*
