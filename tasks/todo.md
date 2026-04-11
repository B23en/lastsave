# 막차세이브 — 실행 체크리스트

> 기반: [`plan.md`](./plan.md) / [`../SPEC.md`](../SPEC.md)
> 사용법: 슬라이스 단위로 위에서 아래로 진행. 슬라이스가 끝나면 체크포인트로 멈춰서 수동 검증 후 다음으로.

---

## W1 — 기반 구축

### Slice P0. 프로젝트 부트스트랩 & 셸
- [ ] `pnpm create next-app@latest .` (TS, App Router, Tailwind, ESLint)
- [ ] shadcn/ui init — 기본 테마(neutral), 다크모드 class 전략
- [ ] 디렉터리 스캐폴딩: `lib/{api,domain,store}`, `types`, `tests/{unit,fixtures,e2e}`
- [ ] `tsconfig.json` strict + `noUncheckedIndexedAccess` + `noImplicitOverride`
- [ ] ESLint/Prettier 설정 (`next/core-web-vitals` + `@typescript-eslint/recommended-type-checked`)
- [ ] Vitest + MSW 설치 + hello 테스트 1개
- [ ] Playwright 설치 + smoke E2E 1개
- [ ] `.env.example` 작성 (키 이름만)
- [ ] `README.md` 기본 작성 (실행 커맨드, 환경 변수 설명)
- [ ] **검증:** `pnpm dev / typecheck / lint / test` 모두 green

### Slice P1. 카카오맵 Hello
- [ ] `react-kakao-maps-sdk` 설치
- [ ] `app/(components)/MapCanvas.tsx` 클라이언트 컴포넌트
- [ ] `app/page.tsx`에서 MapCanvas 렌더 (시청 중심 + 마커 1개)
- [ ] 지도 로드 실패 에러 바운더리
- [ ] **검증:** 모바일 360px, 데스크탑 1280px에서 풀스크린 지도 확인

### Slice P2. BFF 프록시 + TTL 캐시
- [ ] `lib/api/cache.ts` (Map 기반 TTL 15초)
- [ ] `lib/api/tago.ts` (server-only fetch wrapper)
- [ ] `lib/api/odsay.ts` (동일 패턴)
- [ ] `app/api/bus/positions/route.ts` (fixture 반환)
- [ ] `app/api/bike/stations/route.ts` (fixture 반환)
- [ ] `app/api/route/compare/route.ts` (501 placeholder)
- [ ] `tests/fixtures/` TAGO/ODsay 샘플 JSON 수집
- [ ] MSW 설정 + 통합 테스트 — 엔드포인트 200 + 스키마 일치
- [ ] **검증:** `curl` 2회 시 `X-Cache: HIT` 확인
- [ ] **검증:** `pnpm build && rg "SERVICE_KEY" .next/static` = 0건

### Slice P3. 도메인 순수 함수
- [ ] `types/trip.ts` (`Coord`, `BusRoute`, `BikeRoute`, `RiskLevel`)
- [ ] `lib/domain/eta.ts` (Haversine + 1.2m/s)
- [ ] `lib/domain/risk.ts` (safe/caution/danger 규칙)
- [ ] `lib/domain/recommend.ts` (추천 라벨)
- [ ] `tests/unit/eta.test.ts`
- [ ] `tests/unit/risk.test.ts` (경계값: 정확히 2분/5분)
- [ ] `tests/unit/recommend.test.ts` (막차 종료 케이스 포함)
- [ ] **검증:** `pnpm test -- --coverage`, 도메인 ≥ 90%

---

## ✅ Checkpoint C1 — 기반 완성
- [ ] 지도가 뜬다
- [ ] BFF가 fixture를 반환한다
- [ ] 도메인 로직이 테스트로 보호된다
- [ ] typecheck / lint / test 모두 green
- [ ] **사용자에게 확인 요청 후 W2로 진행**

---

## W2 — 데이터 연동

### Slice P4. 위치·목적지 입력 (F1 + F2 진입)
- [ ] `lib/store/useTripStore.ts` (Zustand — origin, destination, status)
- [ ] `LocationGate.tsx` — Geolocation 권한 처리 + 폴백
- [ ] 정확도 100m 초과 시 "정확도 낮음" 배지
- [ ] `app/api/kakao/search/route.ts` — 카카오 REST 프록시
- [ ] `SearchBar.tsx` — shadcn `Command` + debounce 검색
- [ ] MapCanvas가 스토어 관찰 → 마커/fitBounds 갱신
- [ ] 권한 거부 시 "지도에서 출발지 선택" 플로우
- [ ] **검증:** 실기기/HTTPS 프리뷰에서 위치 권한 분기 확인

