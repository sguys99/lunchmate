# making-figures 변경 기록

스킬 문서와 공통 도구의 변경을 날짜순으로 적습니다. 새 항목은 위에 붙여요.

## 2026-10-17 4장 그림 작업 반영 (tasks.md 3단계)

근거는 4장 작업 노트(`vol1-llm/ch04/notes.md`의 "그림 인계", 그림 검수 기록 1-4-1~1-4-9, "그림 번호 이동", "R1 반영 그림 인계", "그림 검수 기록: R1 반영", "R2 반영과 현장 들여다보기 기록"), 검수 보고서(`review/reviewer-r1.md` G01~G04, 7장 제안, `review/reviewer-r2.md` G01, G02), 오케스트레이터 시각 검수 기록입니다. 작성자 자가 검수가 통과시킨 것을 오케스트레이터나 reviewer가 잡은 경우가 많아, 검수 항목을 구체 수치와 자동 경고로 바꾸는 데 무게를 두었어요. 원인 표기는 앞 항목과 같고(지시, 예시, 검사), 기준을 느슨하게 바꾼 항목은 없습니다. 설계서, style-guide, 승인 시안, 공통 도구 `assets/mermaid/_build/postprocess.mjs`는 고치지 않았습니다.

### 스킬 문서

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| `docs/figures.yml`은 Edit로 맡은 항목의 줄만 고치고 전체 다시 쓰기(Write, `yaml.dump`, 스크립트 전체 치환) 금지. 9단계의 "기록부를 만들 예정" 문단을 대체 | `SKILL.md` 9단계, 5장 표, `caption-alt.md` 6.3절 | 4장에서 그림 에이전트 여럿이 동시에 고치던 중 한 에이전트가 파이썬으로 전체를 다시 씀(덮어쓰기 위험) | 지시 |
| 캡션과 alt를 바꾸는 순서: `figures.yml` 먼저, 같은 회차에 원고 그림 줄과 SVG desc를 같은 글로. 인계표 확정안이면 그림 담당이 원고 줄도 바꿈. 1.1절의 "원고 최종본, 기록부 사본" 문장을 편집 원천 설명으로 고침 | `caption-alt.md` 1.1절, 6.4절, `SKILL.md` 0단계 표, 8단계, 6장 | R1 회차에 F11 때문에 원고 확정 캡션을 넣지 못하고 그림 담당에게 넘김(notes.md "R1 반영 그림 인계") | 지시 |
| 그림 번호 이동 점검표 10줄(파일 이름, 소스 안 ID, LAYOUT과 fid, 다시 빌드, 기록부, 원고, references where, 설계서 명세와 6.1절, 시험 기대값, 작업 노트)과 "뒤 번호부터" 순서. 0단계 표에 작업 종류 추가 | `choose-type.md` 6.1절, `SKILL.md` 0단계, 5장 | 그림 추가로 1-4-6~8이 7~9로 밀렸는데 절차가 없어 손으로 찾음(notes.md "그림 번호 이동") | 지시 |
| 패턴 그림의 오독 점검(패턴마다 "이 모양이 말하는 것"을 적어 본문 뜻과 대조) | `design-rules.md` 2.1절, `qa-checklist.md` Q12, 3.8절, `SKILL.md` 7단계 | 1-4-5 첫 판 둘째 헤드 수평 띠가 "자기만 봄"으로 읽힘(오케스트레이터), R1 판 둘째 헤드가 첫째와 구별 안 됨(R1-G03) | 검사 |
| 밀도와 무아레(선 사이 4 미만 금지, 많은 연결은 옅은 한 굵기, 가는 선에 흰 틈 없음, 가는 선 계조가 굵은 띠보다 진하지 않게), 빈 여백(높이 단계 차이보다 큰 빈 띠) | `design-rules.md` 3장, `qa-checklist.md` Q13, 3.8절 | 1-4-5 첫 판 셋째 헤드 무아레와 아래 빈 여백, 2회차 위계 뒤집힘, 1-4-8 1회차 오른쪽 1/3 빔 | 지시, 검사 |
| 칩과 대상 거리 16 이하를 S 그림에도 적용, 눈금 글자와 16 넘게. 칩 안 단위가 두 글자 이상이거나 한글이면 칩 밖 보통 글자로 | `design-rules.md` 4.2절, `qa-checklist.md` Q2, Q10, 3.8절 | 1-4-8 1회차 칩이 점에서 떠 보이고 눈금 "100만"과 붙음, 1-4-9 칩 "약 164억쌍" 넘침(오케스트레이터) | 지시, 검사 |
| 휴대폰 폭 판정은 "읽힘"이 아니라 CSS px 수치로 기록. 메시지 정보의 범위를 적고 검수 기록 본보기 w328 줄을 수치로 | `qa-checklist.md` Q3, 3.1절 표 아래, 5.3절 본보기, 7장 | 1-4-8 값 라벨 14(7.2 CSS px)를 note가 "w328에서 읽힘"으로 통과(R1-G01 중대) | 검사, 예시 |
| 장 대조판: 같은 장 컬러 PNG를 한 장에 붙여 모양 언어가 한 시스템인지 보는 단계와 명령. 세련됨 원칙 5번에 "장 안에서 한 시스템" | `qa-checklist.md` 4장 5번, `SKILL.md` 2장 원칙 5, 7단계 5번 | 1-4-5 재설계가 1-4-1의 호 언어와 토큰 줄을 이어받아 그물과 오독이 함께 풀림(오케스트레이터) | 지시 |
| Mermaid 강조 한계: 뒤 처리가 `*강조*`를 강조색 밑줄로만 그려 링크처럼 보이고 칩을 못 그림. 메시지 숫자는 `msg` 상자 안 `**숫자**`(600), 칩이 필요하면 S 재작도. 뒤 처리 수정은 제안으로만 | `mermaid-guide.md` 4장, 5장, 10장, 11장 명령 4, `SKILL.md` 5장, 6장, `svg-guide.md` 6.3절 | 1-4-3 R1-G04, 결국 굵기 600으로 대체(notes.md "그림 검수 기록: R1 반영" 저자 확인) | 지시 |
| 로그 차트: 점 6개 이하인 로그 가로축은 눈금을 데이터 점 자리에, 세로축 눈금과 값 라벨 중복 피하기, 칩과 눈금 글자 거리. 경고표에 figlib 새 경고 | `chart-guide.md` 4.3절, 7장 경고표, `qa-checklist.md` 3.8절 Q21 | 1-4-8 2회차 오케스트레이터 지적(10배 눈금이 1,000, 2,000, 8,000, 128,000과 어긋남) | 지시 |
| 원(모서리 규칙) 예외: 명세가 원 모양 물건을 정한 비유 장면은 그 물건에만 쓰고 `note`에 적음. style-guide 5.6절 보강은 제안으로만 | `design-rules.md` 7장 표 | 1-4-6 시계판(notes.md "그림 검수 기록: R1 반영") | 지시 |
| 본보기를 4장 원고판으로: 1-4-3 Mermaid 본보기 전체(02 나누기, q와 k의 내적, 가중치 × v의 합, 굵은 0.576), alt 본보기 첫 문장, 단계 이름 예, figkit 예제 문구 | `mermaid-guide.md` 2장, `caption-alt.md` 3.5절, `patterns.md` P1, `svg-guide.md` 6.2절과 예제 | R1-G04, R2-P1-03(원고 말 "나누기", "내적", ×는 행렬곱과 수 곱셈에만) | 예시 |
| 4장 그림 번호 이동 반영: 패턴 부록 A(1-4-6 기타 장면도 추가, 블록 1-4-7, 차트 1-4-8, 요약 1-4-9, 합계 237), 차트 로그 축 해당 그림, 문서 곳곳의 "236개" | `patterns.md` 머리, 표, 부록 A, P9, `chart-guide.md` 4.3절, `SKILL.md`, `design-rules.md`, `qa-checklist.md`, `choose-type.md`, `mermaid-guide.md`, `caption-alt.md` | 설계서 4장 그림 9개(v0.1 2026-10-17), `choose-type.md` 부록 B 명령 1 결과 237 | 예시 |

