# CLAUDE.md — 런치메이트(LunchMate)

> Claude Code가 매 세션 먼저 읽는 작업 규칙. **무엇을 만들지**는 `docs/prd.md`, **왜**는 `docs/basic-plan.md`,
> **어떤 순서로**는 `docs/plan.md`가 정본이다. 이 문서와 PRD가 충돌하면 PRD를 따르고 이 문서를 고친다.

## 1. 프로젝트 요약

- "오늘 뭐 먹지?"를 10초 안에 끝내는 **결정 앱**(검색 앱 아님). 모바일 우선 PWA, 한국어 단일, 일반 공개 서비스.
- 핵심 흐름: 오늘 추천 카드 3장 → 길찾기 / 친구 초대 투표 / 회식 모드 / 식후 한 탭 피드백.
- **제품 원칙(모든 판단 기준)**
  1. 10초 원칙 — 앱 진입부터 결정까지 10초. 이를 늘리는 요소는 홈에 넣지 않는다.
  2. 3개 이하 원칙 — 한 화면 선택지 3개 이하(지도·투표 후보 목록 제외).
  3. 설명 가능한 추천 — 모든 카드에 "왜 이 집인지" 한 줄.
  4. 한 탭 피드백 — 가격·태그·후기는 전부 선택 입력.
  5. 세련된 미니멀 — 장식보다 여백, 색보다 타이포. **모든 UI는 시안 2~3개 → 선택 → 구현.**
  6. 추천과 광고 분리 — 할인·제휴·광고는 추천 점수에 절대 반영하지 않는다.

## 2. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js (App Router, 최신 안정판) + TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide + Framer Motion, 폰트 Pretendard Variable |
| 상태 | TanStack Query(서버 데이터·세션 메모리 캐시) + Zustand(UI·설정 상태) |
| 인증·DB | Supabase **클라우드 개발 프로젝트 1개**(로컬 Docker 없음). Auth(카카오·구글) + 네이버 커스텀 OAuth, Postgres + RLS, Realtime, pg_cron |
| 지도·장소 | 네이버 Web Dynamic Map(표시), 카카오 로컬 API JS SDK(음식점 FD6), 길찾기 `nmap://` |
| 공유 | Kakao JS SDK 공유 + Web Share API, Vercel OG 이미지 |
| 검증·테스트 | zod, Vitest, Playwright |
| 분석·모니터링 | PostHog, Sentry |
| 배포 | GitHub `main` 푸시 → Vercel 자동 배포 |
| 패키지 매니저 | pnpm |

## 3. 명령어

```bash
pnpm dev                 # 로컬 개발 (http://localhost:3000, DB는 클라우드 개발 프로젝트)
pnpm lint && pnpm typecheck
pnpm test                # Vitest (추천 로직·유틸·RLS)
pnpm test:e2e            # Playwright (온보딩 / 추천→길찾기 / 투표 2인→확정)
pnpm db:push             # supabase db push → 클라우드 개발 프로젝트에 마이그레이션 적용
pnpm db:types            # supabase gen types --project-id → src/lib/supabase/types.ts
pnpm shots <route>       # 시안 캡처 390px·1280px, 라이트·다크 → docs/design/shots/
```

## 4. 폴더 구조

```
src/app/(public)/        랜딩, 약관, /poll/[code] 미리보기
src/app/(app)/           오늘 · 지도 · 투표 · 나 (로그인 필요)
src/app/admin/           관리자 (role=admin)
src/app/design-lab/      시안 페이지 — 프로덕션에서 404 (NEXT_PUBLIC_DESIGN_LAB 플래그)
src/app/api/             서버 함수: 네이버 OAuth, OG 이미지, 투표 마감, rate limit
src/components/ui/       shadcn 기반 공통 컴포넌트 (토큰만 사용)
src/features/<도메인>/    rec, map, place, poll, party, feedback, deal, auth ...
src/lib/reco/            추천 순수 함수 + 테스트 (React·네트워크 의존 금지)
src/lib/kakao|naver/     외부 SDK 래퍼
src/styles/tokens.css    디자인 토큰 (색·타입·간격·라운드·그림자·모션)
supabase/migrations/     스키마 + RLS 정책 (항상 같은 파일에)
docs/                    basic-plan, prd, plan, design-decisions.md, design/shots/
```

## 5. 작업 방식

