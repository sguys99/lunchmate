# 10단계 식당 메모 비교 자료 (T10.15 ⛔ 선택)

> **선택 (2026-11-03, design-decisions D-33)**: **B 이름표 시트.** 안건: (1) 홈 카드 메모 배지는 카드 배지가 2개 미만일 때만(할인, 웨이팅 배지가 먼저, 배지 최대 2개), 카드 높이 그대로, D-25 한 화면 유지. 홈 메모 읽기는 기존 집계 요청(stats-query 서버 액션)에 묶어 왕복을 늘리지 않음 (2) 40자(코드 포인트, DB와 zod) (3) 금칙어 적용(T10.3b 트리거 재사용) (4) C의 장애 홈 "즐겨찾기에서 고르기"(메모 있는 즐겨찾기 3곳까지, 카카오 오류 뒤에만 읽음)를 더함. 나머지는 5절 기본안(즐겨찾기와 독립, 추천 점수 미반영, 하루 30회 + 1인 300곳, 탈퇴 cascade, 플래그 끄면 숨김만, 새 분석 이벤트 없음). 마이그레이션 `supabase/migrations/20261103100000_t10_15_place_memos.sql`(승인 대기, 아직 적용 전), RLS 테스트 `src/lib/supabase/rls/t10-place-memos.rls.test.ts`.
>
> ⛔ T10.15 식당 메모(D-32) 시안 게이트입니다. 시안 하나(또는 조합)를 고르고 5절 안건을 함께 정합니다. 고른 뒤 6절 설계안을 새 마이그레이션으로 옮겨 내용을 보여 드리고 승인을 받은 다음 `db:backup` → `db:push`로 넘어갑니다. 지금은 **마이그레이션 파일이 없습니다**(이 문서에만 초안).
> D-32 요약: 나만 보는 메모 하나를 두 용도로. (1) 상세 시트에서 쓰고, 다시 추천될 때(홈 카드나 상세)와 즐겨찾기에서 보임 (2) 즐겨찾기 이름표 겸 카카오 장애나 이름 확인 실패 때 이름 자리 대체. 빈 입력란에 사용자가 직접 쓴 글만, 장소명 미리 채우기와 붙여 넣기 버튼 금지, 본인만 조회, `userPlaceMemo` 플래그로 끌 수 있게.
> 시안 라우트와 쿼리(머리 주석이 정본, `src/features/design-lab/memo/params.ts`): `/design-lab/memo/<a|b|c>?state=ready|loading|empty|error|offline&view=detail|home|favorites|outage&edit=1&fail=save|banned|limit`. 코드 `src/features/design-lab/memo/`(공용 `shared.tsx`, 안별 `a/`, `b/`, `c/`), 문구 `src/copy/design-lab-memo.ts`.
> 관련: CLAUDE.md 1장(10초, 3개 이하), 6장(카드 숫자 3개 + 이유 1줄 + 배지 최대 2개, 올리브 버튼 하나), 7장 첫 항목(카카오 값 저장 금지, 메모 규칙), research-notes T0.16-2의 4번과 T0.16-3, external-inquiries 3장 "메모 허용" 행, PRD APP-02와 12장 "즐겨찾기에서 고르기", DESIGN.md 5장 "오늘(홈) 화면"(D-25 한 화면 압축), "식당 상세"(D-10), "나 탭"(D-12 안건 6 미해결 이름).

## 1. 캡처

폴더 `docs/design/shots/2026-11-02/`, 파일 이름 `memo-<a|b|c>__<390|1280>__<light|dark>[__<상태 또는 화면>].png`. 2026-11-02 공용 dev 서버(3102)에서 찍었습니다. 축소 모션, Next 개발 표시 숨김.

| 묶음 | 파일 이름 끝 | 찍는 방법 |
| --- | --- | --- |
| 상세 기본 + 4상태, 390과 1280 x 라이트, 다크 (60장) | 접미사 없음, `__loading`, `__empty`, `__error`, `__offline` | `pnpm shots /design-lab/memo/a /design-lab/memo/b /design-lab/memo/c --base-url http://localhost:3102 --states --full-page false`로 찍고 `design-lab-` 앞머리를 `memo-`로 바꿈 |
| 화면별 (390 라이트) | `__edit`, `__home`, `__favorites`, `__outage`, `__banned`, `__limit` | 쿼리 캡처 스크립트(같은 뷰포트 규칙) |
| 다크, 1280 화면 | `__390__dark__edit`, `__390__dark__home`, `__1280__light__edit`, `__1280__light__favorites` | 같은 스크립트 |
| 추가 | C `__favorites-manage`(이름표 정리), A `__outage-nomemo`(메모 없는 장애), B `__home-empty`(메모 없는 홈 카드) | 같은 스크립트 |
| 가로 넘침 검사 | (파일 없음) | 360, 390, 1280에서 세 안 x 여섯 화면 넘침 0, 콘솔 오류 0 |

