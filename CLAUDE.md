# CLAUDE.md — 런치메이트(LunchMate)

> 매 세션 먼저 읽는 작업 규칙. 정본: 왜 `docs/basic-plan.md`, 무엇 `docs/prd.md`, 순서와 세부 규칙 `docs/tasks.md`, 모양 `DESIGN.md`.
> 문서 우선순위: `tasks.md` > `CLAUDE.md` > `prd.md` > `basic-plan.md`. 충돌을 발견하면 상위 문서를 따르고 하위 문서 수정이 필요하다고 사용자에게 알린다.

## 0. 문서 읽기 규칙 (토큰 절약, 필수)

큰 문서(`prd.md`, `DESIGN.md`, `research-notes.md`, `docs/archive/*`, `copy-guide.md`, `launch-ops.md`, `monitoring.md` 등)는 **통째로 읽지 않는다.**
- 먼저 `grep -n`으로 작업 ID(`T10.12`), PRD ID(`REC-03`, `AC-POLL-4`), 결정 ID(`D-35`), 절 제목을 찾고, 해당 블록만 `Read`의 offset/limit(또는 `sed -n`)으로 읽는다.
- `docs/tasks.md`는 진행 중 작업만 담는다. 0~9단계 완료 항목과 옛 변경 이력은 `docs/archive/tasks-done.md`에 있으니, 옛 작업 ID는 grep으로만 찾는다.
- `docs/design-decisions.md`는 색인 표 + D-27 이후 본문이다. D-01~D-26은 `docs/archive/design-decisions-1.md`에서 grep으로 해당 항목만 읽는다.
- 이 파일에 요약된 규칙(7장 데이터 규칙, 8장 수치, 9장 문구)으로 충분하면 원문을 다시 열지 않는다. 원문은 세부가 필요할 때만 연다.
- 작업과 무관한 문서(베타 운영, 출시 공지, 외부 문의, 설정 가이드)는 사용자가 언급하거나 작업 ID가 가리킬 때만 연다.
- 코드 탐색도 같은 원칙: 넓게 읽기 전에 grep으로 범위를 좁힌다. 같은 파일을 한 세션에 반복해 읽지 않는다.
- 서브에이전트는 꼭 필요할 때만 쓰고, 프롬프트에 읽을 파일과 줄 범위를 지정한다.

## 1. 프로젝트 요약

- "오늘 뭐 먹지?"를 10초 안에 끝내는 **결정 앱**(검색 앱 아님). 모바일 우선 PWA, 한국어 단일, 일반 공개.
- 핵심 흐름: 오늘 추천 카드 3장 → 길찾기 / 친구 초대 투표 / 회식 모드 / 식후 한 탭 피드백.
- **제품 원칙**
  1. 10초 원칙: 진입부터 결정까지 10초. 이를 늘리는 요소는 홈에 넣지 않는다.
  2. 3개 이하: 한 화면 선택지 3개 이하(지도, 투표 후보, 회식 후보 목록 제외).
  3. 설명 가능한 추천: 모든 카드에 "왜 이 집인지" 한 줄.
  4. 한 탭 피드백: 가격, 태그, 후기는 전부 선택 입력.
  5. 세련된 미니멀: 장식보다 여백, 위계는 타이포로. **모든 UI는 시안 3안 이상 → 선택 → 구현.**
  6. 추천과 광고 분리: 할인, 제휴, 광고는 추천 점수에 절대 반영하지 않는다.

## 2. 기술 스택

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict / Tailwind v4 + shadcn/ui `base-vega`(Base UI 기반, radix 아님) + Lucide + Motion(`motion/react`, `m` + `LazyMotion`) / 폰트 Pretendard Variable(본문, 숫자) + 마루 부리(제목) / Sonner, NumberFlow, 바텀시트는 Base UI Drawer(용도와 로딩 방식은 tasks.md 2.4절) / TanStack Query(서버 데이터, 세션 메모리 캐시) + Zustand(UI 상태) / Supabase **클라우드 개발 프로젝트 1개**(로컬 Docker 없음, Auth: 구글 내장, 카카오, 네이버는 커스텀 OIDC `custom:kakao`, `custom:naver`, Postgres + RLS, Realtime, pg_cron) / 네이버 Web Dynamic Map(표시) + 카카오 로컬 API(FD6) + `nmap://` 길찾기 / Kakao 공유 + Web Share + Vercel OG / zod, Vitest, Playwright / PostHog, Sentry / `main` 푸시 → Vercel 자동 배포 / pnpm