- **작업 시작 전**: `docs/plan.md`에서 해당 작업과 PRD 요구사항 ID(예: `REC-03`)·AC를 확인한다.
- 3개 파일 이상 바뀌거나 스키마가 바뀌면 **먼저 계획을 제시**하고 승인 후 구현한다.
- 화면 단위로 작게 자른다("온보딩 1단계만"). 한 커밋 = 한 요구사항의 완결된 단위.
- 모호하면 추측하지 말고 질문한다. 기본안이 PRD에 있으면 기본안으로 진행하고 그 사실을 알린다.
- 외부 정책·SDK 동작([확인 필요] 항목)은 공식 문서(Context7·웹)로 확인 후 구현하고 출처를 커밋 본문에 남긴다.
- 끝나면 바뀐 것, 확인 방법(배포 URL·390px), 남은 일을 3~5줄로 보고한다.

## 6. 디자인 규칙 (필수)

### 6.1 시안 절차 — 건너뛰지 않는다
1. **시안**: 새 화면·주요 컴포넌트는 `src/app/design-lab/<화면>/{a,b,c}`에 **방향이 분명히 다른** 2~3안을 만든다
   (예: A 카드 중심 / B 리스트 중심 / C 대담한 타이포). 색만 바꾼 변형은 시안이 아니다.
2. 각 시안은 **로딩(스켈레톤)·빈 상태·오류·오프라인** 4상태와 다크 모드를 포함하고, 목업 데이터로 동작한다.
3. `pnpm shots`로 390px·1280px 캡처 후, 비교표(의도 / 장점 / 약점 / 원칙 1~5 부합도)를 붙여 **선택을 요청하고 멈춘다.**
4. 선택 결과(안, 조합 지시, 날짜)를 `docs/design-decisions.md`에 기록한 뒤에만 구현한다.
5. 구현 후 선택하지 않은 시안 코드는 삭제한다(캡처와 기록은 남김).
- 예외: 기존 토큰·컴포넌트만으로 끝나는 문구·간격 수정, 순수 로직 작업.
- 순서: **디자인 시스템(가장 먼저)** → 랜딩 → 오늘(홈) 카드 → 지도·바텀시트 → 투표방 → 온보딩 → 나머지.
- **디자인 시스템 시안은 색 견본표가 아니라 실제 화면으로 비교한다.** 토큰 3안을 같은 "오늘(홈) 추천 카드 3장 + 하단 탭"
  화면에 각각 입혀 보여주고, 견본표(색·타입 스케일)는 보조 자료로만 붙인다.

### 6.2 디자인 방향
- 톤: 따뜻한 미니멀. 아이보리 배경 + **단일 포인트 컬러**(토마토 레드 기본안). 다크는 따뜻한 차콜.
- 타이포가 주인공: Pretendard 단일, 숫자(도보 분·가격·👍%)는 크게 + `tabular-nums`. 위계는 굵기·크기로.
- 카드에 식당 사진이 없다(카카오 미제공) → 카테고리 일러스트/아이콘 + 색면 시스템, 주인공은 식당명과 숫자.
- 한 손 조작: 주요 액션은 화면 하단 1/3, 터치 영역 44px 이상, 하단 탭 4개(오늘·지도·투표·나).
- 모션은 의미 있을 때만: 카드 스와이프, 셔플, 바텀시트 스프링, 득표 바, 확정 축하. 150~300ms, `prefers-reduced-motion` 존중.
- 데스크톱 1280px은 좌 리스트 + 우 지도 2단. 최소 360px까지 깨지지 않는다.

### 6.3 금지 (템플릿 티 방지)
- 하드코딩 색(`#hex`·`rgb(`·`bg-[#…]`) 금지 → `tokens.css` 변수와 Tailwind 테마만 사용.
- shadcn 기본 회색·기본 라운드 그대로 쓰기, 무의미한 그라데이션·글래스모피즘·과한 그림자, 이모지 남발.
- 한 화면에 포인트 컬러 버튼 2개 이상, 가운데 정렬 긴 문단, 스피너만 있는 로딩(스켈레톤 사용).
- 접근성 위반: 대비 4.5:1 미만, 스와이프만 있는 조작(이전/다음 버튼 필수), 레이블 없는 아이콘 버튼.

## 7. 절대 규칙 (데이터·보안·정책)

