# 막차세이브 (LastSave)

> 2026 전국 통합데이터 활용 공모전 출품작
>
> 심야 시간대, "지금 타려는 버스를 그대로 탈까 / 근처 공영자전거로 갈아탈까"를 실시간 공공데이터로 비교해 가장 빠른 귀갓길을 알려주는 반응형 웹앱.

- 기획 문서: [`SPEC.md`](./SPEC.md)
- 구현 계획: [`tasks/plan.md`](./tasks/plan.md)
- 실행 체크리스트: [`tasks/todo.md`](./tasks/todo.md)

## 활용 공공데이터

| 데이터 | 출처 | 용도 |
|---|---|---|
| 전국 공영자전거 실시간 정보 | 공공데이터포털 (TAGO) | 거치대 위치·잔여 자전거/거치대 |
| 전국 초정밀버스 실시간 위치 정보 | 공공데이터포털 (TAGO) | 버스 실시간 위치·ETA |
| 대중교통 경로 탐색 | ODsay LAB | 버스/지하철 경로 산정 |
| 지도·주소검색 | 카카오 Developers | 지도 렌더·POI 검색 |

## 로컬 실행

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경 변수 준비
cp .env.example .env.local
#   .env.local 파일을 열어 각 키에 실제 값 입력
#   자세한 발급 방법은 .env.example 주석 참고

# 3) 개발 서버
pnpm dev
#   → http://localhost:3000
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 빌드 결과물 로컬 기동 |
| `pnpm typecheck` | `tsc --noEmit` 타입 체크 |
| `pnpm lint` | ESLint (next/core-web-vitals + TS) |
| `pnpm test` | Vitest 단위/통합 테스트 |
| `pnpm test:watch` | Vitest watch 모드 |
| `pnpm test:coverage` | 도메인 커버리지 리포트 |

## 프로젝트 구조

```
.
├─ app/                 # Next.js App Router (UI + API routes)
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ api/              # BFF — 공공 API 키는 여기서만 사용
├─ components/
│  └─ ui/               # shadcn 기본 프리미티브
├─ lib/
│  ├─ api/              # 외부 API 클라이언트 (server-only)
│  ├─ domain/           # 순수 함수: risk, recommend, eta
│  ├─ store/            # Zustand 스토어
│  └─ utils.ts          # cn() 등 공통 유틸
├─ types/               # 도메인·외부 응답 타입
├─ tests/
│  ├─ unit/             # 도메인 단위 테스트
│  ├─ integration/      # API 라우트 통합 테스트
│  └─ fixtures/         # 공공 API 샘플 응답
├─ SPEC.md
└─ tasks/
```

## 보안 원칙

- API 키는 반드시 `.env.local`에 두고 **절대 커밋하지 않습니다** (`.gitignore`에 `.env*` 등록 완료).
- 공공데이터 관련 키(`ODSAY_KEY`, `TAGO_SERVICE_KEY`, `KAKAO_REST_KEY`)는 **서버 사이드 라우트에서만** 로드합니다.
- `NEXT_PUBLIC_KAKAO_MAP_KEY`만 클라이언트에 노출되며, 카카오 Developers에서 허용 도메인을 화이트리스트로 고정하세요.

## 라이선스 / 데이터 출처

공공데이터 활용 시 각 제공 기관의 약관을 준수합니다. 배포 환경에서는 이용 기관명·출처를 푸터에 명시합니다.
