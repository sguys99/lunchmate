# 8단계 관리자 화면 비교 자료 (T8.5a → ⛔ 선택)

> ⛔ T8.5a 선택 게이트에서 보여 줄 자료입니다. 관리자 화면 시안 하나(또는 조합)를 고르고 5절 안건을 함께 정합니다. 고른 뒤 T8.5(`/admin` 구현, MOD-06)로 넘어갑니다.
> 캡처는 2026-11-01 공용 dev 서버(3102)에서 찍었습니다. 번들 수치는 `pnpm build` 없이 의존성으로 추정한 값입니다(2절).
> 시안 라우트: `/design-lab/admin/<a|b|c>`. 쿼리 규약(`src/features/design-lab/admin/params.ts` 머리 주석):
> `?state=ready|loading|empty|error|offline`, `?section=reviews|closures|users|log`, `?item=<id>`(A: 그 항목을 고른 채로, 390은 상세가 열린 채로, B: 그 줄을 펼친 채로),
> `?confirm=suspend|unsuspend|bulk|closed`(확인 상자를 연 채로), `?select=some`(B: 3줄을 고른 채로), `?step=reason`(A, C: 숨김 사유 단계).
> 관련 요구사항: PRD MOD-01~MOD-03, MOD-06, AC-FB-2(비공개 후기), 11.2 후기 정책, CLAUDE.md 7장(카카오 장소 데이터 저장 금지, 비공개 후기 텍스트 비노출), DESIGN.md 2장(색), 7장(모션).

## 1. 캡처

폴더: `docs/design/shots/2026-11-01/`. 파일 이름은 `design-lab-admin-<a|b|c>__<390|1280>__<light|dark>[__<상태 또는 흐름>].png`.

| 묶음 | 파일 이름 끝 | 찍는 방법 |
| --- | --- | --- |
| 기본(신고된 후기) + 4상태, 390과 1280 x 라이트, 다크 (60장) | 접미사 없음, `__loading`, `__empty`, `__error`, `__offline` | `pnpm shots /design-lab/admin/a /design-lab/admin/b /design-lab/admin/c --base-url http://localhost:3102 --states` (전체 페이지) |
| 처리 흐름 (뷰포트 영역, 축소 모션) | A `__reason`, `__suspend`, `__closures`, `__users`, `__log` / B `__bulk-bar`, `__bulk-confirm`, `__expanded`, `__closures`, `__users`, `__log` / C `__reason`, `__closures`, `__users`, `__suspend`, `__log` | 쿼리 캡처 스크립트(Next 개발 표시 숨김) |
| 다크 흐름 | `__dark__reason`, `__dark__bulk-bar`, `__dark__users` | 같은 스크립트 |
| 가로 넘침 검사 | (파일 없음) | 360, 390, 1280에서 세 안 x 네 구역 모두 넘침 0 |

## 2. 번들 요약 (gzip, 추정)

- **새 의존성 없음.** 세 안 모두 공용 Badge, Button, Checkbox, Chip, Tabs, Input, Dialog(Base UI), Sonner 토스트, Lucide 아이콘, CSS 전환만 씁니다. Motion도 쓰지 않습니다.
- **관리자 화면은 홈과 랜딩 첫 로드 밖**(`/admin`, 관리자만)이라 홈 200 KB 예산(T8.11)과 무관합니다. 세 안 차이는 화면 코드 몫(1~2 KB 안팎)입니다. B는 표와 일괄 처리 줄 코드가 조금 더 크고, A와 C는 단축키 코드가 더 있습니다. 실제 값은 T8.5 구현 뒤 `pnpm build`로 재서 `bundle-log.md`에 남깁니다.
- 토스트는 디자인 랩이라 `sonner.tsx`의 Toaster를 바로 썼습니다. 실제 구현은 `lazy-toaster`를 씁니다.

## 3. 공통으로 지킨 것

