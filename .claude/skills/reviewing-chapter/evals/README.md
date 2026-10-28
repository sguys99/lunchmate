# reviewing-chapter 평가 사례

tasks.md 3.5절 보조 스킬 `reviewing-chapter`의 평가 사례 4건, 실행 5개입니다. 3.8절 "스킬 시험 운전"에서 writing-chapter, making-figures 사례와 함께 돌려 스킬을 고칩니다.

| id | 사례 | 모드 | 파일 | 시험하는 것 | 기대 판정 |
|---|---|---|---|---|---|
| 1 | 2권 6.5절 R1 | reviewer | `case-1-vol2-6.5.md` | 정본 밖 숫자, 가정 표지 누락, 뒤 장 약어, alt 누락, 직역투. 오탐 억제 | 수정 후 통과 |
| 2 | 2권 6.5절 R2 | reviewer 확인 검수 | 같은 파일 5장 | 지적 ID 승계, 닫힘 판정, 새 ID, 확인 범위 | 통과 |
| 3 | 2권 11.5~11.6절 | reviewer | `case-2-vol2-11-security.md` | 서술 수위의 범위 "절" 판정, F와 L 축 분리, 제품 이름 위치 | 재작성 |
| 4 | 3권 7.3절 | reader | `case-3-vol3-7.3-reader.md` | 페르소나별 읽기, 9.3절 형식, 중복 제거 집계, 사실 판정 금지 | 수정 후 통과(읽기 판정) |
| 5 | 2권 6.5절 대조군 | reviewer | `case-4-vol2-6.5-clean.md` | 결함 없는 원고에서 오탐 억제. 치명이나 중대가 하나라도 나오면 실패 | 통과 |

세 등급(통과, 수정 후 통과, 재작성)이 모두 한 번 이상 나오도록 골랐습니다. id 5는 결함을 심지 않은 대조군이에요. id 1과 같은 절, 같은 프롬프트라서 결함이 있는 판과 없는 판의 결과를 나란히 비교할 수 있고, 지적을 많이 낼수록 점수가 오르는 쏠림을 막습니다.

## 파일 구성

- `evals.json`: skill-creator 형식입니다. 필드는 `skill_name`, `evals[].id`, `prompt`, `expected_output`, `files`, `expectations`이고, 형식은 writing-chapter와 making-figures의 `evals/`와 같아요. `files` 경로는 스킬 폴더 기준 상대 경로입니다.
- `case-*.md`: 사례마다 고른 이유, 프롬프트, 입력, 정답표(심은 결함의 축, 심각도, 범위, 근거, 허용 범위), 오탐으로 판정할 예를 담습니다. `expectations` 머리의 K1, X1 같은 번호가 정답표 행과 이어져요.
- `fixtures/`: 결함을 일부러 심은 시험 원고와 결함 없는 대조군(`case4-clean-vol2-6.5.md`)입니다. 실제 원고가 아니므로 `vol*/` 폴더에 옮기지 않습니다. 첫 줄 주석에 정답표 위치가 있지만, 검수 실행에는 주석을 지운 사본을 넘깁니다(아래 3번).
- `[자동]`은 grep이나 python 한 줄로 판정하는 항목, `[사람]`은 grader가 보고서를 읽고 판정하는 항목입니다.

## 실행 방법 (3.8절)

skill-creator의 "Running and evaluating test cases" 절차를 따릅니다.

