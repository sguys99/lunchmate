# 9단계 베타 환영 페이지와 베타 의견 비교 자료 (T9.3, T9.4 → ⛔ 선택)

> ⛔ T9.3(`/beta` 환영 페이지)과 T9.4(나 탭 베타 의견 보내기) 선택 게이트에서 보여 줄 자료입니다(D-22). 화면마다 시안 하나(또는 조합)를 고르고 5절 안건을 함께 정합니다. 고른 뒤 구현(새 테이블 `beta_feedback`은 6절 초안을 마이그레이션으로 옮겨 승인 뒤 `db:push`)으로 넘어갑니다.
> 캡처는 2026-11-02 공용 dev 서버(3102)에서 찍었습니다. 번들 수치는 `pnpm build` 없이 의존성으로 추정한 값입니다(2절).
> 시안 라우트와 쿼리(머리 주석이 정본):
> - `/design-lab/beta/<a|b|c>` (`src/features/design-lab/beta/params.ts`): `?state=ready|loading|empty|error|offline`, `?device=kakao-ios|kakao-android|ios|android|desktop|app`(기본 `kakao-ios`, 초대 링크를 처음 여는 곳), `?card=1|2|3`(B), `?open=install|feedback|none`(C), `?others=on`(A).
> - `/design-lab/beta-feedback/<a|b|c>` (`src/features/design-lab/beta-feedback/params.ts`): `?state=...`, `?fail=send|limit`(error일 때), `?view=entry|sheet|page`, `?flow=compose|sent`, `?step=1|2`(B), `?cat=bug|inconvenient|good|idea`, `?from=<경로>`(지금 보던 화면 목업, 기본 `/poll/k7Qm2xPa9w?ref=kakao`).
> 관련 규칙: CLAUDE.md 1장(10초, 3개 이하), 6장(올리브 버튼 하나, 하단 1/3, 44px), 7장(좌표와 카카오 값 비전송, 비공개 텍스트), 9장(문구), 13장(인앱 브라우저, redirect 내부 경로), PRD AUTH-04, APP-01.

## 1. 캡처

폴더: `docs/design/shots/2026-11-02/`. 파일 이름은 `design-lab-<beta|beta-feedback>-<a|b|c>__<390|1280>__<light|dark>[__<상태 또는 흐름>].png`.

| 묶음 | 파일 이름 끝 | 찍는 방법 |
| --- | --- | --- |
| 기본 + 4상태, 390과 1280 x 라이트, 다크 (120장) | 접미사 없음, `__loading`, `__empty`, `__error`, `__offline` | `pnpm shots /design-lab/beta/a /design-lab/beta/b /design-lab/beta/c /design-lab/beta-feedback/a /design-lab/beta-feedback/b /design-lab/beta-feedback/c --base-url http://localhost:3102 --states --full-page false` (아래 고정 버튼과 시트가 있어 뷰포트 영역) |
| `/beta` 기기와 흐름 (390 라이트) | A `__ios`, `__android`, `__app`, `__others` / B `__card2`, `__card3`, `__ios-card2`, `__android-card2` / C `__ios`, `__feedback` | 쿼리 캡처 스크립트(같은 뷰포트, 축소 모션, Next 개발 표시 숨김) |
| `/beta` 데스크톱 기기 (1280 라이트) | A, B, C `__desktop` | 같은 스크립트 `?device=desktop` |
| 의견 흐름 (390 라이트) | A `__entry`, `__sent`, `__limit` / B `__step1`, `__entry`, `__good`, `__sent` / C `__entry`, `__sent` | 같은 스크립트 |
| 1280, 다크 흐름 | `beta-feedback-b__1280__light__step1`, `beta-feedback-a__1280__light__sent`, `beta-b__390__dark__card2`, `beta-feedback-b__390__dark__step1`, `beta-feedback-a__390__dark__sent` | 같은 스크립트 |
| 가로 넘침 검사 | (파일 없음) | 360, 390, 1280에서 여섯 안 모두 넘침 0(스크립트 검사), 콘솔 오류 0 |

기본 상태의 뜻: `/beta`는 카카오톡 아이폰 인앱에서 처음 연 화면, `__empty`는 기기를 알아보지 못한 화면(기기 칩 3개), `__error`는 외부 브라우저 열기 실패(메뉴 그림 + 링크 복사), `__offline`은 설치 안내는 보이고 로그인 버튼이 꺼진 화면, `__loading`은 기기 확인 전 스켈레톤입니다. 베타 의견은 `__empty`가 아무것도 쓰지 않은 칸(C는 보낸 의견 0건), `__error`가 보내기 실패와 다시 보내기, `__loading`이 칸(C는 보낸 의견 목록) 스켈레톤입니다.

## 2. 번들 요약 (gzip, 추정)