- **구역 4개**: 신고된 후기(후기 신고와 할인 신고를 함께, `review_reports.target_type`), 폐업 제보, 사용자(정지와 해제), 처리 이력. 구역 이름 옆 숫자는 검토 대기 수입니다(사용자는 정지 검토 후보 수).
- **큐 순서**: 자동 숨김(신고 3건, MOD-02)이 먼저, 그다음 신고 수 많은 순, 같으면 오래된 순.
- **처리 흐름**: 숨기기는 사유 고르기를 한 번 거칩니다(가장 많이 받은 신고 사유를 미리 고름, "광고, 스팸 사유로 숨기기"). 복구와 문제없음은 바로 반영합니다. 둘 다 토스트 "후기를 숨겼습니다. / 처리 이력에서도 되돌릴 수 있습니다." + **되돌리기**(8초)를 주고, 처리 이력 줄에도 되돌리기가 남습니다. **정지, 정지 해제, 일괄 처리, 폐업 확인은 확인 상자**를 한 번 거칩니다. 정지 상자에서 사유(신고 누적, 광고 도배, 욕설과 비방, 개인정보 노출, 기타)와 기간(7일, 30일, 해제할 때까지)을 고르고, 최종 버튼만 `destructive` 글자색입니다.
- **장소 이름(T0.16, T5.12a)**: 카카오 이름은 저장하지 않으므로 기본 표시는 "장소 1840235701" + "카카오맵에서 보기"(새 창, `place_url`)입니다. 이 브라우저 세션에서 이름을 찾았을 때만 이름을 보이고 그 아래 "이 브라우저에서 찾은 이름입니다. 저장하지 않습니다."를 붙였습니다(목업은 일부만 찾은 상태). 카테고리도 저장값이 없어 **일러스트는 쓰지 않았습니다.**
- **비공개 후기(AC-FB-2)**: 신고는 공개 후기에만 들어오지만(`review_reports_before_insert`), 신고 뒤 작성자가 나만 보기로 바꾸면 글을 보이지 않고 "작성자가 신고 뒤 나만 보기로 바꿔 글을 볼 수 없습니다. 지금은 다른 분들께 보이지 않습니다."로 대신합니다(목업 r4, 5절 안건 3).
- **색**: 올리브 면 버튼은 화면에 하나(숨기기 또는 숨김 확정, 폐업 확인, B는 일괄 처리 줄의 숨기기). 상태는 의미 색 없이 점 하나(자동 숨김은 채운 점 + foreground 글자, 신고 접수는 빈 점)와 중립 배지로 나눕니다. 주황(warning)은 쓰지 않습니다(DESIGN.md 2장, 기피 경고 전용).
- **모션**: 처리한 줄은 높이와 투명도가 base(260ms) `exit`로 접히며 빠지고(B 표 줄은 8px 밀리며 흐려짐), 상세와 다음 카드는 base 페이드로 들어옵니다. 사유 단계는 4px 위로 페이드. 모두 `motion-safe:`/`motion-reduce:`로 축소 모드에서 즉시 바뀝니다. 동시에 움직이는 것은 하나뿐입니다.
- **4상태**: 로딩은 각 배치 모양 스켈레톤(`LoadingRegion`, "관리 목록을 불러오는 중입니다"), 빈 상태는 "검토할 신고가 없습니다" + "처리 이력 보기"(C는 "오늘 검토할 것을 모두 마쳤습니다"), 오류는 공용 ErrorState "관리 목록을 불러오지 못했습니다 / 잠시 뒤 다시 시도해 주세요. 처리한 내용은 그대로 저장되어 있습니다.", 오프라인은 위아래 헤어라인 한 줄 "오프라인입니다. 마지막으로 받은 목록입니다. 연결되면 처리할 수 있습니다." + 처리 버튼 비활성.
- **문구**: `src/copy/design-lab-admin.ts`(습니다체 위주, 확인 질문만 해요체, 금지 문자 0). 목업 닉네임, 식당 이름, 후기 글은 지어낸 값이고, 테스트 계정 표기는 `test_` 접두 규칙을 따랐습니다.