상태의 뜻: `__loading`은 상세 본문(세션 메모리 이름)은 보이고 **메모 자리만** 스켈레톤(메모는 우리 DB 값이라 따로 옴), `__empty`는 아직 메모가 없는 식당(쓰는 입구가 보임, C는 즐겨찾기도 꺼진 상태), `__error`는 쓰는 중 저장 실패와 "다시 저장"(쓴 글 유지), `__offline`은 받은 메모를 그대로 보이고 고치기를 `aria-disabled` + 위 안내 한 줄입니다.

한 장 비교 이미지(행 = 시안, 열 = 상세, 쓰는 중, 홈 카드, 즐겨찾기, 장애 대체): 게이트 때 첨부하는 scratchpad 파일입니다(저장소에는 넣지 않음).

## 2. 번들 요약 (gzip, 추정)

- **새 의존성 없음.** 세 안 모두 기존 입력 클래스, Badge, PlaceBadges, Base UI Drawer(B만), 상태 컴포넌트, Lucide 아이콘 2~3개, CSS 전환(grid-rows, `tw-animate-css`)만 씁니다. Motion(`m`)은 쓰지 않습니다.
- **A**: 메모 줄은 상세 시트 안이라 "상세"를 누른 뒤 받는 상세 청크에 약 1~1.5 KB가 붙습니다. 홈(`/today`) 첫 로드 0, 홈 요청 수 0.
- **B**: 상세 청크에 약 1.5~2 KB(작은 시트는 Drawer 덩어리 재사용). 홈 카드 배지 줄에 메모 배지가 들어가 **홈 첫 로드 약 0.3 KB + 홈에서 메모를 읽는 요청**이 필요합니다(카드 3곳 `place_id`로 본인 메모 조회. 기존 집계 요청 `stats-query`에 묶으면 왕복은 늘지 않지만 그 함수의 응답이 바뀜).
- **C**: 상세 청크 약 1~1.5 KB + 홈 카드 머리 줄 약 0.2 KB + B와 같은 홈 메모 조회. 즐겨찾기 "이름표 정리"는 나 탭 장소 패널 청크(홈 밖).
- 실제 값은 구현 뒤 `pnpm build`의 bundle-report로 재서 `bundle-log.md`에 남깁니다.

## 3. 공통으로 지킨 것

- **입력**: 한 줄 `input`, 늘 빈 칸에서 시작(이미 쓴 메모를 고칠 때만 그 메모가 들어 있음). 카카오 장소명 미리 채우기, "이름 붙여 넣기" 버튼, 자동 완성 없음(`autoComplete="off"`). 자리표시자는 장소명이 아닌 일반 예시 "예: 깍두기가 맛있는 곳". 길이 40자(코드 포인트, `tabular-nums` 글자 수, 넘으면 빨간 수 + 한 줄, 저장 꺼짐). 공백과 줄바꿈은 한 칸으로, 앞뒤 공백 제거(`normalizeMemo`, 테스트). 빈 칸 저장 = 메모 지우기. Enter(한글 조합 중 제외)로 저장.
- **본인만**: 상세, 홈, 즐겨찾기 어디서도 다른 사람 메모를 보이지 않고, 메모 옆에 "나만 볼 수 있습니다." 한 줄(A, B 시트 설명, C는 즐겨찾기 맥락).
- **올리브 버튼은 화면에 하나**: 상세의 길찾기(장애 때는 "카카오맵에서 보기")만 올리브. 저장은 A, C 테두리 작은 버튼, B는 시트(별도 층) 안 주 버튼.
- **이름 대체(장애, 이름 확인 실패)**: 메모가 있으면 메모가 이름 자리로 가고, "내 메모" 표시 + "카카오에서 이름을 불러오지 못해 내 메모로 보여 드립니다." 메모가 없으면 지금 규칙 그대로("이름을 불러오지 못했습니다.", 즐겨찾기 "저장한 식당 5" + 카카오맵 링크). 카테고리와 이유 한 줄은 카카오 값에서 나오므로 장애 때는 보이지 않습니다. 메모를 이름처럼 보여도 스크린 리더에는 "내 메모"가 먼저 읽힙니다.
- **상태 문구**: 저장 실패 "메모를 저장하지 못했습니다. 쓴 내용은 그대로 있으니 다시 저장해 주세요.", 금칙어는 기존 `moderationCopy.banned`, 한도 "오늘은 메모를 30번 저장했습니다. 내일 다시 고칠 수 있습니다.", 오프라인 "인터넷에 연결되어 있지 않아 메모를 고칠 수 없습니다. 연결되면 다시 시도해 주세요." 쓴 글은 어느 경우에도 지우지 않습니다. 결과 한 줄 "메모를 저장했습니다." / "메모를 지웠습니다."(`role="status"`, 4px 위로 페이드 slow).
- **문구**: `src/copy/design-lab-memo.ts`(디자인 랩 전용). 금지 문자 0(`pnpm lint:copy`), 상태와 설명은 습니다체, 질문("이름표를 달아 둘까요?")은 해요체. 목업 메모는 장소명을 담지 않음(테스트).

