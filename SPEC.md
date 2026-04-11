# 막차세이브(LastSave) — 기획·개발 SPEC

> 2026 전국 통합데이터 활용 공모전 출품작 MVP 명세서
> 작성일: 2026-04-11 / 개발 형태: 1인 / 목표 기간: 단 하루

---

## 1. 목표 (Objective)

### 1.1 한 줄 요약
심야 시간대, 사용자의 현재 위치와 목적지를 기반으로 **"지금 탑승 예정인 버스를 그대로 탈 것인가"** vs **"근처 공영자전거로 갈아탈 것인가"** 를 실시간 데이터로 비교해 **가장 빠르고 안전하게 집에 도달할 경로**를 추천하는 반응형 웹앱.

### 1.2 문제 정의
- 막차 시간대(23:00~01:30)의 사용자는 **환승 실패·배차 종료·교통 지연** 리스크를 동시에 계산하기 어렵다.
- 대부분의 지도 앱은 "현재 위치 → 목적지"의 최적 경로는 알려주지만, **"지금 타려는 버스를 놓칠 확률"**이나 **"공영자전거로 갈아타면 얼마나 빨라지는지"**는 제공하지 않는다.
- 공영자전거(따릉이/타슈 등)는 심야 대안 이동 수단으로서 저평가되어 있으며, 실시간 거치대 정보는 있으나 **막차 맥락과 결합된 추천**은 없다.

### 1.3 타깃 사용자
- **1순위:** 심야 귀가가 잦은 20–30대 직장인·대학생 (수도권/광역시)
- **2순위:** 막차 시간에 익숙하지 않은 출장·여행객
- **사용 시나리오:** 밤 11시 반, 회식 후 지하철이 끊긴 상황에서 스마트폰으로 접속 → 목적지 입력 → 두 경로를 한 화면에서 비교 → 추천 경로로 이동

### 1.4 활용 공공데이터 (공모전 요건)
| 데이터 | 제공처 | 용도 |
|---|---|---|
| 전국 공영자전거 실시간 정보 | 공공데이터포털 | 거치대 위치·잔여 자전거/거치대 수 |
| 전국 초정밀 버스 실시간 위치 정보 | 공공데이터포털 | 버스 실시간 위치·예상 도착 시각 |
| (보조) 전국 버스정류장 위치정보 | TAGO | 정류장 좌표·노선 매칭 |
| (보조) 도시철도 막차/첫차 시각표 | 공공데이터포털 | 막차 종료 판단 |

### 1.5 성공 기준 (공모전 평가축과 매칭)
- **[데이터 활용도]** 위 2개 핵심 API를 실시간 polling으로 결합하고, 가공한 지표(ETA·막차 놓침 확률·자전거 가용성)를 사용자에게 노출한다.
- **[기능 완성도]** 핵심 4개 기능(목적지 비교·지도 시각화·막차 리스크·자동 출발지)이 통합 동작한다.
- **[사용자 가치]** 심야 시간 기준 3건 이상의 실사용 테스트에서 추천 경로가 "더 빠름/더 안전함"으로 체감된다.
- **[완성도 지표(자체)]** Lighthouse Performance ≥ 80, Accessibility ≥ 90, 주요 상호작용 TTI < 3s (모바일 3G Fast).

---

## 2. 핵심 기능 및 수용 기준 (Features & Acceptance Criteria)

### F1. 사용자 위치 기반 자동 출발지 설정
- **동작:** 앱 진입 시 브라우저 Geolocation API로 현재 위치 획득 → 출발지로 자동 설정
- **수용 기준**
  - [ ] 권한 거부 시 지도에서 수동 클릭/주소 검색으로 폴백
  - [ ] 위치 정확도 100m 초과 시 "정확도 낮음" 배지 노출
  - [ ] HTTPS 환경에서만 자동 위치 동작(개발은 localhost 허용)