## 4. 비교표

원칙 부합도 순서: 10초 / 3개 이하 / 설명 / 한 탭 / 미니멀. 관리자 화면은 사용자 결정 화면이 아니므로 "10초"는 "한 건 판단 시간", "3개 이하"는 "한 번에 고르는 처리 버튼 수"로 읽었습니다.

| 항목 | A 받은편지함 | B 표와 일괄 처리 | C 한 건씩 검토 |
| --- | --- | --- | --- |
| 대표 캡처 | [1280](shots/2026-11-01/design-lab-admin-a__1280__light.png), [390](shots/2026-11-01/design-lab-admin-a__390__light.png), [1280 다크](shots/2026-11-01/design-lab-admin-a__1280__dark.png), [390 상세와 사유](shots/2026-11-01/design-lab-admin-a__390__light__reason.png), [정지 확인](shots/2026-11-01/design-lab-admin-a__1280__light__suspend.png), [폐업](shots/2026-11-01/design-lab-admin-a__1280__light__closures.png) | [1280](shots/2026-11-01/design-lab-admin-b__1280__light.png), [390](shots/2026-11-01/design-lab-admin-b__390__light.png), [1280 다크](shots/2026-11-01/design-lab-admin-b__1280__dark.png), [일괄 줄](shots/2026-11-01/design-lab-admin-b__1280__light__bulk-bar.png), [일괄 확인](shots/2026-11-01/design-lab-admin-b__1280__light__bulk-confirm.png), [펼침](shots/2026-11-01/design-lab-admin-b__1280__light__expanded.png), [사용자](shots/2026-11-01/design-lab-admin-b__1280__light__users.png) | [1280](shots/2026-11-01/design-lab-admin-c__1280__light.png), [390](shots/2026-11-01/design-lab-admin-c__390__light.png), [1280 다크](shots/2026-11-01/design-lab-admin-c__1280__dark.png), [사유 단계](shots/2026-11-01/design-lab-admin-c__1280__light__reason.png), [사용자 큐](shots/2026-11-01/design-lab-admin-c__1280__light__users.png), [모두 마침](shots/2026-11-01/design-lab-admin-c__1280__light__empty.png) |
| 의도 (한 줄) | 메일함처럼 목록을 훑으며 한 건씩 열어 판단한다. 좌 메뉴 + 가운데 목록 + 우 상세, 단축키 J/K/H/R/S/Z | 많은 건을 한눈에 비교하고 같은 판단을 한 번에 내린다. 상태 칩 + 찾기 + 데이터 표 + 아래 일괄 처리 줄 | 목록을 숨기고 지금 볼 한 건에만 집중한다. 후기 글이 큰 세리프 카드의 주인공, 결정하면 다음 카드, 오른쪽에 오늘 처리 타임라인 |
| 신고 후기 처리 | 상세 아래 고정 줄: 숨김 확정(H) / 복구(R). H 한 번 더 또는 버튼으로 사유 확정. 처리 뒤 다음 건 자동 선택 | 줄 체크 → 일괄 줄 숨기기 / 복구 → 확인 상자(숨기기는 사유 라디오 포함). 줄 펼치기로 글 전체, 기타 사유, 작성자 | 카드 아래: 숨김 확정(H) / 복구(R) / 건너뛰기(J, 큐 맨 뒤로). 사유 단계는 카드 안에서 펼침 |
| 폐업 제보 | 목록 + 상세(아예 닫았어요, 옮겼어요, 오늘만 쉬어요 숫자 3칸) + 폐업 확인 / 영업 중으로 두기 | 표 열로 세 숫자 + 상태 배지 + 줄 끝 버튼 2개 | 카드 하나에 숫자 3칸 + 결정 2개 |
| 사용자 | 목록(정지 중, 숨겨진 글 많은 순) + 상세(숫자 2칸, 그 사람의 신고된 글) + 정지/해제 | 표(로그인, 받은 신고, 숨겨진 글, 상태, 가입) + 줄 끝 정지/해제, 닉네임 찾기 | 정지 검토 후보 큐(숨겨진 글 2건 이상) 카드 + 정지/문제없음, 아래 "정지 중" 목록과 해제 |
| 처리 이력 | 전체 폭 목록, 줄마다 되돌리기 | 표(시각, 처리, 대상, 사유, 처리한 분) + 되돌리기 | 세로 타임라인. 다른 구역에서도 오른쪽 칸에 "오늘 처리한 것"이 늘 보임 |
| 390 | 목록 한 칸 → 줄을 누르면 상세가 대신, "목록으로". 처리 줄 화면 아래 고정 | 표 대신 쌓은 줄(체크 + 제목 + 본문 한 줄 + 메타). 일괄 줄 아래 고정 | 카드 한 장 + 아래 고정 결정 줄. 타임라인은 카드 아래 접힌 묶음 |
| 장점 | 관리 도구의 익숙한 문법이라 배울 것이 없다. 목록 맥락(다음에 뭐가 있나)과 상세 판단이 한 화면. 단축키로 마우스 없이 빠르게. 데스크톱 2단 문법(좌 리스트 + 우 상세)이 앱과 이어진다 | 같은 광고 도배를 한 번에 치운다(광고 계정이 여러 글을 쓸 때 가장 빠름). 찾기와 칩으로 원하는 건만 골라 본다. 데이터가 늘어도 구조가 그대로다. 처리됨 칩으로 지난 결정을 다시 본다 | 판단 품질이 가장 좋다. 글이 크게 보여 맥락을 놓치지 않고, 한 번에 하나라 실수로 다른 건을 처리할 일이 없다. 1인 운영(PRD Q9)에서 "오늘 몇 건 남았나"가 진행 막대로 분명하다. 가장 조용하고 브랜드와 닮았다 |
| 약점 | 상세 칸이 넓어 1280에서 오른쪽이 조금 비어 보인다. 390에서는 목록과 상세를 오가야 한다. 3단이라 정보가 가장 많다 | 줄마다 글이 한 줄로 잘려 판단 전에 펼쳐야 한다. 일괄 처리는 실수 범위가 크다(확인 상자로 막지만). 가장 "도구 같은" 모양이라 미니멀이 약하다. 390에서 정보 밀도가 높다 | 여러 건을 비교하거나 한꺼번에 치우기 어렵다(광고 도배 10건이면 10번). 원하는 건으로 바로 가려면 처리 이력이나 찾기가 따로 필요하다. 건너뛰기를 많이 쓰면 순서가 흐려진다 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | ○ / ○ / ○ / ○ / △ | △ / ○ / △ / ○ / △ | ○ / ○ / ○ / ○ / ○ |
| 사용한 동적 컴포넌트 | 줄 접힘(grid-rows, base exit), 상세 페이드, Dialog, Sonner, 단축키 | 줄 흐림 + 8px, 일괄 줄 올라옴(base), 펼침 페이드, Dialog, Sonner | 카드 나감 -8px + 들어옴 +8px(base), 진행 막대 폭(base), 타임라인 줄 페이드, Dialog, Sonner, 단축키 |
| 효과가 결정을 돕는가 | 줄이 빠지는 것이 "처리됐다"를 알리고 다음 건으로 눈을 옮긴다 | 일괄 줄이 "몇 건을 고르고 있나"를 늘 보인다 | 카드 교체와 진행 막대가 "하나 끝, 몇 개 남음"을 알린다 |
| 번들 증가량 (gzip, 추정) | 새 의존성 0 | 0 | 0 |
| 접근성 위험 | 낮음~중간. 단축키는 입력 칸과 상자 안에서 꺼지지만, 한 글자 단축키는 WCAG 2.1.4에 따라 끄거나 바꾸는 설정이 필요(구현 때 "단축키 끄기" 토글 또는 수정자 키 검토). 목록 줄은 `aria-current` 버튼 | 낮음. 표는 `caption` + `th scope`, 체크는 줄마다 이름("후기 정담국밥 선택"), 모두 선택은 indeterminate. 390은 목록 의미(ul) | 낮음~중간. 단축키는 A와 같은 과제. 카드가 바뀔 때 스크린 리더에 알리는 `role="status"`와 초점 이동(새 카드 제목)이 구현 과제. 진행 막대 `role="progressbar"` |
| Claude 추천과 이유 | 차순위 | 부분 채택: **일괄 처리만** | **추천 (조합).** 1인 운영 MVP의 신고량(하루 수 건)에서는 한 건을 제대로 읽고 판단하는 것이 속도보다 중요하고, 화면도 가장 조용합니다. 조합: **C 큐 + 오른쪽 오늘 타임라인**을 기본으로, **B의 일괄 숨김**을 "같은 작성자의 다른 신고 글 N건도 함께 숨기기" 한 줄로 카드 안에 넣어 광고 도배를 한 번에 치우고, **A의 단축키 안내**(좌하단 묶음)와 처리 이력 구역의 목록 형태를 가져옵니다. 폐업과 사용자 구역은 C 그대로 |