## 4. 비교표

원칙 부합도 순서: 10초 / 3개 이하 / 설명 / 한 탭 / 미니멀.

| 항목 | A 상세 안 한 줄 | B 이름표 시트 | C 즐겨찾기 이름표 |
| --- | --- | --- | --- |
| 대표 캡처 | [상세](shots/2026-11-02/memo-a__390__light.png), [쓰는 중](shots/2026-11-02/memo-a__390__light__edit.png), [홈](shots/2026-11-02/memo-a__390__light__home.png), [즐겨찾기](shots/2026-11-02/memo-a__390__light__favorites.png), [장애](shots/2026-11-02/memo-a__390__light__outage.png), [금칙어](shots/2026-11-02/memo-a__390__light__banned.png), [오프라인](shots/2026-11-02/memo-a__390__light__offline.png), [1280 쓰는 중](shots/2026-11-02/memo-a__1280__light__edit.png), [다크 쓰는 중](shots/2026-11-02/memo-a__390__dark__edit.png) | [상세](shots/2026-11-02/memo-b__390__light.png), [시트](shots/2026-11-02/memo-b__390__light__edit.png), [홈 배지](shots/2026-11-02/memo-b__390__light__home.png), [즐겨찾기](shots/2026-11-02/memo-b__390__light__favorites.png), [장애](shots/2026-11-02/memo-b__390__light__outage.png), [실패](shots/2026-11-02/memo-b__390__light__error.png), [로딩](shots/2026-11-02/memo-b__390__light__loading.png), [1280 시트](shots/2026-11-02/memo-b__1280__light__edit.png), [다크 홈](shots/2026-11-02/memo-b__390__dark__home.png) | [상세](shots/2026-11-02/memo-c__390__light.png), [별 켠 뒤 띠](shots/2026-11-02/memo-c__390__light__edit.png), [홈 머리 줄](shots/2026-11-02/memo-c__390__light__home.png), [즐겨찾기](shots/2026-11-02/memo-c__390__light__favorites.png), [이름표 정리](shots/2026-11-02/memo-c__390__light__favorites-manage.png), [장애 홈](shots/2026-11-02/memo-c__390__light__outage.png), [한도](shots/2026-11-02/memo-c__390__light__limit.png), [1280 즐겨찾기](shots/2026-11-02/memo-c__1280__light__favorites.png), [다크 홈](shots/2026-11-02/memo-c__390__dark__home.png) |
| 의도 (한 줄) | 상세의 "내 방문" 줄 아래 헤어라인 한 줄. 누르면 그 자리에서 한 줄 입력이 열린다. 홈 카드는 그대로 | 이름 바로 아래 "이름표" 알약. 누르면 작은 시트에서 쓴다. 홈 카드 배지 줄에도 메모 배지 | 메모를 즐겨찾기 이름표로 묶는다. 별을 켜면 "이름표를 달아 둘까요?" 띠, 즐겨찾기 목록은 이름표가 제목. 홈은 "오늘의 한 곳" 줄 끝 |
| 쓰는 곳 | 상세 시트 안(인라인) | 상세 이름표 → 작은 시트, 즐겨찾기 줄 이름표 → 같은 시트 | 상세 별 → 하단 줄 위 띠, 나 탭 즐겨찾기 "이름표 정리"(모든 줄 한꺼번에) |
| 홈 카드 | 안 보임(숫자 3 + 이유 1 + 배지 2 그대로) | 배지 줄에 메모 배지(2개 상한 안, 순서 웨이팅 > 메모 > 할인) | "오늘의 한 곳 \| 국밥/탕 \| 메모" 기존 caption 줄 끝(새 줄 없음, 말줄임) |
| 즐겨찾기 줄 | 이름 + 둘째 줄 연필 + 메모(없으면 저장한 날) | 이름 + 둘째 줄 이름표 알약(없으면 "메모 남기기" 점선 알약) | 이름표가 제목, 카카오 이름이 둘째 줄 |
| 장애 대체 | 상세 제목 자리에 메모(세리프 heading) + "내 메모" + 설명. 즐겨찾기 줄 이름 자리 | 상세 제목 자리에 테두리 이름표 상자. 즐겨찾기 줄 이름 자리 | **홈 오류 카드 아래 "즐겨찾기에서 고르기"**(이름표 단 즐겨찾기 3곳 + 카카오맵 링크, PRD 12장 보조 동작). 즐겨찾기 줄은 원래 이름표가 제목이라 장애 때도 모양이 같음 |
| 장점 | 가장 조용하고 새 층이 없다. 메모가 "내 방문" 바로 아래라 "내 기록" 묶음으로 읽힌다. 홈 10초 경로, 카드 정보량, 홈 번들과 요청이 전혀 바뀌지 않는다. 구현이 가장 작다 | 메모가 이름 바로 옆이라 "이름표" 용도(D-32 (2))가 가장 분명하다. 다시 추천될 때 홈 카드에서 바로 보인다(D-32 (1)을 글자 그대로 만족). 시트라 키보드가 올라와도 입력이 가려지지 않는다 | 장애 때 가장 쓸모 있다(홈에서 바로 고를 곳이 남음). 즐겨찾기 목록이 사용자 말로 정리돼 장애 여부와 상관없이 같은 모양. 홈 카드 높이가 늘지 않는다 |
| 약점 | 다시 추천될 때 메모를 보려면 "상세"를 한 번 더 눌러야 한다. 상세 아래쪽이라 이름표 느낌은 약하다. 인라인 입력이 열리면 숫자 3칸이 아래로 밀린다(390에서 약 110px) | **390에서 웨이팅 배지와 메모 배지가 한 줄에 안 들어가 배지가 두 줄이 되고 큰 카드가 약 32px 커진다**(D-25 한 화면 압축과 충돌, [홈 배지](shots/2026-11-02/memo-b__390__light__home.png)). 할인 배지가 밀린다. 쓰려면 시트를 한 층 더 연다 | 즐겨찾기하지 않은 식당에는 쓸 수 없다(D-32 (1) "상세 시트에서 그 식당에 대한 메모"보다 좁음). **390 홈 머리 줄에서 메모가 4~5자만 보인다**("깍두기가 ..."). 별을 켤 때마다 띠가 떠서 즐겨찾기 한 탭이 두 단계처럼 느껴진다. 이름표 정리 모드는 입력 칸 5개 이상(3개 이하 원칙과 긴장, 편집 목록이라 허용 범위) |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | ○ / ○ / ○ / ○ / ○ | △ / ○ / ○ / ○ / △ | ○ / △ / ○ / △ / ○ |
| 사용한 동적 컴포넌트 | 줄이 입력으로 펼침 grid-rows base 260, 결과 줄 4px 페이드 slow | Base UI Drawer 열림 slow 300 `enter` / 닫힘 fast `exit`(데스크톱 가운데 대화상자), 결과 줄 페이드 | 띠 펼침 grid-rows + 투명도 slow `enter`, 장애 목록 페이드 slow, 결과 줄 페이드 |
| 효과가 결정을 돕는가 | 펼침이 "여기서 바로 쓴다"를 알린다 | 시트가 "잠깐 다른 일"을 분리한다(결정에는 중립) | 띠가 별을 켠 직후에만 떠서 "지금 이름표를 달 때"를 알린다 |
| 번들 증가량 (gzip, 추정) | 새 의존성 0. 상세 청크 약 +1~1.5 KB, 홈 0 | 0. 상세 청크 약 +2 KB, 홈 약 +0.3 KB + 홈 메모 조회 | 0. 상세 청크 약 +1.5 KB, 홈 약 +0.2 KB + 홈 메모 조회 |
| 접근성 위험 | 낮음. 고치기 버튼 이름 "정담국밥 메모 고치기", 접힌 입력은 `inert`, 결과 `role="status"`, 오류 `role="alert"` + `aria-invalid` | 낮음~중간. 이름표 알약 이름에 메모 글 + "메모 고치기"가 함께 읽혀 길다. 시트 포커스 복귀는 Drawer 규칙. 배지 안 메모는 `sr-only` "내 메모" 앞머리 | 중간. 홈 머리 줄 메모가 말줄임이라 전체 글은 스크린 리더와 상세에서만 온전함(`title` 필요). 띠가 하단 고정 줄 위에 생겨 키보드 순서가 별 → 띠(위)로 거꾸로 감(구현 때 포커스 이동 필요) |
| Claude 추천과 이유 | **추천 (조합).** 홈 10초 경로와 카드 규칙(숫자 3 + 이유 1 + 배지 2, D-25 압축)을 그대로 두면서 D-32의 두 용도를 모두 채운다(상세에서 쓰고 보기, 즐겨찾기 이름표, 장애 대체). 조합: **A + C의 장애 홈 "즐겨찾기에서 고르기"**(메모 있는 즐겨찾기 최대 3곳, PRD 12장 보조 동작 그대로) | 차순위 아님. 홈 카드 배지 두 줄이 D-25 압축을 깨고 할인 배지를 밀어낸다. 상세의 "이름표 알약" 배치만 A의 대안 자리로 남겨 둘 수 있다(안건 7) | 차순위. 장애 대응은 가장 좋지만 메모를 즐겨찾기에 묶어 D-32보다 좁아지고 홈 머리 줄 메모가 거의 안 읽힌다. 장애 홈 목록만 A에 가져온다 |