### F2. 목적지 입력 + 두 선택지 비교 (버스 vs 자전거)
- **동작:** 목적지 주소/POI 검색 → ODsay 대중교통 API로 **버스 경로** 계산, 동시에 공영자전거 API + 카카오맵 길찾기로 **자전거 경로** 계산 → 두 결과를 카드 UI로 나란히 제시
- **수용 기준**
  - [ ] 두 경로 모두 `총 소요시간`, `도보 시간`, `환승 수(버스)`, `자전거 주행 거리` 표시
  - [ ] 추천 뱃지("더 빠름 🚲", "더 안전함 🚌")를 규칙 기반으로 자동 부여
  - [ ] 버스 경로가 막차 이후인 경우 "운행 종료" 상태로 비활성 처리
  - [ ] 300m 이내 대여 가능한 자전거가 없으면 자전거 카드에 "대여 불가" 표시

### F3. 지도 위 실시간 경로 시각화
- **동작:** 카카오맵 위에 두 경로를 다른 색의 폴리라인으로 표시, 버스 실시간 위치 마커·자전거 거치대 마커 동시 표출
- **수용 기준**
  - [ ] 버스 마커는 15초 간격 polling으로 갱신
  - [ ] 자전거 거치대 잔여 대수를 마커 라벨로 표시
  - [ ] 사용자 위치 마커와 목적지 마커를 모두 포함하도록 fitBounds 자동 조정
  - [ ] 두 경로를 클릭/탭하여 비교 카드와 상호 하이라이트

### F4. 막차 놓침 리스크 알림
- **동작:** "버스 카드"를 선택한 순간, `사용자 → 정류장 도보시간` + `버스 ETA`를 계산해 **막차 놓침 리스크 스코어**를 산출
- **수용 기준**
  - [ ] 도보 도착 예정 시각 > 버스 도착 예정 시각 − 2분 → **빨강(위험)**
  - [ ] 여유 시간 2–5분 → **노랑(주의)**, 5분 초과 → **초록(안전)**
  - [ ] 위험/주의 등급일 때 상단에 fixed 배너로 "막차 놓칠 가능성 — 자전거 경로 권장" 제안 노출
  - [ ] 해당 노선의 막차 시각이 지난 경우 즉시 자전거 경로를 기본 추천으로 전환

### F5. (공통) 반응형 웹앱 셸
- **동작:** 모바일 퍼스트 레이아웃, PWA 수준까지는 가지 않되 홈 화면 추가 가능한 manifest는 제공
- **수용 기준**
  - [ ] 360px(모바일) / 768px(태블릿) / 1280px(데스크탑) 브레이크포인트 지원
  - [ ] 세로 모드에서 비교 카드가 지도 하단 바텀시트로 표시
  - [ ] 다크 모드(심야 사용 UX) 기본 제공

---

## 3. 기술 스택 (Tech Stack)

### 3.1 프론트엔드
- **프레임워크:** Next.js 14+ (App Router) + TypeScript (strict)
- **스타일링:** Tailwind CSS + shadcn/ui (바텀시트·카드·배지 구성 편의)
- **상태 관리:** Zustand (전역 경로·사용자 위치), React Query(TanStack Query) (API 캐시·polling)
- **지도:** 카카오맵 JavaScript SDK (`react-kakao-maps-sdk`)
- **대중교통 라우팅:** ODsay LAB `searchPubTransPathT` API
- **자전거 경로:** 카카오 Mobility Directions API (보행자+자전거 대체)
- **위치:** 브라우저 Geolocation API

### 3.2 백엔드 / 데이터
- **서버:** Next.js Route Handlers (`app/api/*`)로 BFF 구성
  - 공공 API 키는 **서버 측에서만** 주입 (노출 금지)
  - 클라이언트는 `/api/bus`, `/api/bike`, `/api/route` 엔드포인트만 호출