## 3. 명령어

```bash
pnpm dev                 # http://localhost:3000 (DB는 클라우드 개발 프로젝트)
pnpm lint && pnpm typecheck
pnpm lint:copy           # UI 문구: 금지 문자 오류, 해요체 비율 리포트
pnpm test                # Vitest (추천 로직, 유틸, RLS)
pnpm test:e2e            # Playwright
pnpm db:backup           # db:push 직전 백업 (Docker는 Colima: colima start)
pnpm db:push             # 클라우드 개발 프로젝트에 마이그레이션 적용
pnpm db:types            # → src/lib/supabase/types.ts
pnpm shots <route>       # 시안 캡처 390px, 1280px, 라이트, 다크 → docs/design/shots/
pnpm tokens              # DESIGN.md 프런트매터 → src/styles/tokens.css
pnpm analyze             # next analyze (Turbopack 내장). 비교 수치는 docs/design/bundle-log.md
```

## 4. 폴더 구조

```
src/app/(public)/ 랜딩, 약관, /poll/[code] 미리보기     src/app/(app)/ 오늘, 지도, 투표, 나 (로그인 필요)
src/app/admin/ 관리자(role=admin)                       src/app/design-lab/ 시안 (NEXT_PUBLIC_DESIGN_LAB, 프로덕션 404)
src/app/auth/callback/ OAuth 콜백                        src/app/api/ OG 이미지, 투표 마감, rate limit
src/components/ui/ shadcn 기반 공통 (토큰만 사용)          src/features/<도메인>/ rec, map, place, poll, party, feedback, deal, auth ...
src/copy/<도메인>.ts 화면 문구 (1~2단어 라벨 외 문장은 여기) src/lib/reco/ 추천 순수 함수 + 테스트 (React, 네트워크 의존 금지)
src/lib/kakao|naver/ 외부 SDK 래퍼                        src/lib/time|format|motion|analytics/
src/styles/tokens.css `pnpm tokens` 생성물, 직접 수정 금지(DESIGN.md를 고친다)
supabase/migrations/ 스키마 + RLS 정책 (항상 같은 파일)     docs/archive/ 완료 작업, 옛 결정 보관본
```

## 5. 작업 방식

- 작업 시작 전: `docs/tasks.md`에서 해당 작업(`T{단계}.{번호}`)과 PRD ID, AC를 grep으로 찾아 요약한다.
- ⛔ 선택 게이트: 비교표와 캡처를 보여주고 멈춘다. 사용자가 고르기 전에는 다음으로 넘어가지 않는다.
- 3개 파일 이상 또는 스키마 변경은 먼저 계획을 제시하고 승인 후 구현한다.
- 화면 단위로 작게 자른다. 한 커밋 = 한 요구사항의 완결된 단위.
- 모호하면 질문한다. PRD에 기본안이 있으면 기본안으로 진행하고 알린다.
- 외부 정책, SDK 동작([확인 필요])은 공식 문서(Context7, 웹)로 확인하고 출처를 커밋 본문에 남긴다.
- 끝나면 바뀐 것, 확인 방법(배포 URL, 390px), 남은 일을 3~5줄로 보고한다.

## 6. 디자인 규칙

### 6.1 시안 절차 (건너뛰지 않음, 세부와 비교표 양식은 tasks.md 2.3절)
1. 새 화면, 주요 컴포넌트는 `src/app/design-lab/<화면>/{a,b,c}`에 **방향이 분명히 다른** 3안 이상. 색만 바꾼 변형은 시안이 아니다.
2. 각 시안은 로딩(스켈레톤), 빈 상태, 오류, 오프라인 4상태 + 다크 모드 + 핵심 모션, 목업 데이터로 동작.
3. `pnpm shots` 캡처 + 비교표를 붙여 선택을 요청하고 멈춘다.
4. 선택 결과를 `docs/design-decisions.md`에 기록한 뒤에만 구현한다.
5. 구현 후 미선택 시안 코드는 삭제(캡처와 기록은 남김).
- 예외: 기존 토큰, 컴포넌트만으로 끝나는 문구, 간격 수정, 순수 로직. 관리자 화면, 앱 아이콘, OG 이미지는 예외 아님.