**Claude 추천**: **A 상세 안 한 줄 + C 장애 홈 "즐겨찾기에서 고르기".** 홈 카드에는 메모를 넣지 않는 것이 기본안입니다(안건 6). 다시 추천된 식당은 "상세"를 누르면 이름 바로 아래(이유, 내 방문 줄 다음)에서 메모를 봅니다.

## 5. 함께 정할 안건

| # | 안건 | 선택지 | Claude 기본안 |
| --- | --- | --- | --- |
| 1 | 시안 선택 | A / B / C / 조합 | **A + C 장애 홈 목록** |
| 2 | 글자 수 상한 | 20자 / **40자** / 60자 | **40자.** 즐겨찾기 둘째 줄 390에서 한 줄 말줄임 안, 장애 때 상세 제목 두 줄 안. 이름표로 쓰기에 충분하고 후기 대신 쓰는 긴 글은 막음. DB `char_length(body) <= 40`(코드 포인트, TS `[...s].length`와 같음) |
| 3 | 금칙어 적용 | 적용(DB 트리거 + zod) / 링크와 연락처만 / 적용 안 함 | **적용.** 나만 보는 글이라 욕설 자체의 피해는 작지만, `contains_banned_content`의 **연락처와 링크 검사**가 카카오 장소 값(전화번호, 장소 주소 링크)을 메모로 옮겨 담는 길을 함께 막는다. 같은 함수를 그대로 써서 판정 차이도 없음. 베타 의견(T9.4)은 운영자만 읽어 제외했던 것과 이유가 다름 |
| 4 | 즐겨찾기와의 관계 | **독립**(즐겨찾기 안 한 식당에도 씀) / 묶음(즐겨찾기 한 곳만, C) | **독립.** D-32 (1)이 "상세 시트에서 그 식당에 대한 메모"라 범위가 넓고, 다시 안 갈 곳에도 "왜 안 가는지" 메모를 남길 수 있음. 즐겨찾기를 해제해도(지금 구현은 행 삭제) 메모는 남음. 즐겨찾기 목록은 메모를 함께 보여 줄 뿐 |
| 5 | 추천 점수에 쓰는지 | **쓰지 않음** / 메모 있는 곳 가산 | **쓰지 않음.** 메모는 표시 전용이고 `src/lib/reco`에 넘기지 않음. 추천 다양성과 반복 패널티 규칙을 흔들지 않고, 메모 유무가 추천 순서를 바꾸면 "왜 이 집인지" 한 줄로 설명할 수 없음 |
| 6 | 홈 카드에 보일지 | **보이지 않음**(A) / 배지 한 자리(B) / 머리 줄 끝(C) | **보이지 않음.** D-25 한 화면 압축과 배지 2개 상한을 지키고 홈 요청을 늘리지 않음. 상세에서 바로 보이므로 D-32 (1)의 "다시 추천될 때(홈 카드나 상세)" 중 상세 쪽으로 만족 |
| 7 | A 메모 줄 위치 | **내 방문 줄 아래**(시안) / 이름 바로 아래(B 알약 자리) | **내 방문 줄 아래.** 이유 한 줄이 이름 다음 자리를 지키고(설명 가능한 추천), 메모와 내 방문이 "내 기록"으로 함께 읽힘 |
| 8 | 하루 쓰기 한도 | **30회**(저장과 고침 합산) / 한도 없음, 총 300곳만 | **30회 + 1인 300곳.** 비공개라 남용 피해는 작지만 쓰기 요청 폭주를 막는 기존 버킷 방식(`private.daily_usage`)과 같게. 지우기는 한도에 세지 않음 |
| 9 | 탈퇴와 플래그 끄기 | 탈퇴 cascade(필수) + 플래그 끄면 화면만 숨김 / 플래그 끄면 바로 일괄 삭제 | **탈퇴 cascade + 끄면 숨김, 지우기는 따로 결정.** 카카오가 문제 삼으면 (1) `userPlaceMemo` false 배포로 읽기, 쓰기 화면과 서버 액션을 막고 (2) 사용자 승인과 백업 뒤 새 마이그레이션으로 전부 지운다(파괴적 변경이라 미리 자동화하지 않음, CLAUDE.md 7.1) |
| 10 | 분석 이벤트 | 없음 / 새 이벤트(`place_memo_saved`, 글 없이) | **없음.** PRD 10.2에 없는 이벤트라 추가하려면 PRD부터 고쳐야 함. 쓰임새 확인이 필요하면 베타 뒤 별도 결정 |

