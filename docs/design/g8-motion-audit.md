# 8단계 모션 감사 (T8.7 모션 폴리싱, T8.8 마이크로 인터랙션 감사)

작성 2026-11-01. 기준은 DESIGN.md 프런트매터 `motion`(duration fast 180, base 260, slow 300, easing standard/enter/exit/emphasized, spring 5종, stagger 70)과 7장, CLAUDE.md 6.2절(150~300ms, 의미 있을 때만, reduced motion)과 13장(첫 화면 등장은 CSS, Motion은 상호작용 뒤).
토큰 값은 바꾸지 않았다(`pnpm tokens` 결과 변화 없음). DESIGN.md는 본문 서술 두 곳만 구현에 맞췄다(아래 F15).

요약: 발견 25건, 조치 16건, 유지(근거 기록) 6건, 사용자 제안 3건(2026-11-01 모두 채택, 적용 완료).

## 1. 화면별 모션 목록

출처 표기: **토큰** = `var(--lm-*)` 또는 `duration-(--lm-*)`, `ease-*` 테마 유틸리티, **프리셋** = `@/lib/motion`(`motionPresets`, `tweenOf`, `springOf`, NumberFlow 타이밍), **하드코딩** = 숫자 직접.

| 화면 | 모션 | 길이 / 곡선 | 출처 | 판정 |
| --- | --- | --- | --- | --- |
| 랜딩 `/` | 첫 화면 손짓(다시 뽑기 아이콘 1회 회전) | slow x 2, standard, 2.4s 뒤 1회 | 토큰(landing.css) + 지연 숫자 | 유지(D-06) |
| 랜딩 | 데모 다시 뽑기: 퇴장 fast exit → 등장 slow enter, stagger 70 | 180 / 300 | 토큰 | 맞음 |
| 로그인, 약관 | 단계 전환 8px 떠오름 | slow, enter | 토큰(auth.css) | 맞음 |
| 로그인 | 이동 중 선 | 1.2s 반복, standard | 숫자(진행 표시) | 유지(진행 표시) |
| 로그인 인앱 안내 | 메뉴 강조 링 2회 | slow x 3, 0.6s 뒤 | 토큰 + 숫자 | 유지(안내 목적, 2회 후 멈춤) |
| 온보딩 | 시트 단계 떠오름, 지도 원과 축척, 핀 들림 | slow enter / base standard / fast | 토큰(onboarding.css) | 맞음 |
| 오늘(홈) | 첫 화면 카드 묶음 페이드 1개 | slow, enter | 토큰(today.css) | 맞음 |
| 오늘 | 다시 뽑기: fast exit → 블록 reveal(0~6번째, 70 간격) | 180 + 최대 420 지연 + 300 | 토큰 | 유지(D-04), 제안 P2 |
| 오늘 | 대안 → 큰 카드 교환 | fast exit / slow rise 8px | 토큰 | 맞음 |
| 오늘 | 그냥 골라줘 R1 순회, 결과 패널 | fast 테두리, 60→260 간격, 2초 예산 / slow | 토큰 + 일정 함수 | 유지(D-05, 누르면 건너뜀) |
| 오늘 | 위치 메뉴 팝오버 | fast | 토큰, 곡선 누락 → **ease-enter 추가** | 조치(F7) |
| 하단 탭 | 활성 막대 나타남 base standard, 사라짐 fast exit. 화면 전환 애니메이션 없음 | 260 / 180 | 토큰 | 맞음 |
| 지도 | 시트 높이, 지도 맞춤 | slow enter / slow standard | 토큰(map.css) | 맞음 |
| 지도 | 마커 고름과 이름 펼침, 칩 떠오름 | fast / base | 토큰 | 맞음 |
| 지도 | 지도 로딩 자리 | Tailwind `animate-pulse` 2s | 하드코딩 → **공통 Skeleton 호흡** | 조치(F16) |
| 상세(시트) | 접힘 행 base, 메뉴 fast, 미터 칸 | 토큰 | 토큰 | 맞음 |
| 피드백 | 시트 열림 slow enter, 닫힘 fast exit, 띠 접힘 base | 토큰 | 토큰 | 맞음(딤은 F13) |
| 피드백 | 결과 줄 페이드 | base, 곡선 누락 → **ease-enter** | 토큰 | 조치(F7) |
| 나 | 탭 막대 base, 패널 페이드 base/slow, 결과 줄 fast | 곡선 누락 → **ease-enter** | 토큰 | 조치(F7) |
| 제보 | 질문 바뀜 4px base, 체크 원 base, 자동 넘김 대기 160ms | 토큰 + 160 숫자 | 토큰 | 맞음 |
| 투표 탭 | 목록 줄 hover 면 | fast | 토큰 | 맞음(눌림 F1) |
| 투표방 | 득표 바 `bar` 스프링, 숫자 NumberFlow base, 결과 세리프 줄 slow | 프리셋 | 프리셋 | 맞음 |
| 투표방 결과 | 축하 제목 페이드 | **`duration-slow`(없는 클래스)라 150ms로 돌았음 → slow 300** | 토큰 | 조치(F8) |
| 투표방 결과 | 결과 카드 지연 | `delay-150` → **stagger x 2(140)** | 토큰 | 조치(F9) |
| 투표방 | 실시간 점 ping | 2.4s 무한 | 숫자 | 유지, 제안 P3 |
| 투표 만들기 | 시트 slow enter, 성공 원 slow, 항목 펼침 base | 곡선 누락 2곳 → **ease-enter** | 토큰 | 조치(F7) |
| 회식 | 질문 페이드 base, 적용 뒤 목록 stagger(5줄) | `${i * 70}ms` → **`calc(i * var(--lm-stagger))`** | 토큰 | 조치(F10) |
| 관리자 | 처리 카드 빠짐 260ms 타이머, 카드 등장 base | `LEAVE_MS = 260` → **motionTokens.duration.base** | 토큰 | 조치(F11) |
| 오프라인 `/offline` | 모션 없음(버튼 눌림만) | | | 맞음 |
| 공통 시트(Drawer) | 열림 slow enter, 닫힘 기본값 slow enter → **fast exit**, 딤 slow → **열림 base, 닫힘 fast exit** | 토큰 | 토큰 | 조치(F13) |
| 공통 Sheet, Dialog | 딤 slow → base, 닫힘 곡선 exit | 토큰 | 토큰 | 조치(F14) |
| 공통 버튼, 칩, 토글 | `pressMotion`: scale 0.98 + 면 색, fast standard, 축소 모드 끔 | 토큰 | 토큰 | 맞음 |