### 평가 쪽

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| 사례 1 기대를 4장 원고판에 맞춤: 와이어프레임과 정본 표의 "02 나누기", 강조는 굵은 0.576(밑줄이면 실패), A2 네 단계 이름 "점수, 나누기, softmax, 가중합", H2, H4 밑줄 표현 정리, 실패 예 2줄 추가(밑줄 강조, 옛 단계 이름), 7장 메모 4(기준 출처와 자동 블록 영향 없음) | `case-1-4-3-attention-steps.md` 1, 3, 5, 6, 7장, `evals.json` id 1 expected_output, A2, H2 | 위 본보기 변경과 같음. 자동 블록은 숫자와 치수만 재므로 시안 28항목 통과 그대로 | 예시 |
| 금지 목록에 저장소의 4장 원고판 그림 소스, 기록부 항목, 검수 기록 추가. 입력 원고에 확정 캡션과 alt가 들어 있다는 주의 | `evals/README.md` 실행 방법 4번 | 2026-10-17부터 4장 원고와 그림이 저장소에 있음 | 지시 |
| 사례 2 caveat: 원고판은 R2 (e)로 caveat를 지웠으나 평가는 원고 문맥 없는 과제라 기대 유지. 실제 장에서는 6.4절대로 두 곳 함께 | `case-1-4-4-weight-ribbons.md` 7장 메모 4 | R2 제안 (e), 기대를 느슨하게 하지 않으려는 것 | 예시 |

### 검사 스크립트 (시험을 먼저 쓰고 실패를 확인한 뒤 고침)

| 변경 | 고친 곳 | 시험 | 근거 | 원인 |
|---|---|---|---|---|
| FQ-CHIP: 숫자 칩 글자(Pretendard 실측, 숫자는 tnum 폭)가 칩 테두리 안쪽 여백 4 미만이면 경고. FQ-W328M: 세로 변형 없는 본문 그림에서 강조색, 600 이상, 칩 안 글자가 16 미만이면 경고(글자와 CSS px 목록). FQ-V 참고에도 14 글자 목록. 승인 시안과 4장 그림 전부 새 경고 0 | `scripts/figure_qa.py` | `test_figure_qa.py` `FigureQaChecks` 6건(렌더링 없이 돎) | 1-4-9 칩 넘침, R1-G01 | 검사 |
| 로그 가로축에서 점 있는 선의 점이 6개 이하인데 데이터 점 x가 눈금에 없고 눈금은 점 밖에 있으면 `save()`가 경고. 1-4-8, 1-5-5, 견본 두 개를 다시 만들어 바이트 단위로 같고 새 경고 0 | `assets/charts/figlib.py` | `test_figlib.py` `TestLogTicks` 3건 | 1-4-8 2회차 | 검사 |
| F16: 그림 폴더 출력 SVG의 `<title>` 글, 머리줄 "그림 ID", figkit title id(`f147-t`)가 파일 이름 ID와 같아야 함(오류) | `scripts/check_figures.py` | `test_check_figures.py` 1건 | 그림 번호 이동 | 검사 |
| `--sections`: 장 도입과 장 끝 요소(🧭, 🏭, 🛠, ❗, 한 장 요약, 용어 정리, 참고 자료)를 마지막 절에서 떼어 따로 보이고 판정(차이%)에서 뺌. "설계 절 합, 장 예산, 장 도입과 장 끝 요소 몫" 줄. 설계서 장 쪽수 = 절 합 + 장 도입과 장 끝 요소 해석을 docstring에 | `scripts/page_estimate.py` | `test_page_estimate.py` `ChapterEndTest` 4건 | 4장 4.6이 +317%로 보임(notes.md 3회차 기록) | 검사 |
| S13 해요체 연속: 🧭 박스 번호 목록의 의문문("개발자에게 물어볼 질문")은 연속 계산에서 빼고 연속을 끊음(비율에는 셈) | `scripts/style_check.py` | `test_style_check.py` `TestS13PmQuestions` 3건 | 4장 R1 S13 경고(질문 5연속), 원고에 맥락 문장을 끼워야 했음 | 검사 |
| 줄 무시 표지 유지, 남용 막기: 이유 없는 표지 CAN08, 건너뛸 위반이 없는 표지 CAN09(둘 다 경고). 시험 데이터 표지 2곳에 이유를 붙임 | `scripts/check_canon.py`, `scripts/tests/fixtures/check_canon/ok/ch08/index.md`, `tokens/ch02/index.md` | `test_check_canon.py` `IgnoreMarkTest` 3건 | 4장 4.4 문단 1 설계서 예문 날짜(notes.md "저자 확인 필요", reviewer-r2 5장) | 검사 |