### 6.2 디자인 방향 (정본 `DESIGN.md`, 필요한 절만 grep해서 읽기)
- 샌드 배경 + 짙은 올리브 단일 포인트(시안 B "Quiet Stone", D-01), 다크는 따뜻한 차콜. 제목 마루 부리, 본문과 숫자 Pretendard.
- 숫자(도보 분, 가격, 👍%)는 크게 + `tabular-nums`. 카드: 카테고리 일러스트가 시각적 주인공(음식, 그릇, 마스코트 금지), 숫자 3개 + 이유 1줄, 배지 최대 2개.
- 한 손 조작: 주요 액션은 하단 1/3, 터치 44px 이상, 하단 탭 4개(오늘, 지도, 투표, 나).
- 모션은 의미 있을 때만, 150~300ms, `prefers-reduced-motion` 존중.
- 1280px은 좌 리스트 + 우 지도 2단. 360px까지 깨지지 않는다.

### 6.3 금지
- 하드코딩 색(`#hex`, `rgb(`, `bg-[#…]`). `tokens.css` 변수와 Tailwind 테마만.
- 빽빽한 정보, 장식용 효과, 홈 첫 화면에서 동시에 3개 이상 움직이는 효과, 무의미한 그라데이션, 글래스모피즘, 과한 그림자, 이모지 남발, shadcn 기본 회색과 라운드 그대로.
- 한 화면에 포인트 컬러 버튼 2개 이상, 가운데 정렬 긴 문단, 스피너만 있는 로딩.
- 대비 4.5:1 미만, 스와이프만 있는 조작(이전/다음 버튼 필수), 레이블 없는 아이콘 버튼.

## 7. 절대 규칙 (데이터, 보안, 정책)

- **카카오 장소 데이터 저장, 캐싱 금지.** DB에 저장할 카카오 값은 `place_id`, `place_url`뿐. 장소명, 주소, 좌표, 카테고리, 전화번호는 기간이 짧아도, 사용자가 확정했어도(투표 후보 포함) 저장하지 않는다. 캐시는 세션 메모리(TanStack Query)만, localStorage, DB, 서버 캐시, 서비스 워커 캐시 금지. 서비스 워커는 앱 셸만 캐시하고 `dapi.kakao.com` 응답은 제외.
  - 이름 표시: 세션 메모리 → 기준점 주변 FD6 매칭 → 카카오맵 링크 순(공통 모듈 T5.12a).
  - 예외: 사용자가 빈 입력란에 직접 쓴 **식당 메모**(본인만 조회, D-32)와 **메뉴 이름과 가격**(원본은 본인만, 타인에게는 집계 보안 함수로만, 추천 점수 미반영, D-34)은 `place_id`와 함께 저장 가능. 장소명 미리 채우기, 붙여 넣기 버튼 금지. 메모는 플래그로 끄고 지울 수 있게 둔다. 다른 서비스 페이지를 긁어 메뉴, 가격, 사진을 가져오지 않는다.
- 네이버 Maps API 결과(지오코딩 좌표, 주소)도 저장하지 않는다.
- **현위치는 서버, PostHog, Sentry로 보내지 않는다.** 브라우저 추천 계산과 지도 중심 이동에만. Sentry `beforeSend`와 PostHog 속성에서 좌표를 거른다.
- **사무실 좌표는 사용자가 지도에 직접 놓은 핀만 저장.** 현위치, 주소 검색, 지오코딩 좌표는 지도 이동에만 쓰고, 저장 API로 가지 않도록 코드 경로를 분리하고 테스트로 막는다.
- 모든 테이블은 생성 마이그레이션에서 RLS 활성화 + 정책 작성. 정책 없는 테이블은 푸시 금지.
- 비공개 후기 텍스트는 어떤 API 응답에도 나오지 않는다. 집계(가격, 👍, 태그)는 집계 뷰, 보안 함수로만.
- 타인의 `avoid_rules`는 클라이언트에서 읽지 않는다. 투표 기피 경고는 보안 함수가 플래그만 반환.
- 비밀키(Supabase service role, 네이버 Client Secret)는 서버 전용. `NEXT_PUBLIC_`에는 도메인 제한된 브라우저 키만.
- 모든 입력은 서버에서 zod 재검증. 후기, 투표, 제보, 신고는 rate limit + 금칙어.
- 초대 코드는 추측 불가 10자 이상. 투표방은 초대 코드 보유자, 참여자만 조회.
- 시간 판정(끼니, 마감, 만료)은 Asia/Seoul, 저장은 UTC `timestamptz`. `new Date()` 직접 비교 대신 `src/lib/time`.
- 수익화 테이블(`ad_slots`, `sponsors`, `coupons` 등)은 MVP에 만들지 않는다.
- 분석 이벤트 이름, 속성은 PRD 10.2절 그대로. 개인 식별 정보, 좌표 금지.