- **외부 API**
  - 국토교통부 TAGO `getCtyCodeBusPosInfo` — 버스 실시간 위치
  - 국토교통부 TAGO `getBicycleList` — 공영자전거 거치대
  - ODsay `searchPubTransPathT` — 대중교통 경로
  - (옵션) 카카오 로컬 API — 주소·POI 검색
- **캐시:** TAGO 응답은 서버 메모리 TTL 15초 캐시(중복 호출 비용 절감)

### 3.3 배포 & 운영
- **호스팅:** Vercel (공모전 심사용 퍼블릭 URL 1-click 배포)
- **환경변수:** `KAKAO_MAP_KEY`, `ODSAY_KEY`, `TAGO_SERVICE_KEY` (Vercel Project Settings)
- **모니터링:** Vercel Analytics + Sentry(무료 티어) 에러 추적
- **도메인:** `lastsave.vercel.app` (임시)

---

## 4. 명령어 (Commands)

```bash
# 개발
pnpm install              # 의존성 설치
pnpm dev                  # 로컬 개발 서버 (http://localhost:3000)
pnpm dev --turbo          # Turbopack 빠른 HMR

# 품질 게이트
pnpm typecheck            # tsc --noEmit
pnpm lint                 # ESLint (next/core-web-vitals + @typescript-eslint)
pnpm format               # Prettier 일괄 포맷
pnpm test                 # Vitest 단위 테스트
pnpm test:watch           # Vitest watch 모드
pnpm test:e2e             # Playwright E2E (모바일 뷰포트 포함)

# 빌드 & 배포
pnpm build                # Next.js 프로덕션 빌드
pnpm start                # 빌드 결과 로컬 기동
vercel --prod             # Vercel 수동 프로덕션 배포

# 데이터 도구
pnpm data:sample          # TAGO 샘플 응답 fixtures로 저장 (오프라인 개발용)
```

---

## 5. 프로젝트 구조 (Project Structure)

```
2026전국통합데이터활용공모전/
├─ draft.md                     # 초기 기획 초안 (원본 유지)
├─ SPEC.md                      # 본 문서
├─ README.md                    # 실행·배포 안내
├─ app/
│  ├─ layout.tsx                # 루트 레이아웃(다크 모드 기본)
│  ├─ page.tsx                  # 메인: 지도 + 바텀시트
│  ├─ api/
│  │  ├─ route/compare/route.ts # 버스/자전거 경로 비교 BFF
│  │  ├─ bus/positions/route.ts # 버스 실시간 위치 프록시
│  │  └─ bike/stations/route.ts # 공영자전거 거치대 프록시
│  └─ (components)/
│     ├─ MapCanvas.tsx          # 카카오맵 래퍼
│     ├─ CompareSheet.tsx       # 버스/자전거 비교 바텀시트
│     ├─ RiskBanner.tsx         # 막차 리스크 배너
│     └─ SearchBar.tsx          # 목적지 검색
├─ lib/
│  ├─ api/
│  │  ├─ tago.ts                # TAGO 클라이언트 (서버 전용)
│  │  ├─ odsay.ts               # ODsay 클라이언트 (서버 전용)
│  │  └─ kakao.ts               # 카카오 REST 유틸
│  ├─ domain/
│  │  ├─ risk.ts                # 막차 리스크 스코어 계산
│  │  ├─ recommend.ts           # 버스 vs 자전거 추천 규칙
│  │  └─ eta.ts                 # ETA·도보 시간 헬퍼
│  └─ store/
│     └─ useTripStore.ts        # Zustand 스토어
├─ types/
│  ├─ tago.d.ts                 # TAGO 응답 타입
│  ├─ odsay.d.ts                # ODsay 응답 타입
│  └─ trip.ts                   # 도메인 모델 (Route, Leg, RiskLevel 등)
├─ tests/
│  ├─ unit/
│  │  ├─ risk.test.ts
│  │  └─ recommend.test.ts
│  ├─ fixtures/                 # 공공 API 샘플 응답
│  └─ e2e/
│     └─ compare.spec.ts        # 목적지 검색 → 비교 플로우
├─ public/
│  ├─ icons/
│  └─ manifest.webmanifest
├─ .env.example                 # 키 이름만 나열, 실제 값 금지
├─ next.config.mjs
├─ tsconfig.json                # strict: true
├─ tailwind.config.ts
├─ package.json
└─ pnpm-lock.yaml
```