## 6. 설계안 (초안, 마이그레이션 파일은 선택 뒤에 만듦)

### 6.1 스키마: 별도 테이블 `place_memos` (추천)

```sql
-- 20261103xxxxxx_t10_15_place_memos.sql (가칭, 사용자 선택과 승인 뒤 작성)
create table public.place_memos (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  -- 사용자가 빈 입력란에 직접 쓴 글만(D-32). 카카오 장소명 미리 채우기 없음
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, place_id),
  constraint place_memos_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint place_memos_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  -- 1~40자(코드 포인트), 앞뒤 공백 없음, 줄바꿈과 탭 없음(서버 zod normalizeMemo와 같은 규칙)
  constraint place_memos_body_length check (char_length(body) between 1 and 40),
  constraint place_memos_body_trimmed check (body = btrim(body) and body !~ '[\r\n\t]')
);

comment on table public.place_memos is
  '식당 메모(T10.15, D-32). 본인만 읽고 쓴다. 사용자가 직접 쓴 40자 이내 글만, 카카오 값은 place_id, place_url만. 추천 점수에 쓰지 않는다. 탈퇴 시 cascade';
```

열 추가(`favorites.memo`)가 아니라 별도 테이블을 권하는 이유:

| 기준 | `place_memos` 별도 테이블 | `favorites.memo` 열 추가 |
| --- | --- | --- |
| 안건 4 독립 | 즐겨찾기 안 한 곳, 다시 안 갈 곳에도 씀 | 즐겨찾기한 곳만(C 전용) |
| 즐겨찾기 해제 | 메모 남음 | 지금 해제 = 행 삭제라 메모도 사라짐(해제 방식을 update로 바꾸면 기존 HIS-02 동작과 RLS를 함께 고쳐야 함) |
| 이미 푸시된 정의 | 손대지 않음 | `favorites`에 update 정책과 열 권한이 처음 생김. 300곳 트리거, `setFavoriteAction`과 RLS 테스트 범위가 넓어짐 |
| 플래그로 끄고 지우기 | 테이블 하나만 비우면 끝 | 열만 비우는 update가 필요하고 즐겨찾기 행과 섞임 |
| 처리방침, 탈퇴 점검 | 항목 하나로 분리, `account_residue`가 자동으로 셈 | 즐겨찾기 항목 설명을 바꿔야 함 |
| 읽기 비용 | 즐겨찾기 목록과 메모를 두 번 읽거나 조인(본인 행만이라 작음) | 한 번에 읽음 |