- **새 의존성 없음.** 여섯 안 모두 기존 Button 클래스, Chip, Checkbox, Base UI Drawer, 상태 컴포넌트(LoadingRegion, SkeletonLine, ListSkeleton, EmptyState), Lucide 아이콘 몇 개, CSS 전환과 `tw-animate-css`만 씁니다. Motion(`m`)은 쓰지 않습니다.
- **`/beta`는 홈(`/today`)과 랜딩(`/`) 첫 로드 밖**이라 200 KB 예산(T8.11)과 무관합니다. 카카오톡 메뉴 그림(`MenuDiagram`, `auth.css`)은 로그인 화면 것을 그대로 가져와 새 코드가 거의 없습니다. 세 안 차이는 화면 코드 몫(1~3 KB)입니다. B는 넘김 코드와 카드 그림(카테고리 일러스트 3개)이 조금 더 크고, C는 접는 묶음 코드가 있습니다.
- **베타 의견 A, B는 시트를 누른 뒤에 동적 import**하는 구조로 구현합니다(후기 시트, 제보 시트와 같은 Drawer 덩어리 재사용). 나 탭 첫 로드에 들어가는 것은 진입 줄(또는 머리 버튼) 몇 줄과 `betaFeedback` 플래그 판정뿐입니다. C는 별도 경로(`/me/beta-feedback`)라 나 탭 첫 로드에 아무것도 더하지 않습니다.
- 실제 값은 구현 뒤 `pnpm build`의 bundle-report로 재서 `bundle-log.md`에 남깁니다.

## 3. 공통으로 지킨 것

### `/beta`
- **첫 화면에 네 가지**: 서비스 한 줄(`siteCopy.tagline`), 기기별 홈 화면 추가 방법, 베타 의견 보내는 곳(나 탭 > 베타 의견 보내기), 로그인 주 버튼.
- **기기 판정**: 실제 구현은 서버가 UA로 `detectInApp`, `detectOs`(`src/lib/inapp.ts`)를 판정해 첫 HTML에 맞는 안내를 넣고, 브라우저가 `display-mode: standalone`이면 "홈 화면 앱으로 열었습니다"로 바꿉니다. UA 원문은 저장하거나 분석으로 보내지 않습니다(T4.29와 같은 규칙).
- **카카오톡 인앱**: 메뉴 위치(iOS 오른쪽 아래, Android 오른쪽 위)와 항목 이름은 `inAppGuide`와 `authCopy.inapp`을 그대로 씁니다. 외부 브라우저 열기는 `externalOpenUrl`(kakaotalk 스킴) + 1.5초 뒤에도 화면이 보이면 실패로 보고 메뉴 그림과 링크 복사로 바꿉니다(로그인 화면 T4.10과 같은 흐름). 실기기 동작은 `[실기기]` 항목입니다.
- **설치**: iOS는 웹에서 설치 창을 띄울 수 없어 공유 버튼 그림(`ShareDiagram`, 새 도형 그림, MenuDiagram과 같은 문법) + 설명, Android는 보관된 `beforeinstallprompt`(T8.2 `install-script`)가 있으면 "설치" 보조 버튼, 없으면 Chrome 메뉴 안내, 데스크톱은 "따로 설치하지 않아도 됩니다".
- **로그인 주소**: `/login?next=%2Ftoday`. 내부 경로만이고 `/login`이 `next`를 다시 검사합니다(CLAUDE.md 13장). 시안에서는 눌러도 이동하지 않습니다.
- **올리브 버튼은 화면에 하나**, 화면 아래 1/3에 고정. 오프라인이면 위 안내 한 줄 + 로그인 `aria-disabled`(설치 안내는 그대로 볼 수 있음).

### 베타 의견
- **입력**: 종류 칩 4개(버그, 불편해요, 좋아요, 제안, 선택), 내용(필수, 500자, 글자 수 `tabular-nums`, 넘으면 빨간 수와 한 줄), "지금 보던 화면 함께 보내기"(체크하면 보내는 값을 그대로 보임: `/poll/[code], 앱 0.1.0` + "위치, 초대 코드, 식당 정보는 보내지 않습니다.").
- **경로 지우기**(`src/features/design-lab/beta-feedback/route-path.ts`, 테스트 5건): 쿼리와 해시는 통째로 버리고, 허용 목록에 맞춰 동적 조각을 자리 이름으로 바꿉니다(`/poll/abc123xyz0` → `/poll/[code]`, `/today/place/1840235701` → `/today/[detail]`). 목록에 없는 경로는 `/[other]`. 좌표, 초대 코드, 장소 번호가 결과에 남지 않음을 테스트로 막았습니다.
- **상태**: 보내기 실패는 버튼 위 한 줄 "의견을 보내지 못했습니다. 쓴 내용은 그대로 있으니 다시 보내 주세요." + 버튼 "다시 보내기", 한도는 "오늘은 의견을 10번 보냈습니다. 내일 다시 보낼 수 있습니다." + 버튼 꺼짐, 오프라인은 "인터넷에 연결되어 있지 않습니다. 쓴 내용은 이 화면에 남아 있고, 연결되면 보낼 수 있습니다." + 버튼 `aria-disabled`. 쓴 글은 어느 경우에도 지우지 않습니다.
- **보낸 뒤**: 해요체 감사 "고마워요, 잘 받았어요" + 습니다체 설명 + 닫기(보조) + 하나 더 보내기(글자). 축하 효과 없이 4px 위로 페이드(slow).
- **시트**: 모바일 아래 시트(손잡이, 최대 92dvh, 바닥 고정 보내기 줄), 데스크톱 1024 이상 가운데 대화상자(최대 448). 후기 시트(T6.10)와 같은 클래스입니다.
- **문구**: `src/copy/design-lab-beta.ts`, `src/copy/design-lab-beta-feedback.ts`(디자인 랩 전용, 홈 첫 로드 밖). 금지 문자 0, 상태와 설명은 습니다체, 질문과 감사는 해요체. 목업 닉네임은 `test_` 접두.