- 새 시험은 20건이고 전체 369건이 통과합니다. `scripts/tests/README.md` 2장 표의 시험 수를 고쳤어요.
- `bash scripts/check_chapter.sh vol1-llm/ch04 --final`은 그대로 통과(오류 0, 경고 27)입니다. page_estimate `--sections`에서 4.6은 8.3쪽(+317%)에서 1.9쪽(-5.5%)이 되고, 장 끝 요소 6.7쪽과 장 도입 1.1쪽이 따로 보입니다.
- 공통 도구 `postprocess.mjs`의 `*강조*` 칩 모양 안, style-guide 5.6절 원 예외, 8.6절 "원고 최종본" 문구, 평가 입력 원고 고정은 제안으로만 남겼습니다(`docs/skill-trial-3.8.md` 7.2절).

## 2026-10-17 장 밖 그림 ID 꼴과 폴더 (저자 결정)

| 변경 | 고친 곳 | 근거 |
|---|---|---|
| 앞부분 `[권]-F-[번호]`(`vol*/front/figures/`), 부록 `[권]-A[부록 글자]-[번호]`(`vol*/appendix/figures/`), 맺음말 폴더 `vol3-physical-ai/figures-epilogue/`. 6장 위치 표를 채우고 "정해지지 않음" 줄을 지움 | `choose-type.md` 6장, 3.1절 표, `SKILL.md` 범위와 4장 | 저자 결정 2026-10-17 1, 2 |
| 부 도입 그림은 모든 부 도입에 1개, 종류 S(그 부 장들의 흐름 + 권별 위치 표시), 3-E-1도 S. 6장의 "6단계 흐름이면 M 후보" 문장을 대체 | `choose-type.md` 6장 | 저자 결정 2026-10-17 3, 4 |
| 검사 도구가 새 ID 꼴과 폴더를 읽음(`mdscan.FIGURE_ID_RE`, `FIGURE_DIRS`, `check_figures.py`, `build_charts.py`, `figure_qa.py`, `render_mermaid.sh`, `check_canon.py`, `page_estimate.py`) | 스크립트 | tasks.md 4.6절 |

## 2026-10-15 3.8절 2회차 실패 반영 (3회차 준비)

근거는 `docs/skill-trial-3.8.md` 5장(5.3, 5.4절)입니다. 2회차 사례별 `analysis.md`와 `with_skill/grading.json`(`making-figures-workspace/iteration-2/eval-N/`)도 함께 봤어요. 저자가 그림 4개의 방향을 승인한 뒤(2026-10-15) 고쳤습니다. 원인 표기는 1회차 항목과 같고(지시, 예시, 검사), 기준을 느슨하게 바꾼 항목은 없습니다.