## 5. 함께 정할 안건

| # | 안건 | 선택지 | Claude 기본안 |
| --- | --- | --- | --- |
| 1 | 화면 구조 | A / B / C / 조합 | **C 큐 + 같은 작성자 일괄 숨김(B) + 단축키 안내(A)**(4절 추천) |
| 2 | 관리자 판별과 가드 | `profiles.role = 'admin'`(이미 있음) + 서버 가드 / 별도 관리자 테이블 / service role 서버 함수 | **`profiles.role = 'admin'` 하나.** 세 겹으로 막습니다. (1) `src/proxy.ts`가 이미 `/admin`을 로그인 필요로 보호(T4.8), (2) `/admin` 레이아웃 서버 컴포넌트가 role을 읽어 관리자가 아니면 `notFound()`(403 대신 404로 존재를 숨김), (3) 모든 관리 데이터와 처리는 `private.is_admin()`(auth.uid()의 role 확인)을 먼저 보는 `security definer` 함수(`admin_*`)로만. 브라우저에 service role 키는 없습니다. role은 사용자 열 권한이 없어 바꿀 수 없고(T4.4), 관리자 지정은 Supabase SQL 편집기에서만 합니다(PRD Q9 본인 단독, T10.5 절차 문서) |
| 3 | 신고된 후기 글 열람 경로와 비공개 전환 | (a) 신고 시점 글 스냅숏 저장 / (b) 지금 공개인 글만 보여 줌 / (c) 관리자는 비공개도 열람 | **(b) 지금 공개인 글만.** PRD AC-FB-2와 CLAUDE.md 7장("비공개 후기 텍스트는 어떤 API 응답에도 나오면 안 된다")을 관리자 응답에도 그대로 적용합니다. 신고는 공개 후기에만 들어오므로(트리거) 대부분 열람되고, 신고 뒤 작성자가 나만 보기로 바꾼 글만 `admin_reported_items()`가 `body`를 null로 주고 `private_now = true` 플래그를 줍니다. 그 글은 이미 남에게 안 보이므로 판단은 "숨김 유지(기본)" 쪽으로 두고, 나중에 다시 공개로 바꿔도 숨김(`hidden_at`)은 유지됩니다. 스냅숏(a)은 텍스트 사본이 하나 더 생겨 탈퇴 삭제(11.4)와 비공개 약속을 함께 지키기 어려워 두지 않습니다. 기타 사유 메모(`review_reports.note`)는 "관리자만 본다"는 기존 주석대로 같은 함수에서만 줍니다 |
| 4 | 열람 감사 로그 | 처리만 기록 / 열람도 기록 | **처리만 기록.** 관리자가 1인이고 열람 대상이 공개 글뿐이라 열람 로그는 두지 않습니다. 운영자를 늘리는 시점(Q9)에 `admin_reported_items` 호출 기록을 추가합니다 |
| 5 | 처리 이력 보관 | 테이블로 보관(1년) / 무기한 / 두지 않음(현재 상태만) | **새 테이블 `private.moderation_actions`에 1년 보관.** 되돌리기, 이의 대응, 정지 근거에 필요합니다. 1년 지난 행은 기존 pg_cron 정리 작업(T6.26)에 한 줄 추가. 대상 사용자가 탈퇴하면 `target_user_id`를 null로 바꾸고(익명) 대상 글 id는 cascade로 함께 지우지 않고 null 처리, 처리 종류와 시각만 남깁니다(탈퇴 범위 `ACCOUNT_DELETION_SCOPE`에 추가). 처리 이력 화면 아래 "처리 이력은 1년 동안 보관합니다." |
| 6 | 정지의 효과 범위 | (a) 쓰기 차단 + 공개 글 숨김, 로그인 허용 / (b) 로그인 자체 차단(Supabase Auth ban) / (c) 둘 다 | **(a) 쓰기 차단 + 공개 글 숨김, 로그인은 허용.** 후기, 신고, 제보(정보, 할인, 웨이팅), 할인 확인, 투표방 만들기와 투표, 후보 제안을 막고, 공개 후기는 이미 `place_reviews`와 `public_profiles`가 `status = 'active'`만 보여 줘서 자동으로 빠집니다. 로그인은 막지 않아 탈퇴와 내 기록 보기, 문의(MOD-07)는 됩니다. 정지된 사용자에게는 쓰기 시도 때 "이용이 제한된 계정입니다. 문의는 ○○로 보내 주세요." 안내(문구는 T8.5). Auth ban(b)은 탈퇴 경로까지 막아 11.4 정책과 충돌해 쓰지 않습니다 |
| 7 | 정지 기간 | 기간 고름(7일, 30일, 해제할 때까지, 시안) / 해제할 때까지만 | **기간 고름.** 기간이 있으면 `suspended_until`이 지나면 pg_cron(1분 작업에 합류 또는 하루 1회)이 `active`로 되돌립니다. 기본 선택은 7일 |
| 8 | 처리 확인 단계 | 단건 숨김, 복구는 바로 + 되돌리기 토스트 / 모든 처리에 확인 상자 | **단건은 바로 + 되돌리기(8초) + 이력에서 되돌리기, 정지와 일괄, 폐업 확인만 확인 상자.** 되돌리기 쉬운 처리를 상자로 늦추지 않습니다 |
| 9 | 자동 숨김(MOD-02)과 관리자 복구의 관계 | (a) 복구하면 그때까지의 신고는 세지 않음 / (b) 복구해도 다음 신고 1건에 다시 숨김 | **(a).** 지금 트리거(`review_reports_after_insert`)는 전체 신고 수가 3 이상이면 숨기므로, 복구 뒤 신고 1건만 와도 다시 숨겨집니다. `reviews.moderated_at`(그리고 `place_deals.moderated_at`)을 두고 그 뒤에 들어온 신고만 세도록 트리거를 고칩니다. 관리자가 숨김을 확정하면 `hidden_reason`을 `reports`에서 `admin`으로 바꿔 "검토 대기"와 "확정"을 나눕니다(기존 제약에 `admin` 값이 이미 있음) |
| 10 | 신고 1~2건(아직 보이는 글)도 큐에 넣는가 | 넣음(시안) / 자동 숨김된 것만 | **넣음, 자동 숨김 뒤에.** 개인정보 노출처럼 3건을 기다리면 안 되는 글을 먼저 숨길 수 있게 합니다 |
| 11 | 폐업 제보 처리의 의미 (MOD-03) | 폐업 확인 = 계속 추천 제외, 영업 중으로 두기 = 지금까지의 제보 무효 / 폐업 확인만 | **둘 다.** 지금 `place_stats.closed`는 서로 다른 3명의 제보 수로만 계산합니다. 새 테이블 `place_moderation`에 `closed_status`(confirmed/dismissed)와 결정 시각을 두고, confirmed면 제보 수와 무관하게 closed, dismissed면 결정 시각 뒤의 제보만 셉니다. 저장하는 카카오 값은 `place_id`뿐이라 T0.16을 지킵니다. "오늘만 쉬어요"는 지금처럼 세지 않고 참고 숫자로만 보입니다. 가격, 정보 제보(`place_reports.kind = price/info`)는 MVP 관리자 화면에서 빼고 2단계 후보로 둡니다(PRD MOD-06은 폐업만) |
| 12 | 관리자 화면의 장소 이름 | (a) 장소 번호 + 카카오맵 링크만 / (b) 관리자가 기준점을 정해 FD6 매칭으로 세션 이름 찾기 / (c) 이름 저장 | **(a) 기본 + (b) 선택.** 관리자 화면에는 기준점(사무실 핀)이 없어 T5.12a의 FD6 매칭이 바로 되지 않습니다. 기본은 장소 번호 + "카카오맵에서 보기", 위에 "이 주변에서 이름 찾기"(관리자가 지도 중심을 정하면 그 주변 FD6 결과로 세션 메모리에서만 맞춰 봄)를 둡니다. (c) 저장은 T0.16 위반이라 하지 않습니다 |
| 13 | 한 글자 단축키 (WCAG 2.1.4) | 그대로 / 끄기 토글 / 수정자 키 | **끄기 토글.** 좌하단 단축키 묶음에 "단축키 끄기" 스위치(localStorage 편의 설정)를 둡니다. 입력 칸과 확인 상자 안에서는 지금처럼 듣지 않습니다 |
| 14 | 정지 검토 후보 기준 | 숨겨진 글 2건 이상(시안) / 받은 신고 수 / 없음(목록만) | **숨겨진 글 2건 이상.** 신고 수는 경쟁 가게의 몰아 신고에 흔들리므로 관리자나 자동 숨김을 거친 결과로 봅니다 |
| 15 | 분석 이벤트 | 관리자 행동도 PostHog / 처리 이력 테이블만 | **처리 이력 테이블만.** PRD 10.2에 관리자 이벤트가 없고, 운영 지표는 테이블로 충분합니다 |