- **카카오 장소 데이터 저장·캐싱 금지.** DB에는 `place_id`와 사용자 생성 데이터만. 캐시는 세션 메모리(TanStack Query)만, localStorage·DB·서버 캐시 금지.
- **현위치는 서버·PostHog·Sentry로 보내지 않는다.** 브라우저에서 추천 계산에만 사용. 저장은 사용자가 지정한 사무실 좌표만.
- 모든 테이블은 생성 마이그레이션에서 **RLS 활성화 + 정책 작성**. 정책 없는 테이블은 푸시 금지.
- 비공개 후기 텍스트는 어떤 API 응답에도 나오면 안 된다. 집계(가격·👍·태그)는 집계 뷰/보안 함수로만 제공.
- 타인의 `avoid_rules`는 클라이언트에서 읽지 않는다. 투표 기피 경고는 Postgres 보안 함수가 플래그만 반환.
- 비밀키(Supabase service role, 네이버 Client Secret)는 서버 함수 전용. `NEXT_PUBLIC_`에는 도메인 제한 걸린 브라우저 키만.
- 모든 입력은 zod로 서버에서 재검증. 후기·투표·제보·신고는 rate limit + 금칙어(PRD MOD-04·05, DEAL-04).
- 초대 코드는 추측 불가 10자 이상. 투표방은 초대 코드 보유자·참여자만 조회.
- 시간 판정(끼니·마감·만료)은 **Asia/Seoul**, DB 저장은 UTC(`timestamptz`). `new Date()` 직접 비교 대신 `src/lib/time` 유틸 사용.
- 수익화 테이블(`ad_slots`, `sponsors`, `coupons` 등)은 MVP 마이그레이션에 만들지 않는다.
- 분석 이벤트 이름·속성은 PRD 10.2절 그대로. 개인 식별 정보·좌표는 속성에 넣지 않는다.

### 7.1 클라우드 개발 DB 주의
- 로컬 DB가 없으므로 **`pnpm db:push` 전에 마이그레이션 내용을 보여주고 승인받는다.**
- 데이터 삭제·컬럼 삭제·이름 변경 같은 파괴적 변경, `supabase db reset`은 사용자 명시 요청 없이 하지 않는다.
- 테스트 데이터는 `test_` 접두 닉네임의 테스트 계정으로만 만들고, 테스트 후 정리 스크립트로 지운다.
- RLS 테스트는 anon 키 + 테스트 사용자 세션으로 한다. service role 키로 테스트하면 RLS가 우회되어 의미가 없다.

## 8. 도메인 규칙 요약 (자주 쓰는 수치)

- 끼니: 00:00~14:59 점심, 15:00~ 저녁(KST), 수동 토글 가능.
- 도보 분 = 직선거리 × 1.3 ÷ 67m/분 ("도보 약 N분"). 검색 반경 = 허용 도보 분 × 67 ÷ 1.3 m.
- 후보 최대 45곳 → 하드 필터(기피 → 다시 안 갈 곳 → 폐업 3건 → 예산 초과[제보 있을 때만]) → 점수
  `S = w_d·D + w_p·P + w_b·B + w_c·C − w_r·R` → 같은 카테고리 최대 2장 → 상위 10곳 점수 비례 샘플링.
- 콜드 스타트: P=0.5, 후기 3건 미만이면 C 중립. 가중치는 `src/lib/reco/constants.ts`, 이벤트에 `algo_version` 기록.
- 추천 함수는 시드 주입 시 결정적이어야 한다. 무작위는 `rng` 인자로만.
- 투표: 최대 30명, 후보 2~5곳, 마감 24시간 후 링크 만료. 마감은 조회 시 판정 + pg_cron 1분 + Realtime 브로드캐스트.
- 웨이팅 제보 30분 유효(점심 피크에만 감점), 할인 정보는 표시만·점수 반영 0, 종료일 또는 "끝났어요" 3건이면 숨김.

## 9. 코드 컨벤션