### 6.2 RLS와 권한 (본인만, update 허용)

```sql
alter table public.place_memos enable row level security;

create policy "place_memos: 본인 읽기"  on public.place_memos for select to authenticated using ((select auth.uid()) = user_id);
create policy "place_memos: 본인 추가"  on public.place_memos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "place_memos: 본인 고치기" on public.place_memos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "place_memos: 본인 지우기" on public.place_memos for delete to authenticated using ((select auth.uid()) = user_id);
-- anon 정책 없음. 관리자 읽기 함수도 만들지 않는다(운영자도 보지 않는 글)

revoke all on table public.place_memos from public, anon, authenticated;
grant select, delete on table public.place_memos to authenticated;
grant insert (user_id, place_id, place_url, body) on table public.place_memos to authenticated;
grant update (body) on table public.place_memos to authenticated;   -- place_id, user_id, 시각은 못 바꿈
grant all on table public.place_memos to service_role;
```

- 쓰기 경로는 서버 액션 `setPlaceMemoAction({ placeId, placeUrl, body })`: zod(`normalizeMemo` → 1~40자, `withoutBannedContent`)로 재검증하고 `userPlaceMemo` 플래그가 꺼져 있으면 `disabled`. 빈 글이면 delete. upsert는 `on conflict (user_id, place_id) do update set body = excluded.body`.
- 읽기: 상세는 `place_id` 한 건(TanStack Query 키 `placeUserStateKey`와 같은 묶음), 나 탭 장소 패널은 `useMyPlaces`에 메모 목록을 함께 받아 붙임(이름 해석 T5.12a 결과와 합쳐 이름 대체). 홈은 읽지 않음(안건 6 기본안). 장애 홈 "즐겨찾기에서 고르기"는 카카오 오류가 난 뒤에만 즐겨찾기 + 메모를 읽음.
- 오프라인: 받은 메모는 세션 메모리에서만 보임. localStorage, 서비스 워커 캐시 없음(우리 데이터지만 `*.supabase.co` 응답은 서비스 워커 제외 규칙 그대로).