### 스킬 문서

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| P8 표에 라벨 행: 출발 토큰 20 600, 도착 토큰 16에서 강조 도착 상자만 600 ink-900, 나머지 400 ink-600. 강조 행에 "그 도착 상자 라벨(600)". 9장 5번 관찰값에 강조 라벨 예외를 밝힘 | `patterns.md` P8, `design-rules.md` 9장 5번 | 1-4-4 H3 | 예시 |
| 세련됨 줄 작성법: 대조 시안이 다른 종류면 9장 표의 같은 종류 그림 관찰값을 줄마다 확인한 뒤에만 "어긋남 없음". 4장 1번과 SKILL.md 7단계 4번에도 한 줄 | `qa-checklist.md` 4장, 5.3절, `SKILL.md` 7단계 | 1-4-4 H7 | 검사 |
| 5단계 시작점 표에 "시작점이 금지된 경우의 대체 견본" 칸(S는 `final/1-4-8.build.py`, 요약은 `1-4-4.build.py`, M은 `mermaid-guide.md` 2장, C는 `chart-guide.md` 8장, T는 `table-samples/sheet-*.yml`). 대체 견본에서는 골격만 빌리고 치수는 패턴 표에서 | `SKILL.md` 5단계 | 1-4-4 분석 4장(출발 견본과 금지 목록 충돌) | 지시 |
| 지시선 0개여도 차트 세로 변형 판과 그림 영역은 1-5-5.v 실측(360 × 368, y 128~320) 그대로, 영역 위 빈 띠는 여백으로 두고 새 글로 채우지 않음 | `patterns.md` P15, `chart-guide.md` 4.2절 지시선 행, 6장 표 | 2-6-6 W3 | 지시 |
| 칩과 점 거리 기준: 칩의 가장 가까운 변에서 가리키는 점 중심까지 16 이하, 칩에 가장 가까운 데이터 점이 가리키는 점. 대각 방향보다 `right`, `above`를 먼저. 경고표에 새 경고 두 줄 | `chart-guide.md` 4.2절, 6장 표, 7장 경고표 | 2-6-6 세련됨 제안 2 | 지시 |
| 출처 줄: 키가 장 `references.yml`에 없으면 줄을 버리지 않고 `[@key]` 자리만 `[출처 필요: {key}]`(설계서 출처 키 이름 그대로). 그림 번호를 확인하지 못하면 번호를 빼고 태그에 ", 그림 번호 확인". 이전의 "줄 대신 `[출처 필요]`"는 writing-chapter `box-markup.md` 5장 출처 줄 표와 달라 그쪽에 맞춤. 키는 있고 번호만 모르는 경우는 두 문서 모두 정하지 않아 저자 확인 | `caption-alt.md` 4.1절 표와 목록, 4.2절, 4.3절 | 두 스킬 규칙 충돌(코디네이터 추가 요청, 7.3 F2와 같은 계열) | 지시 |
| P9 캔버스: 480은 하위 모듈 3개 이상일 때만, 모듈 둘은 320. 두 모듈을 잇는 연결이 강조면 본문은 1.5 accent 화살표와 600 라벨(상자 표현은 세로 변형에서만). "모듈 둘 본문" 기본안(둘째 모듈 176 × 64, 112로 맞추면 320에 안 들어감)을 더함. 검수 기록에 큰 캔버스 허용 조건을 적게 함 | `patterns.md` P9 캔버스, 강조 행과 목록, `qa-checklist.md` 5.3절 | 3-8-1 W1, 세련됨 제안(480 캔버스, System 1 176 × 112) | 지시 |
| P9 모듈 둘 세로 변형 값을 8 격자와 lint에 맞춤: 두 칸 행 x 16과 192, 152 × 48(사이 24), 모듈 x 16 328 × 64, 출력 x 16 152 × 48(같은 열 같은 종류 상자 크기), 판 360 × 472. 이전 값 156 × 48, x 188은 `figkit.box` 오류, 출력 328은 lint 경고 | `patterns.md` P9 | 3-8-1 분석 3장(문서와 lint 충돌) | 예시 |

### 공통 도구

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| `chip`이 점에 단 칩(`target_r` 없음)에서 두 경우에 경고: 가리키는 점에서 16을 넘게 떨어짐, 가리키는 점보다 다른 데이터 점(표식이 있는 선, `markevery` 반영)에 더 가까움. 기본 `gap` 8이면 경고가 없어 시안 1-5-5를 다시 만들어도 바이트 단위로 같고 경고 0. 견본 두 개(`examples/`)도 새 경고 없음 | `assets/charts/figlib.py`, 시험 `scripts/tests/test_figlib.py`(3건 추가, 8건), `scripts/tests/README.md` 표 | 2-6-6 세련됨 제안 2 | 검사 |

### 평가 쪽

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| 사례 2 키 라벨 자동 검사(굵기, 글자색을 토큰 값과 비교). 시안 두 판 6줄 통과, 2회차 with_skill 6줄 실패를 확인. H3에 이 명령 통과를 묶고, H7에 9장 1-4-4 관찰값 대조를 더함 | `case-1-4-4-weight-ribbons.md` 5.2, 5.4, 5.5, 6장, `evals.json` id 2 H3, H7 | 1-4-4 H3, H7 | 검사 |
| 사례 2 실행 지시에 대체 출발 견본 `final/1-4-8.build.py`를 명시 | `evals/README.md` 실행 방법 4번, `case-1-4-4-weight-ribbons.md` 3장, `evals.json` id 2 expected_output | 1-4-4 금지 목록 충돌 | 지시 |
| 사례 3 세로 변형 와이어프레임의 "메시지 문장" 줄을 "지시선을 둘 때만"으로, 그림 영역과 W3에 "지시선 수와 상관없이". 강조 칩 행에 칩과 점 거리 기준 | `case-2-6-6-success-curves.md` 5.2, 5.5, 6장, `evals.json` id 3 W3, expected_output | 2-6-6 W3 | 지시 |
| 사례 4 세로 변형 값을 P9와 같게(152 × 48, x 192, 출력 152, 360 × 472), W1을 본문 320만으로(자동 블록 새 변수 `BH`, 사례 4는 `BH=320`), 강조 기본안(본문 화살표와 600 라벨), System 1 높이 설명 | `case-3-8-1-dual-system.md` 4장, 5.1, 5.2, 5.4, 5.5, 6장, `evals/README.md` 자동 블록, `evals.json` id 4 W1, W3, expected_output | 3-8-1 분석 3, 5장 | 예시, 검사 |
| 자동 블록 `message ○자` 줄을 네 사례 모두 Y1에 묶음(사례 1은 이미 있었음). 2회차 3-8-1(42자)은 이제 Y1 실패 | `evals/README.md`, 사례 md 5.5절 Y1, `evals.json` id 2, 3, 4 Y1 | 3-8-1 분석 1장 | 검사 |
| 용어 결정("액션") 반영 확인: 사례 4 `MUST`와 C1, A2, H4는 4fc6108에서 이미 "액션". 옛 표기를 잡도록 `BAN`과 C2에 `행동(?! ?복제)`를 더함. 2회차 산출물(라벨, alt "행동")은 C1, C2 실패로 갈림. references와 나머지 사례에 모델 출력 뜻의 "행동", "동작"은 남지 않음 | `case-3-8-1-dual-system.md` 5.3, 5.4절, 7장 메모 8, `evals.json` id 4 C2 | CLAUDE.md 7장 용어 결정 | 검사 |
| 사례 1을 회귀 시험으로 분류(판정 항목과 기준은 유지). 통과율을 읽을 때 W2, C1, A2, 본문 H3의 통과를 일반화 개선으로 세지 않음. 새 M 사례는 두지 않고 저자 결정으로 남김 | `evals/README.md` 사례 표와 아래 문단, `case-1-4-3-attention-steps.md` 제목, 1장, `evals.json` id 1 expected_output | `docs/skill-trial-3.8.md` 5.3절 1번 | 지시 |
| 사람 판정 1번에 `figure_qa.py --out-dir` 지정법(제출본은 `$O/$D/_render/qa`, 대조 시안은 채점마다 `mktemp -d` 폴더). 작업 공간 예시 경로를 `iteration-3`으로 | `evals/README.md` 실행 방법 1, 2, 9번, 자동 판정, 사람 판정 1번 | 1-4-3 분석 5장 4번 | 지시 |