### 스키마 변경 (T8.5에서 새 마이그레이션 하나로, 이 단계에서는 만들지 않음)

이미 있는 것: `profiles.role`(user/admin), `profiles.status`(active/suspended), `reviews.hidden_at/hidden_reason`(`reports`, `admin`), `place_deals.status/hidden_reason`(`reports`, `admin` 포함), 공개 후기와 공개 프로필에서 정지 사용자 제외.

| 대상 | 변경 | RLS와 권한 |
| --- | --- | --- |
| `profiles` | `suspended_until timestamptz`(null = 해제할 때까지), `suspended_reason text`(신고 누적, 광고 도배, 욕설과 비방, 개인정보 노출, 기타 slug) 추가. 둘 다 `status = 'suspended'`일 때만 값(check) | 사용자 열 권한 없음(기존 원칙대로 role, status처럼). 본인 읽기 정책은 그대로(정지 안내에 씀) |
| `private.is_admin()` | 새 함수: `auth.uid()`의 `profiles.role = 'admin'` | `security definer`, `search_path = ''` |
| `private.is_active_user()` | 새 함수: 본인 `status = 'active'` | 쓰기 정책과 쓰기 함수(`register_deal`, `report_wait`, 투표 함수들)에서 사용 |
| 쓰기 정책 (reviews, review_reports, place_reports, place_deal_checks, wait_reports, polls, poll_votes, poll_candidates 제안 등) | insert/update 정책 `with check`에 `private.is_active_user()` 추가, 또는 공통 before 트리거 하나에서 막기 | 정지 사용자는 "본인" 역할에서도 쓰기 거절을 RLS 테스트로 증명(본인 / 타인 / 비로그인 + 정지 본인) |
| `reviews`, `place_deals` | `moderated_at timestamptz` 추가. 자동 숨김 트리거는 `created_at > coalesce(moderated_at, '-infinity')`인 신고만 셈(안건 9) | 사용자 열 권한 없음 |
| `public.place_moderation` (새) | `place_id text primary key`(카카오 값은 이것뿐), `closed_status text check in ('confirmed','dismissed')`, `decided_at`, `decided_by uuid` | RLS 켬, 정책 없음(직접 접근 불가). `place_stats`가 security definer 안에서 읽음. 쓰기는 `admin_*` 함수만 |
| `private.moderation_actions` (새) | `id`, `admin_id`, `action`(review_hide, review_restore, deal_hide, deal_restore, closed_confirm, closed_dismiss, user_suspend, user_unsuspend), `target_type`, `target_id uuid null`, `target_place_id text null`, `target_user_id uuid null`, `reason text`, `duration text`, `reverted_by uuid null`(되돌린 행), `created_at` | private 스키마, RLS 켬 + 정책 없음. 읽기와 쓰기는 `admin_*` 함수만. 1년 정리 pg_cron, 탈퇴 시 target_user_id null(안건 5) |
| `admin_*` 함수 (새) | `admin_reported_items()`(공개 글만 body, 비공개 전환은 플래그, 사유별 수, note, 작성자 요약), `admin_closures()`, `admin_users(query)`, `admin_log(limit)`, `admin_decide_item(id, result, reason)`, `admin_decide_closure(place_id, result)`, `admin_set_suspension(user_id, status, duration, reason)`, `admin_undo(action_id)` | 모두 첫 줄 `if not private.is_admin() then raise` + `security definer`. `authenticated`에만 execute, RLS 테스트로 비관리자 거절과 비공개 글 body null을 증명 |