### Slice P5. 버스 경로 슬라이스 (F2-버스)
- [ ] `lib/api/odsay.ts`에 `searchPubTransPathT` 추가
- [ ] `app/api/route/compare/route.ts` — 버스 경로 응답 구현
- [ ] `lib/domain/` ODsay 응답 → `BusRoute` 매퍼
- [ ] `CompareSheet.tsx` (shadcn `Sheet`) — 버스 카드 1개
- [ ] MapCanvas에 파란 폴리라인
- [ ] 막차 이후 케이스 → "운행 종료" 배지
- [ ] 통합 테스트 — fixture로 카드/폴리라인 props 검증
- [ ] **검증:** 서울 2지점 수동 확인 → 응답 fixture로 고정

### Slice P6. 자전거 경로 슬라이스 (F2-자전거)
- [ ] TAGO `getBicycleList` 프록시 실제 구현
- [ ] `lib/domain/bikeRoute.ts` — 최근접 거치대 선정 로직
- [ ] `app/api/route/bike/route.ts` — 카카오 Mobility Directions 프록시
- [ ] CompareSheet에 자전거 카드 추가 (두 카드 나란히)
- [ ] MapCanvas에 초록 폴리라인 + 거치대 마커
- [ ] "대여 불가" 분기 (300m 내 거치대 없음 / 잔여 0)
- [ ] **검증:** 시청↔신촌 수동 플로우

---

## W3 — 통합·실시간·리스크

### Slice P7. 비교/추천 UI 통합 (F2 완성)
- [ ] `recommend.ts` 결과를 CompareSheet에 바인딩
- [ ] 카드 탭 → 해당 폴리라인 하이라이트, 반대 디밍
- [ ] 바텀시트 드래그(vaul 또는 shadcn Drawer) 동작
- [ ] 추천 배지 UI ("더 빠름 🚲" / "더 안전함 🚌")
- [ ] Skeleton 로딩 · 에러 상태 + 재시도
- [ ] Playwright E2E — 검색→비교→탭 시나리오
- [ ] **검증:** Playwright 1개 통과

---

## ✅ Checkpoint C2 — 핵심 비교 경험 완성 (제출 최소 버전)
- [ ] 입력 → 비교 → 시각화 1사이클 실동작
- [ ] Lighthouse 모바일 ≥ 70 (미튜닝)
- [ ] E2E 1개 통과
- [ ] **사용자에게 확인 요청 + 일정 슬리피지 여부 판단**

---

### Slice P8. 실시간 마커 polling (F3)
- [ ] React Query 15초 `refetchInterval` (버스 위치)
- [ ] 선택 버스 노선만 필터링
- [ ] 거치대 마커 반경 필터링
- [ ] `document.visibilityState` hidden 시 polling 중단
- [ ] **검증:** 네트워크 탭 확인 — TAGO 원호출 ≤ 4회/분

### Slice P9. 막차 리스크 배너 (F4)
- [ ] `RiskBanner.tsx` — safe/caution/danger 시각 토큰
- [ ] 버스 카드 선택 시 `risk.ts` 호출
- [ ] 배너 CTA → 자전거 카드 포커스 전환
- [ ] 막차 종료 감지 시 처음부터 danger
- [ ] 개발 빌드 한정 `?now=23:55` 디버그 훅
- [ ] **검증:** 경계값 회귀 + 수동 시뮬

---

## W4 — 다듬기·배포·제출

### Slice P10. 반응형·다크모드·접근성 다듬기
- [ ] 360/768/1280 브레이크포인트 재점검
- [ ] `next-themes`로 다크 모드 토글
- [ ] 바텀시트 drag hit area 확대
- [ ] aria-label / 포커스 트랩
- [ ] 이미지·폰트 최적화(한글 서브셋)
- [ ] MapCanvas `dynamic({ ssr: false })`
- [ ] **검증:** Lighthouse 모바일 Performance ≥ 80, A11y ≥ 90
- [ ] **검증:** axe 스캔 — critical 이슈 0건

### Slice P11. 배포·측정·제출 패키징
- [ ] Vercel 프로젝트 연결 + 환경 변수 등록
- [ ] 프리뷰 배포 → 실기기 QA (SPEC §7.4 체크리스트)
- [ ] README 업데이트 — 실행·배포·공공데이터 출처·스크린샷
- [ ] 심야 시간대 실사용 1회 + 녹화
- [ ] 120초 시연 영상 편집 (4개 핵심 기능 등장)
- [ ] 공모전 제출 폼 준비(URL, repo, 영상)

---

## ✅ Checkpoint C3 — 제출 준비 완료
- [ ] 퍼블릭 URL + repo + 영상 준비
- [ ] 오픈 퀘스천(SPEC §11) 해소 기록
- [ ] `draft.md` 원본 보존 확인
- [ ] **제출!**

---

## 📋 매 슬라이스 공통 체크

슬라이스를 완료 상태로 표시하기 전 아래 항목 통과 필수:

- [ ] 사용자 경로 E2E 동작(클릭 가능)
- [ ] `pnpm typecheck` green
- [ ] `pnpm lint` green
- [ ] 해당 슬라이스 유닛/통합 테스트 green
- [ ] `rg "SERVICE_KEY|ODSAY_KEY" .next/static` 0건
- [ ] Conventional Commit 메시지
