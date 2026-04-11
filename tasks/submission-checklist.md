# 막차세이브 — 공모전 제출 체크리스트

> 기반: [`plan.md`](./plan.md) · Checkpoint C3 (제출 준비 완료)

---

## 1. 서비스 키 & 활성화

| 항목 | 상태 | 비고 |
|---|---|---|
| [ ] 카카오 Developers 앱 생성 | | LastSave |
| [ ] JavaScript 키 발급 | | `NEXT_PUBLIC_KAKAO_MAP_KEY` |
| [ ] REST API 키 발급 | | `KAKAO_REST_KEY` |
| [ ] 카카오맵 서비스 ON | | 제품 설정 → 카카오맵 |
| [ ] Web 플랫폼 도메인에 `http://localhost:3000` 등록 | | 개발용 |
| [ ] Web 플랫폼 도메인에 프로덕션 URL 등록 | | 배포 후 추가 |
| [ ] ODsay LAB 애플리케이션 생성 + apiKey | | `ODSAY_KEY` |
| [ ] 공공데이터포털 로그인 | | |
| [ ] 15157601 전국 통합데이터 초정밀버스 활용신청 (자동승인) | | `REALTIME_BUS_SERVICE_KEY` |
| [ ] 15126639 전국 공영자전거 실시간 활용신청 (자동승인) | | `PUBLIC_BIKE_SERVICE_KEY` |
| [ ] 공공데이터포털 키 전파 대기 완료 (30분~2시간) | | 502 사라짐 확인 |

## 2. 로컬 최종 검증

- [ ] `pnpm install` 성공
- [ ] `.env.local` 에 5개 키 모두 채움
- [ ] `pnpm dev` → http://localhost:3000 정상 로드
- [ ] 지도 렌더 확인 (서울 시청 중심)
- [ ] 위치 권한 허용 → 출발지 마커 표시
- [ ] 목적지 "강남역" 검색 → 드롭다운 제안 → 선택
- [ ] 하단에 버스·자전거 카드 두 개 표시
- [ ] 파란 버스 폴리라인 + 초록 자전거 폴리라인 + 거치대 마커 렌더
- [ ] 추천 배지가 한쪽에 표시됨
- [ ] 버스 카드 탭 → 지도에 실시간 버스 마커 (polling 동작)
- [ ] 바텀시트 grab handle 클릭 → 접힘/펼침
- [ ] 다크/라이트 테마 토글 동작
- [ ] `?now=00:28` → RiskBanner "막차 놓칠 가능성 높음" 표시
- [ ] 권한 거부 시나리오 → "지도에서 출발지 선택" 플로우
- [ ] 360px(모바일) 뷰포트에서 레이아웃 확인
- [ ] 1280px(데스크탑) 뷰포트에서 레이아웃 확인

## 3. 품질 게이트

- [ ] `pnpm typecheck` green
- [ ] `pnpm lint` green
- [ ] `pnpm test` green (≥ 82 tests)
- [ ] `pnpm test:coverage` 도메인 ≥ 90%
- [ ] `pnpm build` green
- [ ] API 키 번들 누출 검사:
  ```bash
  rg "REALTIME_BUS_SERVICE_KEY|ODSAY_KEY|KAKAO_REST_KEY|PUBLIC_BIKE_SERVICE_KEY" .next/static
  ```
  → 0건

## 4. Lighthouse (모바일)

- [ ] Performance ≥ 80
- [ ] Accessibility ≥ 90
- [ ] Best Practices ≥ 90
- [ ] SEO ≥ 90

측정 명령:
```bash
pnpm build && pnpm start &
npx lighthouse http://localhost:3000 --view --output=html
```

스크린샷을 `tasks/lighthouse/` 폴더에 저장하고 파일명을 `YYYY-MM-DD-lighthouse-mobile.html` 로.

## 5. Vercel 배포

- [ ] Vercel 계정 생성 + GitHub 연동
- [ ] `pnpm dlx vercel` 로 프로젝트 초기화
- [ ] 환경 변수 5개 모두 등록 (Production)
- [ ] 프로덕션 배포 성공
- [ ] 퍼블릭 URL 기록: `https://___________.vercel.app`
- [ ] 카카오 Developers Web 플랫폼에 배포 도메인 추가
- [ ] 다른 기기 (아이폰/안드로이드)에서 퍼블릭 URL 교차 확인
- [ ] 배포 URL 기준으로 Lighthouse 재측정

## 6. 시연 영상 (≤ 120초)

반드시 등장해야 하는 4개 기능:
1. 🧭 위치 권한 허용 → 출발지 자동 설정
2. 🔎 목적지 검색 → 비교 카드 두 개 + 폴리라인 시각화
3. 🚨 막차 리스크 배너 (`?now=` 디버그 훅 사용 가능)
4. 🚲 "자전거로 전환" CTA → 카드 하이라이트 + 지도 강조

- [ ] 녹화 도구: OBS / QuickTime / 내장 스크린 레코더
- [ ] 해상도: 1920×1080 이상
- [ ] 파일 형식: MP4 (H.264)
- [ ] 파일 크기 ≤ 100MB
- [ ] 내레이션 또는 자막(한국어)
- [ ] 업로드 경로 결정 (YouTube 비공개 / Google Drive / Vimeo)
- [ ] 최종 링크 기록

## 7. 제출 폼 (공공데이터포털 공모전 사이트)

- [ ] 팀/개인 정보 입력
- [ ] 작품명: **막차세이브 (LastSave)**
- [ ] 활용 데이터 기재:
  - 공공데이터포털 15126639 — 행정안전부 한국지역정보개발원 (전국 통합데이터) 전국 공영자전거 실시간 정보
  - 공공데이터포털 15157601 — 행정안전부 한국지역정보개발원 (전국 통합데이터) 초정밀버스 위치 실시간 정보
- [ ] 퍼블릭 URL 제출
- [ ] 소스 저장소 URL 제출 (GitHub public)
- [ ] 시연 영상 링크 제출
- [ ] 기획 요약 제출 (SPEC.md §1.1 / §1.2 활용 가능)

## 8. 제출 후

- [ ] 심사 결과 공지 일정 확인
- [ ] 질의응답 일정 대비 README 최신화
- [ ] 저장소 public 전환 (만약 아직 private 이면)
- [ ] `draft.md` 원본 보존 확인 — 초기 기획 히스토리는 수정 금지

---

## 빌드 아티팩트 요약 (제출 시점)

| 항목 | 값 |
|---|---|
| 테스트 | 82 tests / 10 files |
| 도메인 커버리지 | ≥ 97% |
| 외부 API 클라이언트 | 4개 (tago, pbdo, odsay, kakao) |
| 서버 라우트 | `/api/{route/compare, bus/positions, bike/stations, kakao/search}` |
| 도메인 순수함수 | 6개 (`eta, risk, recommend, bikeRoute, odsayMapper, lastBus`) |
| 커밋 수 | 11+ (C0 → C3) |