---

## 6. 코드 스타일 (Code Style)

- **언어:** TypeScript `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` 활성화
- **파일명:** 컴포넌트 `PascalCase.tsx`, 유틸/도메인 `camelCase.ts`, 라우트 `route.ts` (Next 규약)
- **컴포넌트 원칙**
  - 서버 컴포넌트를 기본값으로 두고, 지도/상호작용이 필요한 경우에만 `"use client"`
  - props 인터페이스를 `{ComponentName}Props`로 명명, 파일 상단에 선언
- **함수 원칙**
  - 도메인 로직(`lib/domain/*`)은 순수 함수로 작성하고, 외부 I/O는 `lib/api/*`에 격리
  - API 핸들러는 입력 파싱 → 도메인 호출 → 응답 직렬화 3단계로만 구성
- **네이밍**
  - 시간 단위는 변수명에 명시: `etaSec`, `walkMin`, `lastBusAt`
  - 리스크 등급 enum: `RiskLevel = "safe" | "caution" | "danger"`
- **린팅:** ESLint (`next/core-web-vitals`, `@typescript-eslint/recommended-type-checked`), Prettier 2스페이스
- **커밋 메시지:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **주석 원칙:** "왜"만 적고 "무엇"은 적지 않는다. 한국어/영어 혼용 허용.

---

## 7. 테스트 전략 (Testing Strategy)

### 7.1 단위 테스트 (Vitest)
- **대상:** `lib/domain/*` 순수 함수 전부
  - `risk.ts`: 입력(도보시간, 버스ETA, 현재시각)에 대한 등급 산출
  - `recommend.ts`: 버스/자전거 소요시간·리스크 기반 추천 태그 부여
  - `eta.ts`: 좌표·보행속도에서 도보 시간 추정
- **목표 커버리지:** 도메인 로직 ≥ 90% line coverage

### 7.2 통합 테스트
- **대상:** `app/api/*` Route Handlers
- **방식:** fixtures(`tests/fixtures/`)에 저장된 TAGO/ODsay 응답 JSON을 MSW로 주입, BFF 응답 스키마 검증
- **목표:** 핵심 3개 엔드포인트 happy path + 에러 경로(키 만료·빈 응답·막차 종료)

### 7.3 E2E 테스트 (Playwright)
- **시나리오:**
  1. 초기 로드 시 위치 권한 prompt 처리(허용/거부 분기)
  2. 목적지 검색 → 두 카드 렌더링 → 추천 배지 노출
  3. 모바일 뷰포트(Pixel 5)에서 바텀시트 드래그 동작
- **실행 환경:** CI는 생략, 로컬 수동 실행(1인/1개월 현실성 고려)

### 7.4 수동 검증 체크리스트
- [ ] 심야 시간대(23:30~00:30) 실제 위치에서 1회 이상 end-to-end 실사용
- [ ] 서울(따릉이) + 타 지역(타슈/ 누비자) 1곳 이상에서 자전거 데이터 수신 확인
- [ ] Lighthouse 모바일 리포트 스코어 기록(README에 첨부)

---

## 8. 경계 (Boundaries)

### 8.1 Always Do (항상 이렇게)
- 공공 API 키는 **서버 사이드**에서만 사용한다 (`app/api/*`에서만 로드).
- TAGO/ODsay 응답은 서버에서 **TTL 캐시**하여 호출량을 절감한다.
- 모든 시간·거리 값에는 단위를 변수명·UI 라벨에 명시한다.
- 위치/시간 관련 테스트에서는 `Date.now`를 고정(Vitest `vi.useFakeTimers`).
- UI 문구·에러 메시지는 한국어를 1차 언어로, 보조적으로 영어를 둔다.