- 확인: 바뀐 자동 블록을 2회차 3-8-1 with_skill에 돌렸어요. 본문 높이 480, 정본 문자열(액션 없음), 금지 패턴(행동), message 42자가 실패로 나옵니다(7/28 실패). 키 라벨 명령은 시안 1-4-4 두 판에서 모두 통과, 2회차 1-4-4 with_skill에서 모두 실패입니다.
- 승인 시안, 설계서, CLAUDE.md, style-guide.md, 1, 2회차 작업 공간은 고치지 않았어요.
- 새 M 사례(예시에 없는 흐름도)는 만들지 않았습니다. 둘지 말지는 저자 결정으로 남겨 두었어요.

## 2026-10-15 3.8절 1회차 실패 반영 (tasks.md 3.8절 4번)

근거는 `docs/skill-trial-3.8.md` 2.2절, 2.4절입니다. 1회차 사례별 `analysis.md`(`making-figures-workspace/iteration-1/eval-N/`)도 함께 봤어요. 사례는 1-4-3(eval-1), 1-4-4(eval-2), 2-6-6(eval-3), 3-8-1(eval-4), 판정 ID는 사례 md 5.5절 번호예요. 원인은 지시 부족(지시), 예시 부족(예시), 검사 누락(검사)으로 적었습니다.

### 스킬 문서

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| Mermaid 상자 폭은 문구가 정한다는 사실을 패턴 기준 폭(P1 240)과 잇고, 같은 열 단계 노드는 같은 층(이름과 연산, 값 줄)을 쓰게 함 | `mermaid-guide.md` 5장 "패턴 기준 폭과 문구", `patterns.md` P1 열과 상자 행, `SKILL.md` 5단계 | 1-4-3 W2 | 지시 |
| 노드, 단계, 입력 이름은 설계서, 원고, 정본 행, 승인 시안 예의 용어 그대로. 바꾸면 `note`에 사유 | `SKILL.md` 5단계, `patterns.md` P1, `mermaid-guide.md` 5장, `design-rules.md` 11장, `caption-alt.md` 3.1절, 3.5절 M 행 | 1-4-3 A2 | 지시 |
| 1-4-3 일곱 노드 전체를 본보기로 싣고 볼 점 넷을 붙임 | `mermaid-guide.md` 2장 | 1-4-3 W2, A2 | 예시 |
| 차트 판: 그림 영역 아래 끝 264 고정, 가로축 제목 자리를 만들려고 판을 줄이지 않음. 견본 `example-log-n6-1.py` 판(240)과 원고 판의 차이 주의. 눈금 글자에 단위를 붙이는 안은 style-guide 6.5절과 겹쳐 저자 확인 대기 | `patterns.md` P15, `chart-guide.md` 3장, 4.2절, 5장 | 2-6-6 W2 | 예시 |
| 점 있는 선 그래프의 지시선 점은 데이터 점 위에만, 자리가 없으면 지시선을 뺌. 정본 x 점은 모두 찍고 라벨만 생략. 칩은 점 바로 옆 | `chart-guide.md` 3장, 4.2절, 6장, 7장 경고표 | 2-6-6 H6 | 지시 |
| 맥락 선 계조와 선 종류를 D1(흑백은 선 종류로 구분)에 맞춰 하나로 정리: 하나면 ink-400 실선, 둘이면 `rank=1` ink-600 파선, `rank=2` ink-400 1.5px 점선. 4.1, 4.2, 6장, P15를 같은 문장으로 맞춤. 시안 1-5-5와 다른 점은 저자 확인 | `chart-guide.md` 3장, 4.1절, 4.2절, 6장, `patterns.md` P15 | 2-6-6 H2, H3 | 지시(문서 충돌), 검사 |
| 차트 alt 핵심 숫자 2~4개를 세는 대상과 고르는 순서, 시안 1-5-5 alt(결과값 9개)를 본보기에서 빼고 4개짜리 예문을 둠. 7장 명령에 C 그림 alt 소수 개수 후보를 더함 | `caption-alt.md` 3.2절, 3.5절, 7장, `design-rules.md` 11장 표 | 2-6-6 A2 | 예시, 검사 |
| own 그림의 캡션과 alt에 회사명, 모델명을 쓰지 않음("한 대표 사례의 공개값"). 설계서에 없는 하위 구성을 라벨과 alt에 붙이지 않음 | `caption-alt.md` 2.1절, 2.2절, 3.1절, 4.1절, 8장, `design-rules.md` 11장, `SKILL.md` 5, 8단계 | 3-8-1 C2 | 지시 |
| P9 입출력 상자 160 x 48 한 줄 고정, 부연은 캡션으로. 강조를 위해 단을 늘려 480으로 키우지 않음 | `patterns.md` P9 상자, 캔버스 행, `svg-guide.md` 6.1절 | 3-8-1 W2, H3 | 지시 |
| 모듈 둘인 세로 변형 와이어프레임(입력 행과 모듈을 번갈아 쌓음, 입력 방향 유지) | `patterns.md` P9, `svg-guide.md` 10장 | 3-8-1 W3 | 예시 |
| 세로 변형 폭 400은 끊을 수 없는 정본 숫자 묶음이 328에 안 들어갈 때만. 지시선 글, 라벨, 부연으로는 넓히지 않음 | `svg-guide.md` 10장, `choose-type.md` 5장, `SKILL.md` 5단계 | 3-8-1 W1 | 지시 |
| 검수 기록의 치수는 SVG에서 읽은 값으로, 경고와 맞지 않는 "어긋남 없음" 금지. 열별 상자 크기 명령 추가, Q8에 패턴 기준 폭 대조 | `qa-checklist.md` Q8, Q23, 5.3절, `patterns.md` 9.2절, `mermaid-guide.md` 11장 명령 6, `SKILL.md` 7단계 | 3-8-1 H7, 1-4-3 W2 | 검사 |
| 세련됨 제안 중 시안 실측으로 확인된 것만 일반화: 비강조 상자 테두리 ink-200(figkit `kind='input'`), 열 머리 기준선 72(첫 상자 위 끝 - 16), 칩과 점의 거리, accent 한 덩어리, 같은 열 줄 수 맞추기. P8 열 머리 y를 실측 72로 바로잡고 상자 테두리, 세로 변형 지시선 출발점(칩)을 표에 넣음 | `design-rules.md` 7장 상자 표, 9장 5번과 아래 표, `patterns.md` P8, `svg-guide.md` 6.1절 | 1-4-4 분석 4, 5장, 2-6-6과 3-8-1 세련됨 제안 | 지시 |