## 6. 품질 메모

- `pnpm lint`(CSS 하드코딩 색 없음), `pnpm typecheck`, `pnpm lint:copy`(금지 문자 0, design-lab 문구라 비율 제외) 통과. 단위 테스트 `src/features/design-lab/admin/admin-lab.test.ts` 6건(쿼리 해석, 큐 순서, 사유 기본값, 오늘만 쉬어요 제외, 금지 문자) 통과.
- 가로 넘침: 360, 390, 1280 x 세 안 x 네 구역에서 0(스크립트 검사).
- 동작 확인(Playwright 스크립트): C에서 H, H로 숨기면 진행 막대 1, 토스트와 타임라인 줄 추가 / A에서 J, R로 복구하면 목록 7 → 6, Z로 되돌리면 7 / B에서 3줄 일괄 숨김하면 표 7 → 4.
- 구현 때 고칠 것: A와 C의 390 사유 단계는 라디오 묶음이 첫 화면 아래에 있어 열 때 그 자리로 스크롤(또는 하단 시트로), C의 카드 교체 때 새 카드 제목으로 초점 이동과 `role="status"` 알림, B 표의 내용 열 폭(글이 일찍 잘림), 확인 상자의 첫 초점(지금은 첫 라디오 칩에 초점 링이 보임), 토스트는 `lazy-toaster`로, 단축키 끄기 토글(안건 13).
- 목업 시각은 고정값("11월 1일 14:40")이라 처리 이력의 새 줄 시각이 실제 시각과 다릅니다. 실제는 `src/lib/time`의 KST 포맷.
- `[실기기]` 관리자 화면은 데스크톱 우선이라 실기기 확인 항목이 없습니다. 모바일에서 긴급 처리(390) 정도만 T8.5 뒤 확인합니다.
