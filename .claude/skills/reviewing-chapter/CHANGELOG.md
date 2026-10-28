# reviewing-chapter 변경 기록

스킬 문서와 평가 사례의 변경을 날짜순으로 적습니다. 새 항목은 위에 붙여요.

## 2026-10-17 1권 4장 기준 샘플 반영 (tasks.md 5장 3단계)

근거는 `vol1-llm/ch04/review/`의 reviewer, reader R1, R2 보고서("설계서와 기준에 대한 제안", "확인 필요 사항")와 오케스트레이터가 본 운영 문제입니다. 반영하지 않은 항목은 `docs/skill-trial-3.8.md` 7.1절에 있어요.

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| 확인 검수는 reader를 먼저 끝내고 reviewer가 그 보고서로 M1을 판정. 동시에 돌렸으면 메인 에이전트가 reader 보고서의 닫힘 기록으로 M1을 닫고 `notes.md`에 한 줄 | `SKILL.md` 4장, `verdict-rules.md` 3.6절 | reviewer-r1 1장("M1 미확인"), reviewer-r2 1장("통과 (M1 미확인)")과 7장 제안 3 | 지시 부족 |
| 메인 에이전트용 호출 문구 예(reader, reviewer). reader 문구에 "읽기 경로는 `reader-profile.md` 1.1절을 따름" | `SKILL.md` 4장 | reader-r1 머리(요청이 P3 경로를 1~3장으로 넓힘) | 예시 부족 |
| 요청이 다른 읽기 경로를 주면 스킬 경로를 따르고 보고서 머리에 다른 점 한 줄. 확인 검수면 머리에 최상 절 막힘 닫힘 줄 | `SKILL.md` 6장 3단계, `reader-report.md` 3장 뼈대 | reader-r1 머리와 7장 | 지시 부족 |
| 5장 기각 조건에서 "읽기 경로 밖"을 뺌. 3.6절(기각 불가)과 어긋났고, 경로 밖 장은 writer가 한 문장 상기를 해야 하는 자리(self-check B12) | `verdict-rules.md` 5장 | reader-r1 7장(3.6절과 5장이 달라 reviewer 판단 필요) | 지시 부족 |
| 논문 설정값 기준: claim에 있는 설정값과 관계식은 지적 대상 아님, 그 값으로 만든 새 계산은 중대. 인용 키가 있어도 그 자리 claim이 받치지 않으면 출처 누락, 주장이 claim보다 세면 치명 | `verdict-rules.md` 2.3절, `reviewer-report.md` 3장 F 축 | reviewer-r1 7장 제안 5, reviewer-r2 7장 제안 1, R1-F01, R1-F08 | 지시 부족 |
| C 축 분량 행을 보정 완료 기준(장 ±10%, 절은 +30% 후보만)으로, 출처 행에 writer 점검 G9 | `reviewer-report.md` 2장 | writing-chapter 같은 날 항목 | 지시 부족 |
| `notes.md`는 검수자가 읽기만 하고, 다른 역할도 덧붙이기만 한다는 줄 | `SKILL.md` 9장 | 오케스트레이터(노트 덮어쓰기로 절 개요 사라짐) | 지시 부족 |

판단 메모
- 문턱값은 그대로 둡니다. 4장은 R1 치명 1, 중대 4(수정 후 통과), R2 치명 0, 중대 0(통과)로 재작성 문턱에 가까운 축이 없었습니다(`verdict-rules.md` 8장에 기록).
- evals는 바뀐 문구에 기대지 않아 고치지 않았습니다.

## 2026-10-15 검사 스크립트 완성 반영 (tasks.md 3.7절)

- `SKILL.md` 5장 입력 표와 7장 2단계의 자동 검사를 `bash scripts/check_chapter.sh`로 바꾸고, `self-check.md` 명령은 스크립트를 못 쓸 때의 예비로 낮췄습니다. G 축은 `figure_qa.py --sheet`로 PNG를 다시 만듭니다.
- `reviewer-report.md` 머리 "검사 수단" 칸은 `check_chapter.sh` 출력 끝 한 줄(style_check, check_canon, check_figures, verify_examples, check_references, page_estimate)을 그대로 붙이도록 바꾸고 채운 예도 고쳤습니다.

## 2026-10-15 저자 확정 반영

첫 초안의 "저자 확인 대기" 세 항목과 추가 권고 다섯 가지를 저자가 기본값 그대로 승인해 반영했습니다.