## 2. 발견과 조치

| # | 문제 | 조치 | 파일 |
| --- | --- | --- | --- |
| F1 | 눌림 피드백이 `hover:`에만 있어 터치 기기(Tailwind v4 hover는 hover 가능한 기기만)에서 누를 때 아무 반응이 없음. 글자 버튼, 아이콘 버튼, 칩, 줄, 탭 70곳 | 같은 클래스 묶음에 `active:` 짝을 붙였다(글자색, 밑줄색, 면, 테두리). 새 효과 없이 hover와 같은 상태를 누르는 순간에도 보인다 | 44개 파일(components/ui button-classes, toggle, tabs, sonner, app-shell tab-bar, effects/marquee, features 전반) |
| F2 | hover와 active가 모두 없는 글자 버튼 7곳, 온보딩 단계 글자 탭 1곳 | 밑줄 또는 글자색이 `foreground`로 진해지는 hover/active 추가 | auth/terms-screen, party/party-screen(2), poll/create/candidate-picker(2), poll/create/create-drawer(2), onboarding/onboarding-screen |
| F3 | 칩 모양 버튼이 Chip/Button과 달리 scale 0.98 없이 색만 바뀜 | 개별 전환 클래스를 지우고 공통 `pressMotion`으로 통일 | rec/today-header(위치 칩), report/deal-parts(pill), place/detail/parts(웨이팅 3버튼), admin/parts(필터 칩) |
| F4 | 지도 위 떠 있는 버튼(이 지역 다시 검색, 기준점 돌아가기, 현위치)에 눌림 없음 | `hover/active:bg-muted` + `pressMotion` | map/parts |
| F5 | 회식 인원 스테퍼만 `pressMotion` 누락(피드백 스테퍼는 있음, DESIGN 5장 "눌림 press") | `pressMotion` 추가 | party/parts |
| F6 | 홈 대안 카드: 뒤에 붙인 `pressMotion`이 `transition-[border-color,opacity]`를 덮어 R1 흐림(opacity 40%)이 큰 카드와 달리 즉시 바뀜 | `pressMotion`을 앞에 두고 `transition-[border-color,opacity,scale]`로 덮음 | rec/today-cards |
| F7 | 길이는 토큰인데 곡선이 빠져 브라우저 기본 `ease`(tw-animate-css) 또는 Tailwind 기본 곡선으로 돎. 23곳 | 등장(animate-in)은 `ease-enter`, 상태 전환은 `ease-standard` | admin-console(2), feedback(3), me/history(8), place-detail, poll/create(2), poll/room(2), rec/just-pick-panel, rec/today-header, effects/marquee |
| F8 | 투표 결과 축하 제목 `motion-safe:duration-slow`는 생성되지 않는 클래스라 150ms로 돎 | `motion-safe:duration-(--lm-duration-slow)` | poll/room/poll-room-screen |
| F9 | 결과 카드 `delay-150` 하드코딩 | `delay-[calc(var(--lm-stagger)*2)]`(140ms) | poll/room/poll-room-screen |
| F10 | 회식 목록 stagger 70ms 하드코딩 | `calc(i * var(--lm-stagger))` | party/parts |
| F11 | 관리자 처리 카드 빠짐 타이머 260 하드코딩 | `motionTokens.duration.base`(관리자 화면이라 홈 번들 무관) | admin/admin-console |
| F12 | 그냥 골라줘 닫힘 타이머 `CLOSE_MS = 180` 하드코딩 | 유지: 토큰 모듈을 홈 첫 로드에 넣지 않기 위해서. 토큰과 같다는 주석을 남김 | rec/just-pick |
| F13 | 공통 Drawer 기본 닫힘이 slow 300 `enter`(감속)라 DESIGN 5장 "닫힘 exit 180"과 다름. 6개 시트가 각자 덮어써 왔고, 딤은 slow로 남아 시트가 사라진 뒤 딤이 120ms 더 남음(닫는 동작이 늦게 끝남) | 기본값을 닫힘 fast `exit`(스와이프 세기 비례 유지)로, 딤을 열림 base `standard`, 닫힘 fast `exit`로 | components/ui/drawer |
| F14 | Sheet 딤 slow(Dialog는 base), Dialog 딤 닫힘 곡선 없음 | Sheet 딤 base, 둘 다 닫힘 `ease-exit` | components/ui/sheet, dialog |
| F15 | DESIGN.md 5장 "바텀시트 열림은 sheet 스프링", 7장 "Base UI Drawer + sheet 스프링"이 실제(CSS 전환, slow enter / fast exit, 화면별 절은 이미 이 값)와 다름 | 본문을 구현에 맞춰 고침. `sheet` 스프링은 Motion 예비안(`spring-sheet`)에서만 쓴다고 명시. 프런트매터 값 변경 없음 | DESIGN.md |
| F16 | 지도 로딩 자리만 `animate-pulse`(2s, 진한 막대)라 앱 공통 스켈레톤(3.2s 느린 호흡)과 박자, 색이 다름 | 공통 `Skeleton`으로 교체 | map/components/map-view |
| F17 | 투표방 실시간 점 ping 2.4s 무한 반복 | P3 결정으로 3.2초 opacity 호흡으로 바꿈 | poll/room/parts |
| F18 | 홈 다시 뽑기 완료까지 약 0.9초(퇴장 180 + 대안 블록 5, 6번째 지연 350~420 + 300) | P2 결정으로 대안 순번 3, 4, 약 0.76초 | rec/today-screen, today.css |
| F19 | 그냥 골라줘 R1 2초 연출 | 유지(D-05 확정, 결과는 누르는 순간 정해지고 다시 누르면 건너뜀) | rec/just-pick |
| F20 | 랜딩 손짓 2.4초 뒤 1회 | 유지(D-06, 첫 화면에서 움직이는 것 하나, LCP 영향 없음) | landing/landing.css |
| F21 | 목록 줄(지도 목록, 로그아웃 줄, 상세 접힘 행 머리, 투표 만들기 후보 줄, 시트 안 선택 줄)에 눌림 표시 없음 | P1 결정으로 공통 `rowPress`(줄 안 글자와 그림 opacity 0.6) 적용 | map/parts, me/sign-out-row, place/detail/parts, poll/create/parts, create-drawer |
| F22 | 색 전환 일부에 `motion-reduce:transition-none` 없음 | 유지: 위치 이동이 아닌 색 변화이고, 앱 설정 줄이기는 globals.css 안전망이 0.01ms로 끈다 | 여러 곳 |
| F23 | 화면(탭) 전환 방식 | 일관: 모든 탭 이동은 즉시 교체, 뷰 전환이나 페이지 등장 애니메이션 없음(10초 원칙). 탭 막대만 base/fast | app-shell/tab-bar |
| F24 | 저장 중 표시(버튼 위 2px 선 pulse) 4곳 | 유지: 진행 표시, 모두 `motion-safe` | me/save-bar, me/office-new-screen, onboarding(2) |
| F25 | reduced motion 점검 | 모든 등장 애니메이션은 `motion-safe:` 또는 `motion-reduce:animate-none`, CSS 파일은 `@media (prefers-reduced-motion)` + `data-motion="reduce"` 규칙, Motion은 `MotionConfig` + 축소 프리셋(`INSTANT`)으로 즉시 상태 변화. 누락 없음 | |