### 공통 도구

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| lint 경고 "같은 종류 상자 크기 다름/높이 다름": 테두리 색, 굵기, 면이 같은 상자가 같은 열이면 폭과 높이, 같은 행이면 높이가 같아야 함. 높이 72를 넘는 블록은 묶음 높이에 맞추므로 높이 비교에서 뺌(P9 두 모듈). 승인 시안 10장은 새 경고 0건, 1회차 3-8-1 with_skill은 잡힘 | `assets/svg-parts/_build/figkit.py` lint, 자기 시험 `test_same_kind_box_size` | 3-8-1 H3 | 검사 |
| `line(..., rank=1, 2)`로 맥락 선 순번을 열고, `leader`가 점 있는 선 그래프에서 데이터 점 밖에 점을 찍으면 경고. rank 없는 기본과 데이터 점 위 지시선은 그대로라 1-5-5를 다시 만들어도 바이트 단위로 같음 | `assets/charts/figlib.py`, 시험 `scripts/tests/test_figlib.py`(5건), `scripts/tests/README.md` 표 | 2-6-6 H2, H3, H6 | 지시, 검사 |

### 평가 쪽

| 변경 | 고친 곳 | 근거 |
|---|---|---|
| 금지 목록 표: 사례 1은 `mermaid-sample.*`, `figkit-sample.*`, `A-flow.svg`, `B-flow.svg`, `B-flow.v.svg`, `C-flow.svg`, `index.html`, `dark-mode.html`, 공통으로 `final/figures.yml`, `final/index.html`. `docs/style-board/` 전체를 정답 글자로 검색해 확인했고, N4-2 값만 담은 `tokens-*.svg`, `parts-concepts.svg`는 금지하지 않음 | `evals/README.md` 실행 방법 4, 7번, 사례 1, 2 md 3장 | 2.4절 3번 |
| 실행 방법 2단계에 장 `index.md` 복사(링크가 아니라 복사, 저장소 원고 보호) | `evals/README.md` | 2.4절 2번 |
| F2 재현을 임시 미러에 복사해 실행하고 비교(제출본을 덮지 않음). 소스가 `resolve()` 옆에 쓰므로 링크가 아니라 복사 | `evals/README.md` 자동 판정 | 2.4절 4번 |
| 세로 변형 폭을 `VW`(기본 360)와 같아야 통과로 조임. 3-8-1 W1 문구와 일치 | `evals/README.md`, `case-3-8-1-dual-system.md` 5.4절, `evals.json` id 4 | 2.4절 5번 |
| C 사례 alt 결과 소수 개수 `ALTNUM=2-4`, 계열 이름 숫자는 `ALTSKIP` | `evals/README.md`, `case-2-6-6-success-curves.md` 5.4절, `evals.json` id 3 | 2-6-6 A2 |
| 3-8-1 BAN에 `관절;;로봇 상태;;손목`, C2 문구에 그림 글자, alt, 캡션 모두 | `case-3-8-1-dual-system.md` 5.3, 5.4, 5.5절, `evals.json` id 4 | 3-8-1 C2 |
| 1-4-4 띠 폭 명령이 출발 x를 고정하지 않고 가로, 세로 배치를 모두 읽으며 본문과 세로 변형을 함께 보고 0개면 실패 | `case-1-4-4-weight-ribbons.md` 5.4절, `evals.json` id 2 C3 | 1-4-4 분석 4장 2번 |

- 확인: 바뀐 자동 블록을 1회차 산출물에 돌렸습니다. 2-6-6 with_skill은 "alt 결과 소수 5개"에서 실패합니다. 3-8-1 with_skill은 금지 패턴(관절, Helix, Figure), 입력 상자 크기, 세로 변형 폭 400에서 실패합니다. 시안 1-4-3, 1-4-4를 가짜 산출 폴더에 두면 사례마다 29항목 모두 통과입니다.
- 기준을 느슨하게 바꾼 항목은 없습니다. 1-4-3 사례는 본보기에 시안 전체가 실려, 이제 "노드 재현"보다 세로 변형 판단, 검수 기록, 캡션과 alt를 재는 사례가 됩니다(사례 md 3장).
- style-guide와 시안 쪽 결정이 필요한 7건은 `docs/skill-trial-3.8.md` 4장 "making-figures" 소절(MF1~MF7)에 올렸습니다.

## 2026-10-15 검사 스크립트 완성 반영 (tasks.md 3.7절)