## 4. 비교표

### 4.1 `/beta` 환영 페이지 (T9.3)

| 항목 | A 기기별 단계 목록 | B 세 장 넘기기 | C 초대장 |
| --- | --- | --- | --- |
| 대표 캡처 | [390 카카오톡](shots/2026-11-02/design-lab-beta-a__390__light.png), [390 아이폰](shots/2026-11-02/design-lab-beta-a__390__light__ios.png), [안드로이드](shots/2026-11-02/design-lab-beta-a__390__light__android.png), [다른 기기](shots/2026-11-02/design-lab-beta-a__390__light__others.png), [열기 실패](shots/2026-11-02/design-lab-beta-a__390__light__error.png), [1280 데스크톱](shots/2026-11-02/design-lab-beta-a__1280__light__desktop.png), [390 다크](shots/2026-11-02/design-lab-beta-a__390__dark.png) | [390 1장](shots/2026-11-02/design-lab-beta-b__390__light.png), [2장 카카오톡](shots/2026-11-02/design-lab-beta-b__390__light__card2.png), [2장 아이폰](shots/2026-11-02/design-lab-beta-b__390__light__ios-card2.png), [3장](shots/2026-11-02/design-lab-beta-b__390__light__card3.png), [1280 데스크톱](shots/2026-11-02/design-lab-beta-b__1280__light__desktop.png), [2장 다크](shots/2026-11-02/design-lab-beta-b__390__dark__card2.png) | [390 카카오톡](shots/2026-11-02/design-lab-beta-c__390__light.png), [390 아이폰](shots/2026-11-02/design-lab-beta-c__390__light__ios.png), [의견 묶음](shots/2026-11-02/design-lab-beta-c__390__light__feedback.png), [1280 데스크톱](shots/2026-11-02/design-lab-beta-c__1280__light__desktop.png), [390 다크](shots/2026-11-02/design-lab-beta-c__390__dark.png) |
| 의도 (한 줄) | 기기를 알아보고 "지금 할 일"만 펼친 번호 목록. 카카오톡이면 1 외부 브라우저 → 2 홈 화면 → 3 로그인 | 한 장에 한 가지(런치메이트는 / 홈 화면에 두기 / 의견 보내기)를 크게, 이전과 다음 버튼으로 넘긴다 | 세리프 큰 제목과 짧은 편지로 "초대받았다"는 느낌을 주고, 방법은 접는 묶음에 둔다 |
| 카카오톡에서 주 버튼 | **외부 브라우저로 열기**(올리브) + 글자 버튼 "카카오톡에서 바로 시작" | 다음(올리브), 2장 안에 외부 브라우저로 열기(보조) | **로그인하고 시작**(올리브), 편지 위 안내 줄에 외부 브라우저로 열기(보조) |
| 데스크톱 1280 | 좌 단계 칸 + 우 카드 면 "휴대폰에서도 열어 두세요" + 나 탭 그림 | 넘기지 않고 세 장을 한 줄에, 아래 로그인 하나 | 가운데 편지 한 장(최대 36rem, 1px 선) |
| 장점 | 가장 빠르다(첫 화면에 지금 할 일과 버튼이 함께). 카카오톡에서 홈 화면 설치까지 이어질 확률이 가장 높다(베타 재방문에 중요). "다른 기기 보기"로 동료에게 설명하기 쉽다. 로그인 화면의 인앱 안내와 문법이 같다 | 한 장씩이라 읽을 양이 적고 그림이 크다. 서비스 소개(1장)가 가장 분명하다. 데스크톱에서 세 장이 한눈에 보인다 | 가장 브랜드답고 따뜻하다(초대장 말투, 마루 부리). 처음 보는 동료에게 "왜 써 달라는지"가 가장 잘 전해진다. 로그인 버튼이 늘 같은 자리라 결정이 단순하다 |
| 약점 | 설명 글이 가장 많아 화면이 길다(390에서 3단계 줄이 첫 화면 아래로 일부 내려감). 서비스 소개가 한 줄뿐이다 | 로그인까지 "다음"을 두 번 눌러야 한다(10초 원칙과 긴장). 넘김 화면은 스크린 리더와 키보드 비용이 크다. 카카오톡에서 외부 브라우저로 나가는 버튼이 2장 안에 숨어 설치 전환이 약하다 | 편지가 첫 화면을 차지해 설치 방법이 아래로 밀린다(390에서 묶음 머리만 보임). 카카오톡 안에서 바로 로그인하는 사람이 많아져 홈 화면 설치율이 낮을 수 있다 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | ○ / ○ / ○ / ○ / △ | △ / ○ / ○ / △ / ○ | ○ / ○ / ○ / ○ / ○ |
| 사용한 동적 컴포넌트 | 단계 줄 70ms 간격 8px 떠오름(la-step, CSS), 다른 기기 접기 grid-rows base, 메뉴 버튼 링 두 번(la-ring), 단계 표시 색 base | scroll-snap 넘김(smooth, 축소 모드 즉시), 위치 막대 폭 base, 메뉴 링 두 번 | 편지 한 번 떠오름(la-step), 묶음 접기 grid-rows base + 화살표 회전 base, 메뉴 링 두 번 |
| 효과가 결정을 돕는가 | 지금 단계(올리브 테두리)와 마친 단계(체크)가 진행을 알린다 | 위치 막대가 "몇 장 남았나"를 알린다 | 떠오름은 분위기, 접기는 길이를 줄인다(결정에는 중립) |
| 번들 증가량 (gzip, 추정) | 새 의존성 0 | 0 | 0 |
| 접근성 위험 | 낮음. 단계는 `ol` + `aria-current="step"` + "3단계 중 1단계" 읽기 이름. 다른 기기 버튼 `aria-expanded` | 중간. 넘김은 `aria-roledescription="carousel"`, 이전/다음 버튼 필수(있음), 위치 `aria-live`. 화면 밖 카드도 읽히므로 구현 때 `inert` 처리 필요. 스크롤 넘김과 버튼 상태 동기화 과제 | 낮음. 묶음은 `h2 > button[aria-expanded]` + `inert`. 편지 본문이 길어 확대 시 버튼까지 스크롤이 길다 |
| Claude 추천과 이유 | **추천 (조합).** 베타 초대는 카카오톡 링크라 거의 모두 인앱에서 처음 엽니다. 홈 화면 설치까지 가야 다음 점심에 다시 열 확률이 높으니, 지금 할 일 하나를 주 버튼으로 거는 A가 맞습니다. 조합: **A 단계 목록 + C의 마루 부리 큰 제목 한 줄**(편지 단락은 빼고 리드 한 줄 유지), 데스크톱은 A 2단 그대로 | 차순위 아님. 소개용으로는 좋지만 "다음" 두 번이 10초 원칙과 맞지 않습니다. 1장 그림(카드 3장 미니)만 A의 리드 아래 작은 그림으로 가져올 수 있습니다 | 차순위. 분위기는 가장 좋지만 설치 안내가 접혀 베타 목적(재방문)에 약합니다. 제목 문구 "점심 고민, 이제 10초면 됩니다"는 A의 제목 후보로 둡니다 |