### 6.3 트리거: 금칙어 안전망, 하루 한도, 개수 상한, 정지 차단, 시각

```sql
-- 금칙어 DB 안전망 (T10.3b 함수 그대로 재사용)
create trigger place_memos_banned_text_guard
  before insert or update of body on public.place_memos
  for each row execute function private.reject_banned_text('body');

-- 하루 한도 버킷 'place_memos'(KST 하루 30회, 저장과 고침 합산, 지우기는 세지 않음)
alter table private.daily_usage drop constraint daily_usage_bucket_values;
alter table private.daily_usage add constraint daily_usage_bucket_values
  check (bucket in ('reviews', 'reports', 'deals', 'polls', 'beta_feedback', 'place_memos'));
-- private.daily_quota_max에 when 'place_memos' then 30 추가(함수 전체를 create or replace, src/copy 한도 문구와 limits.test.ts 함께)

create or replace function private.place_memos_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare existing int;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then return new; end if;   -- 같은 글 다시 저장은 세지 않음
  else
    perform pg_advisory_xact_lock(hashtextextended('place_memos:' || new.user_id::text, 0));
    select count(*) into existing from public.place_memos where user_id = new.user_id;
    if existing >= 300 then
      raise exception 'place_memos_limit_exceeded' using errcode = 'check_violation',
        hint = '메모는 300곳까지 남길 수 있습니다';
    end if;
  end if;
  perform private.consume_daily_quota(new.user_id, 'place_memos');
  new.updated_at := now();
  return new;
end; $$;

create trigger place_memos_before_write
  before insert or update of body on public.place_memos
  for each row execute function private.place_memos_before_write();

-- 정지 사용자 쓰기 차단(T8.5 공통 트리거)
create trigger block_suspended_writer
  before insert or update on public.place_memos
  for each row execute function private.block_suspended_writer();

revoke all on function private.place_memos_before_write() from public, anon, authenticated;
```

- 트리거 순서(이름 알파벳 순): `block_suspended_writer` → `place_memos_banned_text_guard` → `place_memos_before_write`. 거절되면 한도 사용도 트랜잭션과 함께 되돌아갑니다(beta_feedback과 같은 관례).
- 오류 매핑: `banned_content` → "banned"(기존 `mapPgError`), `place_memos_daily_limit_exceeded` → 한도 문구, `place_memos_limit_exceeded` → "메모는 300곳까지 남길 수 있습니다. 쓰지 않는 메모를 지워 주세요."
- `my_daily_limits()`에 버킷을 더할지는 구현 때 결정(메모 칸은 열 때 남은 수를 미리 보이지 않음, 한도 응답만).

### 6.4 탈퇴와 플래그 끄기