- `SKILL.md` 6단계 명령을 `render_mermaid.sh`, `build_charts.py --kind all` 일괄 명령으로 바꾸고 도구별 개별 명령은 예비로 낮췄습니다. 7단계는 `figure_qa.py --sheet`, 금지 사항 표의 `check_figures.py`(작성 예정) 표시는 F09, F20 규칙으로 바꿨습니다.
- `qa-checklist.md` 2.2절을 `figure_qa.py`가 정본이라고 고치고 손 묶음 명령은 예비로 남겼습니다. 2.3절 표에 `X.tritan.png`, `X.sheet.png`, `X.v.w360.png`를 더했습니다.
- `mermaid-guide.md` 점검 명령 1, 5번을 `render_mermaid.sh`로 바꾸고 옵션 표(`--check`, `--png`, `--variant`, `--out-dir`)를 더했습니다.
- `chart-guide.md` 7장에 `build_charts.py` 일괄 명령(`--strict`, `--png`, `--check`)을 넣었습니다.
- `caption-alt.md` 7장에 `style_check.py`(S20~S24)와 `check_figures.py`(F04, F11)의 몫을 적고, 기록부 자체 점검 명령은 그대로 두었습니다.
- `choose-type.md` Mermaid 렌더링 안내를 `render_mermaid.sh`로, `evals/README.md` 자동 판정에 `check_figures.py --root "$O"`와 `figure_qa.py`를 넣었습니다.

## 2026-10-15 저자 결정 반영

3.4절 확인 질문을 저자가 모두 추천안대로 승인했습니다. style-guide.md에 정식 규칙 20건(S1~S20)을 넣고, references의 "제안", "저자 확인" 표시를 확정 문구와 style-guide 절 번호로 바꿨어요.

| S | 결정 | style-guide | 고친 references |
|---|---|---|---|
| 1 | 세로 정렬선 5개 이하 | 5.4, 5.14 | `design-rules.md` 9장 2번 |
| 2 | 강조는 흐름의 결과 자리 | 6.2, 6.11 | `design-rules.md` 9장 4번, `choose-type.md` 3.4절 |
| 3 | 메시지 지시선 0~1개 | 6.2, 6.11 | `design-rules.md` 9장 8번 |
| 4 | 다단 그림 열 머리 ink-500. T 표 머리 행은 9.5절 ink-900, 600 그대로 | 2.2 | `design-rules.md` 중립색 표 |
| 5 | Mermaid 파일별 init, config 금지 | 9.8 | `mermaid-guide.md` 3장 |
| 6 | 부품 기호는 defs 복사(`Figure.use`) | 9.2, 9.3, 9.4 | `svg-guide.md` 7장 |
| 7 | 장 아이콘 `ic-`는 그림 안에서 쓰지 않음. 단 `ic-human`은 c-human, c-demo 사람 개입 표지로 씀 | 9.1, 9.8 | `svg-guide.md` 7장. figkit `SPRITES`에 `ic-`(icons.svg) 추가, 시험 `test_figure_use_ic_human` |
| 8 | 캡션과 alt에 색 이름 금지 | 8.3 | `caption-alt.md` 3.3절 |
| 9 | 돌지 않는 가로축은 "왼쪽에서 오른쪽으로" 허용 | 8.2 | `caption-alt.md` 1.2절 |
| 10 | 미리보기 PNG 위치 `_render/qa/`, `figqa` | 6.11 | `qa-checklist.md` 2.3절 |
| 11 | 저자 확인, unverified만 남으면 `reviewed` | 8.6 | `qa-checklist.md` 5장, `caption-alt.md` 4.3절 |
| 12 | 색약 미리보기는 제1, 제2색약만 | 6.11 | `qa-checklist.md` 2.2절 |
| 13 | Mermaid TB 한 행 상자 3개 상한 | 5.12 | (이미 `mermaid-guide.md` 6장과 같음) |
| 14 | 8.8절 보기 1, 2를 승인 시안 값으로 | 8.8 | 없음 |
| 15 | 히트맵은 ink 계조 + 메시지 칸 accent | 6.4 | `chart-guide.md` 4.6절 |
| 16 | 가정값 표시는 칩마다(현행 유지) | 6.5 | 없음 |
| 17 | 로그 축 막대는 최솟값보다 눈금 하나 아래부터 | 9.7 | `chart-guide.md` 4.3절 |
| 18 | 1-9-6 세 칸 면은 토큰 3색 tint | 2.6 | `patterns.md` 8장 |
| 19 | 집합 그림은 겹치는 직각 상자 | 5.6 | `patterns.md` P13 |
| 20 | 사다리 외곽 2.5px(현행 유지) | 5.5 | 없음 |

설계서 결정 반영: `choose-type.md` 3.1절 3-1-5를 D3 척추 그림으로 확정(D2). 부록 A의 설계서 집계표 열을 명세 행과 일치 상태로 갱신(D1).

### 남은 대기 항목

- 2-11-5(세 집합) 상자 치수, 3-12-6 3부작 사슬의 요약 틀, 맺음말 3-E-1 그림 위치, 앞부분과 부록 그림 ID.
- references의 시안 밖 치수와 기본안 "제안" 표시(`patterns.md`, `chart-guide.md` 데이터 규칙, `choose-type.md` 3.4절 고치기 횟수 등)는 이번 결정과 무관해 그대로 둡니다.

## 2026-10-14 references 사이 차이 정리

초안의 "저자 확인 대기" 1~5와 표기 하나를 아래처럼 정했습니다. SKILL.md 6장 끝의 차이 표는 남은 차이가 없어 뺐어요.