### 4.2 베타 의견 보내기 (T9.4)

| 항목 | A 한 장 시트 | B 두 단계 시트 | C 전용 화면과 보낸 의견 |
| --- | --- | --- | --- |
| 대표 캡처 | [390 시트](shots/2026-11-02/design-lab-beta-feedback-a__390__light.png), [진입 줄](shots/2026-11-02/design-lab-beta-feedback-a__390__light__entry.png), [보낸 뒤](shots/2026-11-02/design-lab-beta-feedback-a__390__light__sent.png), [한도](shots/2026-11-02/design-lab-beta-feedback-a__390__light__limit.png), [실패](shots/2026-11-02/design-lab-beta-feedback-a__390__light__error.png), [오프라인 다크](shots/2026-11-02/design-lab-beta-feedback-a__390__dark__offline.png), [1280](shots/2026-11-02/design-lab-beta-feedback-a__1280__light.png) | [390 2단계](shots/2026-11-02/design-lab-beta-feedback-b__390__light.png), [1단계](shots/2026-11-02/design-lab-beta-feedback-b__390__light__step1.png), [좋아요 2단계](shots/2026-11-02/design-lab-beta-feedback-b__390__light__good.png), [진입 버튼](shots/2026-11-02/design-lab-beta-feedback-b__390__light__entry.png), [보낸 뒤](shots/2026-11-02/design-lab-beta-feedback-b__390__light__sent.png), [1280 1단계](shots/2026-11-02/design-lab-beta-feedback-b__1280__light__step1.png), [1단계 다크](shots/2026-11-02/design-lab-beta-feedback-b__390__dark__step1.png) | [390 화면](shots/2026-11-02/design-lab-beta-feedback-c__390__light.png), [진입 안내 줄](shots/2026-11-02/design-lab-beta-feedback-c__390__light__entry.png), [보낸 뒤](shots/2026-11-02/design-lab-beta-feedback-c__390__light__sent.png), [보낸 의견 0건](shots/2026-11-02/design-lab-beta-feedback-c__390__light__empty.png), [1280](shots/2026-11-02/design-lab-beta-feedback-c__1280__light.png) |
| 의도 (한 줄) | 나 탭 머리 아래 줄 하나 → 한 장 시트에 칩, 내용, 화면 첨부, 보내기 | 머리의 "의견" 버튼 → 1단계 종류 네 줄 → 2단계 종류별 질문과 내용(제보 시트와 같은 한 질문씩 문법) | 나 탭 안내 줄 → 전용 화면 `/me/beta-feedback`에 쓰는 칸 + 내가 보낸 의견 목록(읽음 표시) |
| 나 탭 진입 자리 | 머리와 탭 사이 헤어라인 줄(아이콘 + "베타 의견 보내기" + 베타 배지 + 한 줄 설명 + 화살표, 높이 56 이상). 가장 눈에 띈다 | 머리 오른쪽, 설정 톱니 왼쪽 글자 버튼 "의견"(44). 탭 내용을 밀지 않는다 | 머리 아래 안내 한 줄 + "의견 보내기" 글자 링크 |
| 장점 | 가장 빠르다(열면 바로 쓰고 보내기, 칩은 선택). 화면에 필요한 것이 한 번에 보인다. 진입 줄이 눈에 띄어 베타 기간 응답률에 유리하다 | 종류별 질문과 예시 문구가 좋은 버그 리포트를 이끈다("어떤 화면에서 무엇을 눌렀을 때"). 좋아요, 제안은 화면 첨부 기본 끔이라 불필요한 정보를 덜 보낸다. 진입 버튼이 조용하다 | 보낸 것을 다시 보고 "읽음"으로 반응을 확인할 수 있어 참여감이 크다. 화면이 넓어 길게 쓰기 편하다. 데스크톱에서도 자연스럽다 |
| 약점 | 칩이 선택이라 종류 없는 의견이 많아질 수 있다. 시트 높이가 커서 키보드가 열리면 화면 첨부 줄이 가려진다(스크롤) | 한 번 더 누른다(종류 고르기). "의견" 글자 버튼은 처음 보는 사람이 놓칠 수 있다 | 진입이 한 번 더 이동이라 가장 느리다. "읽음" 상태를 위해 관리자 쪽 작업(읽음 처리)이 늘고, 보낸 글을 다시 보여 주는 읽기 정책이 하나 더 생긴다 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | ○ / △ (칩 4개, 선택 입력이라 허용 범위) / ○ / ○ / ○ | △ / ○ (1단계 줄 4개는 목록) / ○ / △ / ○ | △ / △ / ○ / △ / △ |
| 사용한 동적 컴포넌트 | 시트 열림 slow enter / 닫힘 fast exit(Drawer CSS), 보낸 뒤 4px 위로 페이드(slow), 칩 눌림 | 시트 + 단계 막대 scaleX base, 단계 바뀜 8px 옆 페이드(base), 줄 누름 뒤 160ms 대기 | 새 의견 줄이 위에서 4px 페이드(base), 칩 눌림. 시트 없음 |
| 효과가 결정을 돕는가 | 고마움 화면 전환이 "보냈다"를 확실히 알린다 | 단계 막대가 "한 단계 남음"을 알린다 | 목록에 들어오는 줄이 "보냈다"를 보여 준다 |
| 번들 증가량 (gzip, 추정) | 새 의존성 0. 시트 청크는 누른 뒤 로드(기존 Drawer 덩어리 재사용) | 0 (A와 같음, 아이콘 4개) | 0. 별도 경로 |
| 접근성 위험 | 낮음. 칩 묶음 `aria-labelledby`, 글자 수 sr-only "500자 중 62자", 오류 `role="alert"`, 오프라인 `role="status"`. 다크 모드에서 `aria-disabled` 주 버튼 면(bg-muted)이 시트 면과 대비가 낮아 보인다(기존 버튼 토큰 문제, 아래 6절 품질 메모) | 낮음~중간. 단계가 바뀔 때 초점을 새 제목으로 옮기는 처리가 구현 과제(제보 시트 패턴). 머리 버튼 이름 "베타 의견 보내기"가 보이는 글자 "의견"을 포함(WCAG 2.5.3 충족) | 낮음. 목록 상태 배지에 `aria-label`, 빈 상태 공용 컴포넌트 |
| Claude 추천과 이유 | **추천 (조합).** 베타 의견은 "생각났을 때 바로"가 핵심이라 한 장 시트가 가장 맞고, 진입 줄이 눈에 띄어 응답률(T9.6 지표)에 유리합니다. 조합: **A 시트 + B의 종류별 예시 문구**(칩을 고르면 내용 칸 예시 문구가 바뀜) **+ B의 화면 첨부 기본값**(버그, 불편은 켬, 좋아요, 제안은 끔). C의 보낸 의견 목록은 베타 뒤 필요하면 추가 | 부분 채택: 종류별 예시 문구와 첨부 기본값 | 보류. 읽음 표시는 관리자 쪽 작업이 늘어 1인 운영 베타에 과합니다. 다만 보존 기간 안내 문구(6절)는 A 시트 아래에 한 줄로 가져옵니다 |