- 탈퇴: `user_id → auth.users on delete cascade`로 바로 삭제(PRD 11.4). `public.account_residue`(T6.27)가 auth.users 외래 키를 자동으로 찾으므로 함수 변경 없이 점검 대상에 들어갑니다. 탈퇴 테스트(`t6-delete-account.rls.test.ts` 관례)에 남은 행 0을 하나 더합니다.
- 플래그: `userPlaceMemo`를 owner T10.15로 옮기고 구현 뒤 `const true`. false면 (1) 상세 메모 줄, 즐겨찾기 메모, 장애 대체에서 메모를 쓰지 않고, (2) `setPlaceMemoAction`이 `disabled`를 돌려줌. 서버 판정을 props로 내려 줌(`pollEntry`와 같은 방식). 데이터 삭제는 안건 9대로 사용자 승인 뒤 새 마이그레이션.

### 6.5 RLS 테스트 (`src/lib/supabase/rls/t10-place-memos.rls.test.ts`, 3역할 + 정지)

- 본인: insert, select, update(body), delete 성공. update로 `place_id`, `user_id`, `updated_at` 바꾸기는 42501. 41자, 빈 글, 앞뒤 공백, 줄바꿈은 23514. 금칙어와 전화번호, 링크는 23514 `banned_content`. 31번째 쓰기는 일일 한도 거절. 같은 글 다시 저장은 한도에 세지 않음.
- 타인: 본인 메모 select 0행, update, delete 0행, 타인 `user_id`로 insert 거절.
- 비로그인(publishable 키만): select 0행 또는 42501, insert 거절.
- 정지된 본인: insert, update 거절. 탈퇴 뒤 `account_residue`의 `place_memos` 0.

### 6.6 개인정보 처리방침 수집 항목 문장 초안 (`src/copy/legal.ts`, 고칠 때 시행일 공지 규칙 확인)

- 2장 `after` 첫 문단 목록에 추가: "…즐겨찾기, 다시 안 갈 곳, **식당 메모(이용자가 직접 쓴 40자 이내의 글, 본인만 봅니다)**, 식후 평가와 후기…"
- 같은 문단 끝 문장 고침: "식당은 카카오 장소 번호와 장소 링크로만 기록하고 식당 이름, 주소, 좌표는 저장하지 않습니다. **식당 메모는 이용자가 빈 칸에 직접 쓴 글만 저장하고, 카카오 장소 이름을 자동으로 채우지 않습니다.**"
- 1장 처리 목적은 "사무실 핀, 예산, 걷는 거리, 못 먹는 음식을 반영한 식당 추천"과 별도로 한 줄: "이용자가 남긴 식당 메모를 본인 화면에 보여 주기(추천 순서에는 쓰지 않습니다)".
- 3장 보유 기간 첫 줄 "계정, 설정, 사무실 핀, 기록, 후기, 제보"에 "식당 메모"를 더함(탈퇴할 때까지, 지우면 바로 삭제).
- 수집 항목이 바뀌므로 6장 마지막 규칙대로 "수집 항목이 바뀌는 중요한 변경"에 해당하는지 확인(30일 전 공지 대상인지)이 필요합니다. `[확인 필요]`

## 7. 품질 메모

- 시안의 상세 화면은 캡처를 위해 열린 시트를 정지 화면으로 그렸습니다(실제는 `PlaceDetailSheet`, Base UI Drawer). 접힘 행 내용과 후기는 생략했습니다.
- 한글 입력 중 Enter(조합 확정)는 저장으로 받지 않게 `isComposing`을 봅니다. iOS Safari, 카카오톡 인앱 키보드의 Enter와 시트 위 키보드 겹침은 `[실기기]` 확인 항목이며 Claude가 대신 확인하지 못했습니다.
- 붙여 넣기는 브라우저 기본 동작이라 막지 않습니다(D-32는 "붙여 넣기 버튼" 금지). 사용자가 카카오맵에서 이름을 복사해 직접 붙여 넣는 것은 사용자 입력으로 봅니다(DevTalk 2026-07-28 답변 범위).
- 선택 뒤 할 일: 마이그레이션 초안을 보여 드리고 승인 → `db:backup` → `db:push`, `db:types`, 서버 액션과 zod, 상세 메모 줄, 즐겨찾기 메모, 이름 대체(`src/features/me/history`의 `savedFallbackName` 앞에 메모), 장애 홈 목록, `userPlaceMemo` 해제, 처리방침, RLS 테스트. 미선택 시안 코드(`src/features/design-lab/memo/<b|c>`, `src/app/design-lab/memo/<b|c>`)는 삭제하고 캡처와 이 문서는 남깁니다. design-decisions에 기록.