- TypeScript strict, `any` 금지. DB 타입은 `pnpm db:types` 생성본만 사용.
- 서버 컴포넌트 기본, 상호작용 필요한 곳만 `"use client"`. 지도 SDK는 지도 탭 진입 시 동적 import.
- 파일명 kebab-case, 컴포넌트 PascalCase, 훅 `use-*.ts`. 도메인 코드는 `src/features/<도메인>`에 모은다.
- UI 문구는 한국어 존댓말 "~해요"체, 짧고 구체적으로. 오류 문구는 다음 행동을 안내한다.
- 외부 API 호출은 `src/lib/kakao|naver` 래퍼 경유. 실패 시 재시도 1회 + PRD 12장 대체 동작.
- 성능 예산: 홈 JS 200KB(gzip) 이하, LCP 2.5초(4G). 큰 의존성 추가 전 사용자에게 묻는다.

## 10. 테스트·완료 기준(DoD)

- 추천 로직 규칙마다 단위 테스트(하드 필터·다양성·반복 패널티·할인 미반영 AC-DEAL-2).
- RLS는 "본인 / 타인 / 비로그인" 3역할로 테스트. 비공개 후기·투표방 접근 AC는 반드시 테스트로 증명.
- 완료 조건: 해당 PRD AC 통과 · lint/typecheck/test 통과 · 390px·다크 모드 확인 · 4상태 구현 · 분석 이벤트 연결.
- 카카오톡 인앱 브라우저·iOS Safari는 실기기 확인 필요 항목으로 보고에 명시한다(Claude가 대신 확인했다고 쓰지 않는다).

## 11. Git

- **`main`에 바로 커밋·푸시한다**(1인 개발). 푸시 = 프로덕션 배포이므로 푸시 전 `lint·typecheck·test` 통과 필수.
- 커밋 메시지는 한국어: `feat(REC-03): 카드 스와이프 구현`, `fix(POLL-08): 동점 처리`, `design(home): 시안 3안`.
  요구사항 ID 필수. 본문에 선택한 시안(design-decisions 항목), 확인 필요 항목, 참고한 공식 문서 출처를 적는다.
- 미완성 기능은 기능 플래그로 숨긴 채 푸시한다(깨진 화면을 배포하지 않는다).
- 마이그레이션은 이미 푸시된 파일 수정 금지, 새 파일로 추가.
- 클로즈드 베타 시작 시점에 PR + 미리보기 배포 방식으로 바꿀지 재검토한다.

## 12. 환경변수 (`.env.local`, Vercel에 동일 등록)

```
NEXT_PUBLIC_SITE_URL            # 베타까지 *.vercel.app, 출시 전 자체 도메인 (PRD 14.1 체크리스트)
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # 서버 전용
SUPABASE_PROJECT_REF            # db:push·db:types용 개발 프로젝트 ID
NEXT_PUBLIC_KAKAO_JS_KEY        # 도메인 제한
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID # 도메인 제한
NAVER_LOGIN_CLIENT_ID / NAVER_LOGIN_CLIENT_SECRET   # 서버 전용
NEXT_PUBLIC_POSTHOG_KEY / SENTRY_DSN
NEXT_PUBLIC_DESIGN_LAB          # true일 때만 /design-lab 노출 (프로덕션 false)
```
도메인 관련 값(`appname`, OAuth Redirect, 카카오 플랫폼 도메인)은 하드코딩하지 말고 `NEXT_PUBLIC_SITE_URL`에서 만든다.
Supabase·카카오·네이버 Redirect URL에는 프로덕션 도메인과 `http://localhost:3000`을 등록한다.

## 13. 함정 (Gotchas)

- 카카오톡 인앱 브라우저는 **구글 OAuth 차단** → 인앱 감지 시 카카오 로그인 우선, 구글은 외부 브라우저 안내(AUTH-04).
- 로그인 후 원래 경로(특히 `/poll/[code]`) 복귀: redirect 파라미터는 내부 경로만 허용(오픈 리다이렉트 방지).
- 카카오 로컬 거리는 직선거리, 페이지당 15건·최대 3페이지.
- `nmap://` 미설치 감지는 타임아웃 기반 → 데스크톱은 바로 네이버 지도 웹.
- Vercel Hobby는 상업적 이용 불가·Cron 빈도 제한 → 마감은 pg_cron, 수익화 전 Pro 전환.
- Supabase 무료 플랜은 장기간 비활성 시 일시 정지 → 작업이 뜸하면 대시보드에서 상태 확인.
- 네이버 지도 위에 카카오 장소 표시 허용 여부 [확인 필요] → 지도 레이어는 `MapProvider` 인터페이스로 감싸 카카오맵 전환 가능하게.