### 7.1 클라우드 개발 DB
- `pnpm db:push` 전에 마이그레이션 내용을 보여주고 승인받고, 직전에 `pnpm db:backup`.
- 파괴적 변경(데이터, 컬럼 삭제, 이름 변경), `supabase db reset`은 사용자 명시 요청 없이 하지 않는다.
- 테스트 데이터는 `test_` 접두 닉네임 계정으로만 만들고 정리 스크립트로 지운다.
- RLS 테스트는 anon 키 + 테스트 사용자 세션으로(service role은 RLS를 우회해 무의미).

## 8. 도메인 수치

- 끼니: 00:00~14:59 점심, 15:00~ 저녁(KST), 수동 토글 가능.
- 도보 분 = 직선거리 × 1.3 ÷ 67m/분. 검색 반경 = 허용 도보 분 × 67 ÷ 1.3 m.
- 후보 최대 45곳 → 하드 필터(기피 → 다시 안 갈 곳 → 끼니 성격 `meal-kind.ts` → 폐업 3건 → 이번 끼니 오늘 쉬어요 2명 → 예산 초과[제보 있을 때만]) → `S = w_d·D + w_p·P + w_b·B + w_c·C − w_r·R` → 상위 10곳 점수 비례 샘플링, 다양성(같은 카테고리 최대 2장)은 샘플링하면서 적용.
- 콜드 스타트: P=0.5(좋아하는 음식 +0.15, 피드백 수만큼 감소), 후기 3건 미만이면 C 중립. 가중치는 `src/lib/reco/constants.ts`, 이벤트에 `algo_version`.
- 추천 함수는 시드 주입 시 결정적. 무작위는 `rng` 인자로만.
- 투표: 최대 30명, 후보 2~5곳, 마감 24시간 후 링크 만료. 마감은 조회 시 판정 + pg_cron 1분 + Realtime.
- 웨이팅 제보 30분 유효(점심 피크에만 감점). 오늘 쉬어요는 그 끼니까지(1명 감점, 2명 제외). 할인은 표시만, 점수 0, 종료일 또는 "끝났어요" 3건이면 숨김.

## 9. 코드 컨벤션

- TypeScript strict, `any` 금지. DB 타입은 `pnpm db:types` 생성본만.
- 서버 컴포넌트 기본, 상호작용 필요한 곳만 `"use client"`. 지도 SDK는 지도 탭 진입 시 동적 import.
- 파일 kebab-case, 컴포넌트 PascalCase, 훅 `use-*.ts`. 도메인 코드는 `src/features/<도메인>`.
- **UI 문구** (세부 tasks.md 2.2절, 예문은 `docs/copy-guide.md`에서 필요한 절만, 검사 `pnpm lint:copy`)
  - 습니다체:해요체 ≈ 7:3. 안내, 결과, 설명, 오류, 빈 상태, 정책, 권한은 습니다체. 질문, 제안, 피드백 요청, 축하는 해요체. 명사형 라벨은 제외, 약관은 습니다체 100%.
  - Em dash `—`, en dash `–`, 가로줄 `―`, 중간점 `·` 금지(범위는 `~`, 나열은 쉼표, "와/과", 슬래시). 카드 메타 줄은 간격이나 얇은 세로선으로 나눈다.
  - 짧고 구체적으로, 오류는 다음 행동을 안내. 화면 문구에만 적용(문서 서술은 무관).
- 외부 API는 `src/lib/kakao|naver` 래퍼 경유. 실패 시 재시도 1회 + PRD 12장 대체 동작.
- 성능 예산: 홈 JS 201KB(gzip) 이하, LCP 2.5초(4G). 큰 의존성 추가 전 사용자에게 묻는다.