## 5. 함께 정할 안건

| # | 안건 | 선택지 | Claude 기본안 |
| --- | --- | --- | --- |
| 1 | `/beta` 화면 구조 | A / B / C / 조합 | **A 단계 목록 + C의 세리프 큰 제목**(4.1 추천) |
| 2 | 카카오톡 인앱에서 주 버튼 | (a) 외부 브라우저로 열기(A) / (b) 로그인하고 시작(C) | **(a).** 인앱에서 로그인하면 카카오톡 웹뷰에 세션이 남아 다음에 홈 화면 앱을 열어도 다시 로그인해야 하고(쿠키가 다름), 홈 화면 설치로 이어지지 않습니다. "카카오톡에서 바로 시작"은 글자 버튼으로 남겨 막지는 않습니다. 실제 비율은 T9.7(인앱 로그인 전환율)에서 봅니다 |
| 3 | `/beta` 노출과 경로 | 공개 경로 `(public)/beta` + 로그인 불필요 / 로그인 뒤에만 | **공개 경로, 로그인 불필요**, 검색 엔진 제외(`robots: noindex`), 사이트맵 제외. 초대 링크를 받은 사람만 알면 되므로 별도 초대 코드는 두지 않습니다. 플래그는 새로 두지 않고 `auth` 공개(T9.2)와 함께 엽니다(로그인 버튼이 `/login`으로 가므로). 로그인한 사람이 다시 열면 같은 화면 + 주 버튼 "오늘 추천 보기"(`/today`) |
| 4 | 이미 홈 화면 앱(standalone)으로 연 경우 | 설치 단계 "마침" 표시(시안) / 바로 `/today`로 이동 | **"마침" 표시 + 로그인 주 버튼.** 자동 이동은 안내를 다시 보고 싶은 사람을 막습니다 |
| 5 | 데스크톱 QR 코드 | 넣음(휴대폰으로 옮기기) / 넣지 않음(시안) | **넣지 않음.** QR 생성 라이브러리가 필요하고(번들), 초대는 어차피 카카오톡이라 휴대폰에서 같은 링크를 열면 됩니다 |
| 6 | 베타 의견 화면 구조 | A / B / C / 조합 | **A 시트 + B의 종류별 예시 문구와 첨부 기본값**(4.2 추천) |
| 7 | 나 탭 진입 자리 | A 머리 아래 줄 / B 머리 글자 버튼 / C 안내 줄 / 설정 화면 줄 | **A 머리 아래 줄.** 베타 기간에만 보이는 줄(`betaFeedback` 플래그)이라 눈에 띄어도 됩니다. 비로그인(auth-off) 나 탭에는 두지 않습니다 |
| 8 | 의견 종류 | 버그, 불편해요, 좋아요, 제안(시안) / 3개 / 자유 | **4개, 선택 입력**(고르지 않으면 `null`). 3개 이하 원칙은 "결정 선택지"에 대한 것이고 칩은 선택 입력이라 4개를 허용합니다(후기 태그 칩과 같은 해석). 저장값 slug: `bug`, `inconvenient`, `good`, `idea` |
| 9 | 글자 수 한도 | 300 / 500(시안) / 1000 | **500자, 1자 이상.** 서버 zod와 DB check 둘 다 |
| 10 | 화면 캡처(스크린샷) 첨부 | 넣음 / 넣지 않음 | **넣지 않음.** 화면에 카카오 장소 이름, 투표 후보, 다른 사람 닉네임, 지도 위치가 찍혀 T0.16(카카오 값 저장 금지)과 현위치 비전송 원칙을 지키기 어렵고, 저장소(Storage)와 RLS가 하나 더 생깁니다. 경로 틀 + 앱 버전으로 충분합니다 |
| 11 | 함께 보내는 정보 | 경로 틀 + 앱 버전(시안) / + `algo_version` / + 기기 종류 / + UA | **경로 틀 + 앱 버전 + `algo_version` + 기기 종류(ios, android, desktop, 인앱 여부, standalone 여부).** UA 원문, 좌표, 쿼리는 보내지 않습니다. 경로는 체크 해제 가능, 앱 버전과 기기 종류는 늘 보냅니다(시트에 그대로 보임) |
| 12 | 하루 한도 | 5 / 10(시안) / 20 | **하루 10건**(KST). 기존 `private.consume_daily_quota`에 버킷 `beta_feedback`를 추가합니다(새 마이그레이션에서 `daily_usage_bucket_values` check를 새 값 포함으로 바꿈, 기존 행 영향 없음). 같은 글 1분 안 중복은 클라이언트에서 막습니다 |
| 13 | 금칙어 | 적용 / 미적용 | **미적용, 길이와 한도만.** 운영자만 읽는 글이라 남에게 노출되지 않습니다. 욕설이 섞인 불만도 신호로 받습니다 |
| 14 | 관리자 읽기 | `/admin`에 "베타 의견" 구역 / Supabase 대시보드에서 SQL로만 | **`/admin`에 "베타 의견" 구역**(D-19 C 문법의 목록, 최신순, 종류 필터, 읽음 처리 없음). 데이터는 `admin_beta_feedback(limit, before)` 보안 함수로만. 작성자는 닉네임 대신 짧은 익명 번호(같은 사람 묶음 확인용)로 보이고, 필요하면 관리자가 SQL로 확인합니다 |
| 15 | 보낸 사람에게 다시 보여 주기와 "읽음" | 없음(A, B) / 내가 보낸 의견 + 읽음(C) | **없음(MVP 베타).** 본인 select 정책은 남겨 두어(아래 6절) 나중에 C 목록을 붙일 수 있게 합니다 |
| 16 | 보관 기간 | 베타 종료 뒤 6개월(시안 문구) / 1년 / 무기한 | **베타 종료(T9.13) 뒤 6개월.** 정리 pg_cron(T6.26 작업에 한 줄)으로 지우고, 개인정보처리방침 초안에 항목과 기간을 추가합니다(T8 약관 초안 0.1판 갱신). 탈퇴 시에는 즉시 삭제(cascade) |
| 17 | 분석 이벤트 | `beta_feedback_submitted` 추가 / 없음 | **추가하지 않음.** PRD 10.2에 없고, 응답 수는 테이블로 셉니다. 넣는다면 PRD 10.2를 먼저 고칩니다 |
| 18 | `/beta` 문구 톤 | 습니다체 위주(시안) | 시안 그대로. 제목 후보 둘: "오늘 뭐 먹지를 10초 안에 정해 드립니다."(A, B, 기존 태그라인) / "점심 고민, 이제 10초면 됩니다"(C). 기본안은 기존 태그라인(랜딩과 같은 말) |