| # | 결정 | 고친 곳 |
|---|---|---|
| 1 | alt는 5단계에서 초안을 desc에 넣어 저장하고, 시각 검수 뒤 8단계에서 확정해 소스에 옮겨 다시 빌드합니다. SVG `<desc>`와 `figures.yml`의 `alt`는 글자 단위로 같게 둡니다 | `caption-alt.md` 6.1절 3, 5번, `svg-guide.md` 12장 오류표, `SKILL.md` 5, 8단계 |
| 2 | T 그림의 세로 변형도 `choose-type.md` 5장 필요 여부로 정합니다(필요할 때만 `manual`, 나머지 `none`) | `svg-guide.md` 9장 |
| 3 | 미리보기 PNG는 `_render/qa/`(원고 밖은 `${TMPDIR:-/tmp}/figqa`)에만 만듭니다 | `mermaid-guide.md` 1장, 11장 명령 5 |
| 4 | Mermaid 간격은 설정으로 맞추지 않습니다. ELK가 `rankSpacing`, `nodeSpacing`을 무시하고 40으로 배치합니다 | `patterns.md` P1 |
| 5 | 출력 SVG 검사의 정본은 `figkit.py lint`입니다. 손 명령은 소스 금지 기호와 미리보기만 남겼습니다(명령 1~3) | `design-rules.md` 12장, `qa-checklist.md` 2.3절 명령 번호 |
| 6 | 판단 흐름의 "아니오"를 "아니요"로 | `choose-type.md` 4장 |

## 2026-10-14 초안

docs/tasks.md 3.4절의 첫 판입니다. 저자 검토(👤 스킬 초안 검토) 전이라 아래 대기 항목이 남아 있습니다.

### 만든 것

| 파일 | 내용 |
|---|---|
| `SKILL.md` | 0~9단계 절차(작업 판정, 입력 읽기, 메시지 한 문장, 종류 확인, 패턴과 스케치, 소스 작성, 렌더링과 lint, 시각 검수, 캡션과 alt, figures.yml과 보고), 단계별 reference 표, 세련됨 원칙 5개, 출력 파일, 하지 않는 일, 막혔을 때 |
| `references/design-rules.md` | 도구 공통 디자인 규칙, 세련됨 판정 기준 12가지(시안 실측), 금지 사항, 렌더링 전 점검 |
| `references/choose-type.md` | M, S, C, T 선택, D3 재작도 기준과 Mermaid 측정 신호, 세로 변형 판단, 파일 이름과 위치, 설계서 그림 집계 |
| `references/patterns.md` | 레이아웃 패턴 16개와 기타, 236개 그림 분류(부록 A), 패턴별 격자 치수와 와이어프레임, 표지 안쪽 세트 공통 틀 |
| `references/mermaid-guide.md` | 렌더링 파이프라인, 머리 주석, 클래스, 노드 문구 상한, LR과 TB, 배치 보정 요령, 경고 대처표 |
| `references/svg-guide.md` | figkit 기반 build 스크립트 골격과 최소 예제, 격자, 부품, 로봇과 데모, table.py, 세로 변형, 글자 처리, lint 오류표 |
| `references/chart-guide.md` | figlib 스크립트 골격, 함수 지도, 차트 종류별 서식, 데이터 규칙, 예제 1-8-6 |
| `references/caption-alt.md` | 캡션, 대체 텍스트, 출처 줄, 🔄 기준일, figures.yml 항목 채우기, 점검 명령 |
| `references/qa-checklist.md` | 미리보기 묶음(컬러, 흑백, 색약, 휴대폰 폭, 다크 카드), 점검표 Q1~Q27, 세련됨 최종 판정, 판정 등급과 검수 기록 |
| `assets/svg-parts/_build/figkit.py` | S 그림 공통 그리기 모듈과 SVG lint(격자, 글자 넘침과 겹침, 금지 기호, 팔레트 밖 색, 최소 글자 크기). 자기 시험 `test_figkit.py` |

### 저자 확인 대기

references 사이의 차이(위 "references 사이 차이 정리"에서 모두 정함)
1. alt 확정 시점: `caption-alt.md` 6.1절은 렌더링 뒤, `svg-guide.md` 12장은 desc를 먼저 확정하라고 안내합니다. figkit은 desc 없이 저장하지 않아요.
2. T 그림 세로 변형: `choose-type.md` 5장은 필요할 때만, `svg-guide.md` 9장은 T 전부라고 적었습니다.
3. 미리보기 위치: `qa-checklist.md` 2.3절은 `_render/qa/`만, `mermaid-guide.md` 1장 명령 예는 소스 옆 `X.png`를 만듭니다.
4. Mermaid 간격: `patterns.md` P1은 rankSpacing 48, nodeSpacing 32를 적었습니다. `mermaid-guide.md` 8.7절은 ELK 간격 40 고정입니다.
5. 렌더링 전 점검: `design-rules.md` 12장은 figkit lint를 "작성 예정"으로 적었지만 이미 있습니다.

각 references 문서에 "제안"으로 표시한 항목
- `choose-type.md`: 설계서 장별 집계표의 M, S 수와 명세 행의 차이, 제안 6건
- `design-rules.md`: 판정 기준 제안 3건, 열 머리 글자색
- `patterns.md`: 시안 밖 치수 전부, 1-9-6 단계 면 색, 3-12-6을 요약 표 틀에 담는 방법
- `mermaid-guide.md`: 파일별 init 금지, 1-4-3 `note` 갱신
- `svg-guide.md`: 부품 기호를 defs에 복사하는 방식(외부 참조 대신)
- `chart-guide.md`: 히트맵 척도, 가정값 칩 표기, 로그 막대 시작점
- `caption-alt.md`: style-guide 8.8절 보기 갱신과 제안 4건(이미지 줄 분담 포함)
- `qa-checklist.md`: 미리보기 PNG 위치, 저자 확인이 남은 그림의 `status` 규칙

그 밖에
- `docs/figures.yml`이 아직 없습니다(tasks.md 4.6절). 그 전에는 항목을 어디에 둘지 묻도록 적었습니다.
- 평가 사례 4건(`evals/`)은 아직 없습니다.