## 10. 완료 기준 (DoD, tasks.md 2.1절)

- PRD AC 통과, lint/typecheck/test/lint:copy 통과, 390px, 1280px, 다크 확인, 4상태 구현, 분석 이벤트 연결, 새 테이블 RLS 3역할(본인, 타인, 비로그인) 테스트.
- 추천 규칙마다 단위 테스트(하드 필터, 다양성, 반복 패널티, 할인 미반영). 비공개 후기, 투표방 접근 AC는 테스트로 증명.
- 카카오톡 인앱, iOS Safari는 실기기 확인 필요 항목으로 보고에 명시(Claude가 확인했다고 쓰지 않는다).

## 11. Git

- `main`에 바로 커밋, 푸시(푸시 = 프로덕션 배포). 푸시 전 lint, typecheck, test, lint:copy 통과(pre-push 훅).
- 커밋 메시지 한국어, PRD ID + 작업 ID: `feat(REC-04, T5.17): 카드 스와이프 구현`. PRD ID 없으면 작업 ID만. 작업을 끝낸 커밋에서 tasks.md 체크박스도 체크. 본문에 선택 시안(D-NN), 확인 필요 항목, 공식 문서 출처.
- 미완성 기능은 기능 플래그로 숨긴 채 푸시. 이미 푸시된 마이그레이션은 수정 금지, 새 파일로.

## 12. 환경변수

- 목록은 `.env.example`(Vercel에도 동일 등록). `NEXT_PUBLIC_SITE_URL`은 `https://lunchmate-kr.vercel.app`.
- 카카오, 네이버, 구글 로그인 Client ID/Secret은 앱 환경변수가 아니라 Supabase 대시보드(Authentication > Providers)에만.
- 도메인 관련 값(OAuth Redirect, 카카오 플랫폼 도메인 등)은 하드코딩하지 말고 `NEXT_PUBLIC_SITE_URL`에서 만든다.
- 각 콘솔 Redirect URL은 `https://<ref>.supabase.co/auth/v1/callback`, Supabase Redirect URLs에는 프로덕션 도메인과 `http://localhost:3000`.

## 13. 함정

- 카카오톡 인앱 브라우저는 구글 OAuth 차단 → 카카오 로그인 우선, 구글은 외부 브라우저 안내.
- 로그인 후 복귀 redirect 파라미터는 내부 경로만 허용(오픈 리다이렉트 방지).
- 로그인 provider는 처음 고른 것을 유지. `custom:kakao` ↔ 내장 `kakao` 전환 시 기존 사용자가 새 계정이 된다.
- 커스텀 provider `provider_token`은 저장, 로깅 금지. 네이버 프로필은 콜백에서 한 번만 조회.
- 카카오 로컬: 직선거리, 페이지당 15건, 최대 3페이지, `place_id` 단건 조회 없음. 장애 시 재시도 1회 후 오류 안내와 "네이버 지도에서 보기".
- 서버 OG 이미지에 식당 이름 금지. 결과 공유 이미지는 브라우저에서 생성.
- `profiles`는 본인만 읽기 → 타인 닉네임, 아바타는 공개 프로필 뷰로. 타인 행 생성(투표 확정 시 방문 후보)은 보안 함수로.
- `nmap://` 미설치 감지는 타임아웃 기반, 데스크톱은 바로 네이버 지도 웹.
- Vercel Hobby는 상업적 이용 불가, Cron 제한 → 마감은 pg_cron, 수익화 전 Pro 전환. Supabase 무료 플랜은 장기 비활성 시 일시 정지.
- `(app)` 레이아웃에는 LazyMotion이 없다. `m` 컴포넌트를 쓰는 화면은 `MotionProvider`(`@/lib/motion`)로 감싼다(빠뜨리면 오류 없이 안 움직임). 첫 화면 등장은 CSS, Motion은 상호작용 뒤. 토스트는 `@/components/ui/lazy-toaster`의 `toast()`.
- 홈, 랜딩 JS 예산은 `pnpm build` postbuild가 검사. pre-push는 build를 안 하므로 큰 의존성을 넣었으면 로컬에서 `pnpm build`.
- 네이버 지도 위 카카오 장소 표시는 허용. 지도 레이어는 계속 `MapProvider` 인터페이스로 감싼다.