### 8.2 Ask First (먼저 물어보기)
- 새로운 외부 API·의존성 추가 (비용·라이선스 이슈 가능)
- 공공데이터 원천을 바꾸거나 추가(공모전 심사 제출 대상 API가 바뀜)
- 경로 추천 규칙(`recommend.ts`)의 기준 변경
- 호스팅/배포 대상 변경 (Vercel → 타 플랫폼)
- 디자인 시스템/토큰 대규모 변경

### 8.3 Never Do (절대 금지)
- API 키·시크릿을 클라이언트 번들, 커밋, 스크린샷에 노출하지 않는다.
- 심야 시간대 사용자 위치를 서버에 저장·로그하지 않는다(개인정보 최소화).
- 정확도 없는 "추정값"을 실제 데이터처럼 표시하지 않는다(반드시 `추정` 라벨 부착).
- `draft.md`를 덮어쓰거나 삭제하지 않는다 — 원본 기획 히스토리 보존.
- 공모전 데이터 제공처의 이용 약관을 위반하는 캐시 저장·재배포를 하지 않는다.

---

## 9. 일정 (1인 개발 / ~1개월 단기)

| 주차 | 목표 | 산출물 |
|---|---|---|
| W1 | 환경·데이터 파이프라인 | Next 프로젝트, TAGO/ODsay 서버 프록시, fixtures |
| W2 | 지도·비교 UI | 카카오맵 렌더, 비교 카드·바텀시트, 목적지 검색 |
| W3 | 리스크·추천 로직 | `risk.ts`·`recommend.ts` + 단위 테스트, 실시간 polling |
| W4 | 다듬기·배포·영상 | Lighthouse 튜닝, 다크모드, Vercel 배포, 제출 영상 녹화 |

**버퍼:** 각 주 마지막 하루는 슬랙 타임. 슬리피지가 주 단위를 넘기면 F4(리스크 알림) 범위를 축소하는 방향으로 포기 우선순위를 둔다.

---

## 10. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| TAGO API 트래픽 제한/지연 | 실시간성 저하 | 15초 서버 캐시 + 지수 백오프, fixtures 폴백 |
| ODsay 라우팅 정책 변경 | 대중교통 경로 오류 | 응답 스키마 버전 감지 + 사용자 에러 메시지 |
| Geolocation 거부율 | F1 사용성 | 주소 검색·지도 탭 폴백을 1순위 UX로 유지 |
| 공영자전거 지역 커버리지 편차 | 타 지역 사용성 | 지역별 데이터 가용성 배너, 서울 우선 최적화 |
| 1인 일정 슬리피지 | 제출 실패 | W3 종료 시점 "제출 가능 버전" 태깅 후 이후는 개선만 |

---

## 11. 오픈 퀘스천 (사용자 확인 필요)

1. **앱 이름 확정:** "막차세이브(LastSave)"로 본 명세에 썼습니다. 더 선호하는 이름이 있나요?
2. **1차 타깃 지역:** MVP는 **서울(따릉이) 우선**으로 최적화할 예정입니다. 타 지역 우선이 필요한가요?
3. **공모전 제출물 범위:** 퍼블릭 URL + 소스 저장소 + 시연 영상 3종 기준으로 준비하면 되나요?
4. **디자인 리소스:** 로고·컬러 팔레트를 직접 정할지, 기본 shadcn 테마로 갈지.

---

*이 SPEC은 살아있는 문서입니다. 구현 중 의사결정이 바뀌면 해당 섹션을 업데이트하고, 중요한 변경은 커밋 메시지에 `docs(spec):` 프리픽스로 남깁니다.*