| 결정 | 반영한 곳 |
|---|---|
| 보고서 위치 `vol*/chNN/review/reviewer-r{N}.md`, `reader-r{N}.md`(절 검수는 `-s6.5`), 빌드 제외로 확정 | `SKILL.md` 9장, `reviewer-report.md` 1장, `reader-report.md` 4장의 "저자 확인 대기" 표시 삭제 |
| 문턱값 확정: 치명 5개(절 검수 3개), 한 절 치명과 중대 8개, 최상 절 막힘 3개, 장 전체 막힘 15개. 3.8절 시험 운전에서 다시 맞출 수 있는 확정 초기값 | `verdict-rules.md` 8장 표, `SKILL.md` 8장 |
| 최상 개념 절 "막힘 0"을 장 완료 조건으로 확정. 막힘이 남으면 최소 수정 후 통과, 닫힐 때까지 통과 불가 | `verdict-rules.md` 3.3, 3.4, 3.6절(M1 신설), 4장, 5장, 6장. `SKILL.md` 7장 8단계와 8장 표. `reviewer-report.md` 판정 표에 M1 칸, `reader-report.md` 판정 표에 최상 절 막힘 행. 평가 사례 3 기대표에 M1 행 |
| 두 축에 걸치는 지적은 주 축 한 곳에서만 세고 다른 축은 "→ ID 참조" 행으로 가리킴 | `verdict-rules.md` 2.4절 신설(주 축 순서 L, F, G, U, S, C), `reviewer-report.md` 2장 |
| 결함 없는 대조군 사례 추가 | `evals/case-4-vol2-6.5-clean.md`, `fixtures/case4-clean-vol2-6.5.md`, `evals.json` id 5(치명이나 중대가 하나라도 나오면 실패), `evals/README.md` |
| `docs/reader-profile.md` 9.3절 표시 형식에 지적 ID 머리(`R1-P1-04`)와 "같이 걸림" 표기 추가 | 9.3절만 고침. `reader-report.md` 3장은 9.3절을 그대로 따른다고 고침 |
| writer가 검수 반영 기록 서식을 찾아가도록 한 줄 추가 | `writing-chapter/SKILL.md` 7단계 |

판단 메모
- M1의 기각은 원고 안 정의나 참조 위치를 댈 수 있을 때만 닫힌 것으로 보고, 최상 절 막힘을 닫을 때는 reader가 같은 페르소나로 다시 읽도록 했습니다. reviewer 혼자 닫으면 "막힘 0"이 자기 확인이 되기 때문이에요.
- 대조군 원고는 사례 1 R2 판에서 직역투 한 문장을 고치고, 100자 넘는 문장을 나누고, 해요체 두 문장을 습니다체로 바꿔 만들었습니다(해요체 18.8%).
- 교차 참조 행은 ID 칸을 화살표로 시작하게 해서 `evals/README.md`의 ID 중복 검사와 부딪치지 않게 했습니다.

## 2026-10-15 첫 초안

tasks.md 3.5절 보조 스킬 항목 2 "`reviewing-chapter`"의 첫 초안입니다.

| 파일 | 내용 |
|---|---|
| `SKILL.md` | reviewer 모드와 reader 모드, 독립성 규칙, 흐름도, 입력표, 모드별 절차, 판정 등급 요약, 출력 파일, 하지 않는 일 |
| `references/verdict-rules.md` | 지적 ID 꼴, 심각도 3단계(치명, 중대, 경미)와 꼬리표(보고, 저자 확인), 수정 범위 3단계, 재작성 조건 W1~W5, reader 읽기 판정, reader 결과를 U 축에 합치는 변환표, 회차와 확인 검수, writer 반영 기록 서식 |
| `references/reviewer-report.md` | 보고서 뼈대, C 축 완료 기준표(1권 13장, 2권 14장, 3권 15장과 self-check ID 대응), F, U, S, L, G 축 점검표, 채운 보기(1권 4.2절 가정) |
| `references/reader-report.md` | reader가 들고 읽는 것과 들지 않는 것, 읽는 순서, 9.3절 표시 형식에 ID를 더한 지적 꼴, 보고서 뼈대, 채운 보기(3권 7.3절 가정) |
| `evals/` | 사례 3건, 실행 4개(판정 문장 46개, 자동 13, 사람 33), 시험 원고 4개 |

기존 스킬과 맞춘 점
- 작성자 점검 ID(`writing-chapter/references/self-check.md` A1~J4)를 C 축 표에 대응시켜, 같은 기준을 두 번 쓰지 않고 가리키기만 했습니다.
- 그림은 `making-figures/references/qa-checklist.md` 6장 reviewer 방식을 그대로 쓰고, Q 번호로 심각도만 연결했습니다.
- reader 표시 형식은 `docs/reader-profile.md` 9.3절을 정본으로 두고 ID만 덧붙였습니다.

### 저자 확인 대기 (2026-10-15 모두 확정, 위 항목 참고)

- 보고서 저장 위치 `vol*/chNN/review/`(빌드 제외)와 파일 이름 규칙. CLAUDE.md 3장 구조도에 없는 폴더예요.
- 판정 문턱값(치명 5개, 절 검수 3개, 한 절 8개, 최상 절 막힘 3개, 장 전체 막힘 15개)은 시험 운전 전 초기값입니다.
- 최상 개념 절 "막힘 0"을 완료 조건으로 올릴지(`reader-profile.md` 10.1절 제안). 이 초안은 수정 후 통과 조건으로만 반영했습니다.