## 6. `beta_feedback` 테이블과 RLS 초안 (글로만, 마이그레이션 파일은 만들지 않음)

이미 있는 것: `profiles`(본인 읽기), `private.is_admin()`, `private.is_active_user()`(T8.5 `20261101180000_t8_5_admin_moderation.sql`), `private.daily_usage` + `private.consume_daily_quota(user_id, bucket)`(T6.5), `private.kst_today()`.

```sql
-- 새 마이그레이션 예: 2026110xxxxxxx_t9_4_beta_feedback.sql (승인 뒤 작성, db:push 전에 내용 공유)
create table public.beta_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles (user_id) on delete cascade,   -- 탈퇴하면 함께 삭제 (S9)
  category    text null
              check (category in ('bug', 'inconvenient', 'good', 'idea')),
  body        text not null
              check (char_length(btrim(body)) between 1 and 500),
  route       text null                                              -- sanitizeRoute 결과만
              check (route is null or (char_length(route) <= 64 and route ~ '^/[a-z0-9/_\[\]-]*$')),
  app_version text not null check (char_length(app_version) <= 32),
  algo_version text null check (char_length(algo_version) <= 32),
  device      text null check (device in ('ios', 'android', 'desktop', 'other')),
  in_app      boolean not null default false,
  standalone  boolean not null default false,
  created_at  timestamptz not null default now()
);
comment on table public.beta_feedback is
  '베타 의견(T9.4). 본인 쓰기와 본인 읽기만, 관리자는 admin_beta_feedback()으로 읽는다. 좌표, UA 원문, 쿼리, 카카오 장소 값은 넣지 않는다(route는 경로 틀만). 베타 종료 6개월 뒤 정리';

create index beta_feedback_created_at_idx on public.beta_feedback (created_at desc);
create index beta_feedback_user_idx on public.beta_feedback (user_id, created_at desc);

alter table public.beta_feedback enable row level security;
revoke all on table public.beta_feedback from public, anon;
grant select, insert on table public.beta_feedback to authenticated;   -- update, delete 권한 없음

-- 본인 insert만. 정지 사용자는 막는다. user_id는 본인으로 고정
create policy beta_feedback_insert_own on public.beta_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user());

-- 본인 행만 select (나중에 "내가 보낸 의견" 목록용, 지금 화면은 쓰지 않음)
create policy beta_feedback_select_own on public.beta_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

-- update, delete 정책 없음 = 사용자는 고치거나 지울 수 없다(탈퇴 cascade만)

-- 하루 한도: insert 전 트리거로 기존 한도 함수 사용 (버킷 check에 'beta_feedback' 추가는 같은 마이그레이션에서)
create or replace function private.beta_feedback_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.consume_daily_quota(new.user_id, 'beta_feedback');  -- 하루 10건, 넘으면 beta_feedback_daily_limit_exceeded
  return new;
end; $$;
create trigger beta_feedback_before_insert
  before insert on public.beta_feedback
  for each row execute function private.beta_feedback_before_insert();

-- 관리자 읽기: 보안 함수만 (테이블 select 정책으로 관리자에게 열지 않는다)
create or replace function public.admin_beta_feedback(p_limit int default 50, p_before timestamptz default null)
returns table (id uuid, author_tag text, category text, body text, route text,
               app_version text, algo_version text, device text, in_app boolean,
               standalone boolean, created_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select f.id, left(md5(f.user_id::text), 6), f.category, f.body, f.route,
           f.app_version, f.algo_version, f.device, f.in_app, f.standalone, f.created_at
      from public.beta_feedback f
     where p_before is null or f.created_at < p_before
     order by f.created_at desc
     limit least(greatest(p_limit, 1), 200);
end; $$;
revoke all on function public.admin_beta_feedback(int, timestamptz) from public, anon;
grant execute on function public.admin_beta_feedback(int, timestamptz) to authenticated;
```