## 3. 눌림 피드백 규칙(정리)

| 요소 | 눌림 |
| --- | --- |
| 주 버튼 | scale 0.98 + 명도 -0.04(`brightness-95`), fast standard |
| 보조, 고스트, 위험 버튼, 칩, 토글, 스테퍼, 지도 위 칩 | scale 0.98 + `muted` 면(`pressMotion`) |
| 아이콘 버튼(원형) | `muted` 면 + 글자 `foreground` |
| 글자 버튼(밑줄) | 밑줄 또는 글자색이 `foreground`로(크기 변화 없음, `link` variant는 `active:scale-100`) |
| 홈 큰 카드 | 카드 전체는 반응하지 않고 안의 버튼만(DESIGN 5장) |
| 홈 대안 카드 | scale 0.98 + 테두리 `input` |
| 하단 탭 | 글자와 아이콘 `foreground` |
| 목록 줄(줄 전체가 버튼, 링크) | 줄 안 글자와 그림만 opacity 0.6(`rowPress`, P1) |

## 4. 사용자 제안과 결정 (2026-11-01, 세 건 모두 추천안 선택)

- **P1 목록 줄 눌림 규칙 → (a) 채택, 적용함**: 줄 전체가 버튼이나 링크인 목록은 면을 칠하지 않고 줄 안 글자와 그림(직계 자식)만 opacity 0.6으로 흐립니다(fast standard, 축소 모드면 전환 없이 바로). 공통 클래스 `rowPress`(`src/components/ui/row-press.ts`, 홈 첫 로드에 들어가지 않게 interaction.ts와 분리). 적용: 지도 목록 줄과 시트 아래 안내 줄(map/parts, map-sheet), 설정 링크 줄과 로그아웃 줄(me/parts, me/sign-out-row), 상세 접힘 행 머리(place/detail/parts), 투표 만들기 후보 줄과 시트 안 선택 줄(poll/create/parts, create-drawer), 투표 탭 목록 줄(poll-tab), 투표방 후보 제안 줄(suggest-panel), 상세 후기 줄(detail-reviews). 투표 탭, 제안, 후기 줄의 데스크톱 hover 면은 그대로 두고 눌림 면(`active:bg-*`)만 `rowPress`로 바꿨습니다. 안쪽 여백이 있는 메뉴 항목(위치 메뉴, 더 보기 메뉴, 온보딩 검색 결과)은 메뉴 문법이라 면 강조를 유지합니다.
- **P2 홈 다시 뽑기 길이 → 채택, 적용함**: 대안 블록 순번 5, 6 → 3, 4(숫자 줄과 함께). 끝날 때까지 약 0.9초 → 약 0.76초. design-decisions D-04 아래 기록, DESIGN.md 5장 "오늘(홈) 화면" 모션 갱신. 파일 rec/today-screen(`--reveal: 3 + i`), today-cards와 today.css 주석.
- **P3 실시간 점 → 채택, 적용함**: ping(2배 확대 무한 반복)을 둘레 원의 opacity 호흡(스켈레톤과 같은 `animate-skeleton-breathe` 3.2초, 크기 변화 없음)으로 바꿨습니다. 축소 모드면 둘레를 숨기고 점만 남습니다. 파일 poll/room/parts `LiveDot`.

## 5. 검증

- `pnpm lint`, `pnpm typecheck`, `pnpm test`(2029 통과), `pnpm lint:copy`(오류 0, 문체 경고 1건은 기존 src/copy) 통과.
- `pnpm build`: `/today` 첫 로드 200.7KB(예산 201KB, 변경 전과 같음), `/` 178.7KB.
- e2e(기존 dev 서버 3102): `test:e2e` 56 통과, 실패 4건은 dev 서버가 `NEXT_PUBLIC_DESIGN_LAB=true`와 지도 키로 떠 있어 생기는 플래그 off 404, 키 없음 검사(모션과 무관). `test:e2e:a11y` 468 통과, `test:e2e:visual` 4 통과.
- 실기기 확인 필요: iOS Safari와 카카오톡 인앱 브라우저에서 `:active` 표시(iOS는 터치 시작 지연 없이 보이는지), 시트 닫힘 fast exit 체감.