1. 작업 폴더를 스킬 폴더 옆에 둡니다: `.claude/skills/reviewing-chapter-workspace/iteration-1/`.
2. 실행마다 하위 에이전트 둘을 같은 차례에 띄웁니다. 하나는 스킬 경로를 주고(`with_skill`), 하나는 주지 않습니다(`without_skill`). 과제는 `evals.json`의 `prompt` 그대로예요.
3. 시험 원고는 머리 주석 두세 줄(정답표 위치)을 지운 사본을 `outputs/input/`에 두고 그 경로를 넘깁니다. 정답표를 보고 검수하면 시험이 되지 않기 때문입니다.
4. 실행 지시에 이 한 줄을 덧붙입니다: "보고서는 원고 폴더가 아니라 `outputs/` 아래 `vol2-agent/ch06/review/reviewer-r1-s6.5.md`처럼 같은 상대 경로로 저장하라."
5. id 2는 id 1의 `with_skill` 출력이 있어야 돌릴 수 있습니다. 반영 기록 표의 괄호를 id 1 보고서의 실제 ID로 바꿔 프롬프트에 붙여요. id 1에서 K1~K5를 다 찾지 못했으면 찾은 ID만 넣고, 그 사실을 `grading.json`에 남깁니다.
6. 독립성 조건 때문에 검수 실행은 시험 원고를 만든 대화와 다른 실행이어야 합니다. 이 폴더의 시험 원고는 사람이 만든 고정 입력이라 문제없지만, 3.8절에서 writing-chapter가 쓴 시험 원고를 검수할 때는 그 원고를 쓴 실행에 이 스킬을 돌리지 않아요.
7. 채점은 skill-creator의 `agents/grader.md`를 따르고 `grading.json` 필드는 `text`, `passed`, `evidence`입니다. `[자동]` 항목은 아래 명령으로 먼저 판정합니다.
8. 실패 원인을 지시 부족, 예시 부족, 규칙 문턱 문제로 나눠 스킬을 고치고 `CHANGELOG.md`에 적은 뒤 `iteration-2/`로 다시 돌립니다. 문턱 문제(예: 막힘 3개 기준이 너무 엄격함)는 `verdict-rules.md` 8장대로 숫자를 고쳐요.

## 자동 판정 명령

```bash
O=.claude/skills/reviewing-chapter-workspace/iteration-1/eval-1/with_skill/outputs
R=$(ls $O/vol2-agent/ch06/review/reviewer-r1*.md | head -1)

# O1 금지 기호 7종 (출력 0줄이면 통과. 문장 부호 U+2013과 나열 U+2022 포함)
python3 -c 'import sys
for i,l in enumerate(open(sys.argv[1],encoding="utf-8"),1):
    if any(chr(c) in l for c in (0x2014,0x2015,0x2013,0xB7,0x318D,0x30FB,0x2022)): print(i, l.strip()[:60])' "$R"

# O3 reviewer ID 꼴과 중복 (첫 줄 0이면 꼴 통과, 둘째 출력이 없으면 중복 없음)
grep -oE 'R[0-9]+-[A-Z][A-Z0-9-]*[0-9]{2}' "$R" | grep -cvE '^R1-[CFUSLG][0-9]{2}$|^R1-P[123]-[0-9]{2}$'
grep -oE '^\| R1-[CFUSLG][0-9]{2} ' "$R" | sort | uniq -d

# V2, V1, R5 장 판정 줄
grep -n '장 판정' "$R"

# id 5 대조군: FP1 치명, 중대 행 (출력이 0이면 통과)
C=$(ls .claude/skills/reviewing-chapter-workspace/iteration-1/eval-5/with_skill/outputs/vol2-agent/ch06/review/reviewer-r1*.md | head -1)
grep -cE '^\| R1-[A-Z0-9-]+ \|[^|]*\| (치명|중대) \|' "$C"
grep -n '장 판정' "$C"

# id 4 reader: B1 사실 판정 낱말 (출력 0줄이면 통과)
D=$(ls .claude/skills/reviewing-chapter-workspace/iteration-1/eval-4/with_skill/outputs/vol3-physical-ai/ch07/review/reader-r1*.md | head -1)
grep -nE '틀렸|오류|정본|치명' "$D"

# id 4 reader: O2 지적 머리 꼴
grep -cE '^R1-P[123]-[0-9]{2} \[P[123]-[^]-]+-(막힘|걸림|의문)\]' "$D"
```

macOS 기본 grep에는 `-P`가 없고 기본 bash는 유니코드 이스케이프를 풀지 못해서, 금지 기호 검사는 python3 한 줄로 씁니다.