함께 바꿀 것(같은 구현 커밋):
- 탈퇴 범위 `ACCOUNT_DELETION_SCOPE`(`src/features/auth/delete-account.ts`)에 `beta_feedback` 추가(S9). cascade라 별도 삭제 코드는 없지만 목록과 테스트에 올립니다.
- 서버 액션은 zod(`category` enum nullable, `body` 1~500, `route`는 서버에서 `sanitizeRoute`를 한 번 더 적용)로 재검증, 실패 시 재시도 1회.
- RLS 테스트 3역할 + 1: 본인(쓰기 성공, 본인 행만 읽힘, update/delete 거절, 11번째 거절), 타인(남의 행 0건, `user_id`를 남으로 넣으면 거절), 비로그인(insert, select 모두 거절), 정지 본인(insert 거절), 비관리자의 `admin_beta_feedback()` 거절. 테스트 계정은 `test_` 접두, 끝나면 정리 스크립트.
- 개인정보처리방침 초안에 수집 항목(의견 글, 경로 틀, 앱 버전, 기기 종류)과 보관 기간 추가.

## 7. 품질 메모

- `pnpm lint`(CSS 하드코딩 색 없음), `pnpm typecheck`, `pnpm lint:copy`(금지 문자 0, design-lab 문구라 비율 제외) 통과. 단위 테스트 `src/features/design-lab/beta/beta-lab.test.ts` 5건, `src/features/design-lab/beta-feedback/beta-feedback-lab.test.ts` 7건(경로 지우기 5, 쿼리 2) 통과.
- 가로 넘침: 360, 390, 1280에서 여섯 안 모두 0(스크립트 검사). 쿼리 캡처 스크립트 실행 중 페이지 오류와 콘솔 오류 0.
- 구현 때 고칠 것: 다크 모드에서 `aria-disabled` 주 버튼(bg-muted)이 시트 면(popover)과 거의 같은 톤이라 꺼진 버튼이 흐리게만 보입니다(기존 `button-classes.ts` 토큰 문제, 다른 시트도 같음. 구현 때 꺼진 상태에 1px 테두리 검토). B안 넘김은 화면 밖 카드 `inert`와 스크롤 위치 동기화, B 의견 시트는 단계 전환 때 초점을 새 제목으로. A `/beta`의 390 첫 화면에서 3단계 줄이 아래로 일부 내려가므로 리드 문단 길이를 줄이거나 그림 높이(h-44)를 조정.
- 시안은 로그인 버튼과 외부 브라우저 열기가 실제로 이동하지 않습니다(외부 열기는 1.5초 "여는 중" 뒤 실패 화면). 안드로이드 "설치" 버튼도 목업입니다.
- `[실기기]`(T9.0, Claude가 대신 확인하지 않음): 카카오톡 iOS와 Android에서 `/beta` 외부 브라우저 열기 스킴, iOS Safari 공유 메뉴의 "홈 화면에 추가" 위치와 이름(iOS 버전마다 다름), Android Chrome 설치 버튼(`beforeinstallprompt`)이 `/beta`에서 오는지, 홈 화면 앱으로 열었을 때 standalone 판정, 의견 시트에서 키보드가 열릴 때 보내기 줄 위치.
