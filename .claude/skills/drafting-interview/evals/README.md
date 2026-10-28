# drafting-interview 평가 사례

tasks.md 3.5절 `drafting-interview`의 평가 사례 3건입니다. 스킬의 세 단계(A 질문, B 칼럼, C 대체)를 하나씩 시험해요.

| id | 사례 | 파일 | 시험하는 것 |
|---|---|---|---|
| 1 | 1권 4장 인터뷰 질문 3개 | `case-1-4-questions.md` | A단계: 서식, 역할 배치, 열린 질문, 답 칸 비우기 |
| 2 | 2권 3장 저자 답을 칼럼으로 | `case-2-3-generalize.md` | B단계: 일반화 규칙 G1~G18, 근거 주석, 지어내지 않기, 날 답은 `_private`에 두고 커밋 파일은 깨끗하게 |
| 3 | 3권 6장 답 없음, 현장 들여다보기 | `case-3-6-look-inside.md` | C단계: 저자 결정 확인, 출처 없을 때 멈추기, 지어낸 키 없음 |

판정 문장은 48개입니다(자동 33, 사람 15).

## 파일 구성

- `evals.json`: skill-creator 형식입니다. 필드는 `writing-chapter/evals`와 같이 `skill_name`, `evals[].id`, `prompt`, `expected_output`, `files`, `expectations`를 써요. `files` 경로는 스킬 폴더 기준 상대 경로입니다.
- `case-*.md`: 사례마다 고른 이유, 과제 프롬프트, 입력 파일, 기대 산출물, 판정 표, 실패 예, 설계서 확인 메모를 담습니다. `expectations` 머리의 ID(F1, B3, L7 등)가 판정 표의 # 열과 같습니다.
- `fixtures/`: 사례 2, 3의 고정 입력입니다. 저장소의 실제 장 폴더는 아직 골격뿐이라 박스 자리 표시와 답 칸을 갖춘 사본을 따로 둡니다. `fixtures/_private/interviews/vol2-ch03.md`는 사례 2의 날 답 fixture예요. 실제 날 답은 저장소 루트 `_private/`(git 제외)에만 두지만, 이 파일은 가상의 연습용 답변이라 커밋해 둡니다. 루트 기준 규칙 `/_private/`는 이 경로를 무시하지 않습니다.

사례 2의 답은 모두 **가상의 연습용 답변**입니다. 저자의 실제 경험이 아니고, 고유명사와 숫자도 지어낸 값이에요. 결과물을 저장소 `vol2-agent/ch03/`나 루트 `_private/`로 옮기지 않습니다.

## 실행 방법

skill-creator의 "Running and evaluating test cases" 절차를 그대로 씁니다. `writing-chapter/evals/README.md`의 실행 방법과 같은 틀이에요.

1. 작업 폴더를 스킬 폴더 옆에 둡니다: `.claude/skills/drafting-interview-workspace/iteration-1/`.
2. 사례마다 하위 에이전트 둘을 같은 차례에 띄웁니다. 하나는 스킬 경로를 주고(`with_skill`), 하나는 주지 않습니다(`without_skill`). 과제는 `evals.json`의 `prompt` 그대로예요.
3. 실행 전에 입력을 `outputs/`로 복사하고, 실행 지시에 이 한 줄을 덧붙입니다: "저장소의 장 폴더를 고치지 말고 `outputs/` 아래 같은 상대 경로의 사본만 고쳐라."
   - 사례 1: `vol1-llm/ch04/interview.md`, `index.md`를 `outputs/vol1-llm/ch04/`로
   - 사례 2: `fixtures/vol2-agent/ch03/*`를 `outputs/vol2-agent/ch03/`로, `fixtures/_private/interviews/vol2-ch03.md`를 `outputs/_private/interviews/`로. 저장소 루트 `.gitignore`에 `/_private/`가 있는지 먼저 확인합니다
   - 사례 3: `fixtures/vol3-physical-ai/ch06/*`를 `outputs/vol3-physical-ai/ch06/`로
4. 실행마다 `eval_metadata.json`의 `assertions`에 `expectations`를 옮기고, 끝난 실행의 `total_tokens`, `duration_ms`를 `timing.json`에 적습니다.
5. `[자동]` 항목은 아래 명령으로 먼저 판정하고, `[사람]` 항목은 grader(skill-creator `agents/grader.md`)가 읽어서 판정합니다. `grading.json` 필드는 `text`, `passed`, `evidence`입니다.
6. 실패 원인을 지시 부족, 예시 부족, 검사 누락으로 나눠 스킬을 고치고 `CHANGELOG.md`에 적은 뒤 `iteration-2/`로 다시 돌립니다.

사례 1의 사람 판정 결과가 좋으면 그 `interview.md`를 저자에게 보여 주고, 저자가 승인하면 실제 `vol1-llm/ch04/interview.md`의 질문으로 씁니다(tasks.md 5장 "저자 인터뷰 질문 3개"). 사례 2, 3의 결과물은 쓰지 않고 버립니다.

## 자동 판정 명령

금지 기호(S01)와 일반화 후보(S33)는 `.venv/bin/python scripts/style_check.py "$D/index.md"`로 먼저 봅니다. 아래 블록은 사례별 판정과, 스크립트를 못 쓸 때의 예비 명령입니다. 후보를 뽑는 수준이라 결과를 한 번 눈으로 확인해요.

```bash
O=.claude/skills/drafting-interview-workspace/iteration-1/eval-2/with_skill/outputs
D=$O/vol2-agent/ch03          # 사례 1은 vol1-llm/ch04, 사례 3은 vol3-physical-ai/ch06
BOX="${TMPDIR:-/tmp}/box-field.md"
awk '/^::: \{\.box-field\}/{p=1} p{print} p&&/^:::$/{exit}' "$D/index.md" > "$BOX"

# 공통 S1: 금지 기호 7종(문장 부호 U+2013, 나열 U+2022는 문맥 확인)
grep -nP '[\x{2014}\x{2015}\x{2013}\x{00B7}\x{318D}\x{30FB}\x{2022}]' "$D/interview.md" "$BOX"

# 사례 1 F4, 사례 3 L8: 질문 수(3이어야 함)
grep -cE '^## 질문 [1-3]\. ' "$D/interview.md"

# F5, L8: 답 칸이 비었는지. 주석과 빈 줄을 뺀 줄이 나오면 실패
awk '/^### 답/{p=1;next} /^## /{p=0} p&&!/^<!--/&&!/^[[:space:]]*$/' "$D/interview.md"

# Q1, Q2, Q3: 질문 문장 검사
grep -E '^## 질문 [1-3]\. ' "$D/interview.md" | sed -E 's/^## 질문 [1-3]\. //' | python3 -c '
import sys,re
for q in sys.stdin:
    q=q.strip()
    bad=[]
    if len(q)>100: bad.append("100자 초과")
    if not q.endswith("?"): bad.append("물음표 없음")
    if re.search(r"(있나요|있으신가요|맞나요|죠)\?$",q): bad.append("예/아니요 또는 유도")
    if re.search(r"얼마|몇 명|몇 번|어느 회사",q): bad.append("수치나 이름 요구")
    print("OK " if not bad else "NG ", q[:40], bad)'

# 사례 2 B1, B14: 남으면 안 되는 문자열(박스와 interview.md 모두 0이어야 함)
for W in 가나다 품질팀 하늘 다모아 라마 1억 2천만 2024 2019 2021 2023 7개월 3월 4,300 4300 62 91 % 퍼센트 "김 부장" 부장님 해지 15년 "년 차"; do
  printf "%-8s 박스 %s, interview.md %s\n" "$W" "$(grep -cF -- "$W" "$BOX")" "$(grep -cF -- "$W" "$D/interview.md")"; done

# 사례 2 B17: 날 답 파일이 그대로인지(출력 없어야 함)
diff .claude/skills/drafting-interview/evals/fixtures/_private/interviews/vol2-ch03.md "$O/_private/interviews/vol2-ch03.md"

# 사례 2 B18: 답 칸 3개의 머리와 번호 항목 수(5, 7, 3이어야 함)
awk '/^### 답/{n++; a=1; h=1; next} /^## /{a=0} a&&h&&NF{print "Q" n " 머리: " $0; h=0} a&&/^[0-9]+\. /{c[n]++} END{print "항목 수:", c[1]+0, c[2]+0, c[3]+0}' "$D/interview.md"

# B3: 문단 수와 근거 주석 수(근거 주석 수 = 문단 수, 2~5)
grep -c '<!-- 근거: Q' "$BOX"

# B10, L6: 1인칭과 저자 3인칭
grep -nE '저희|우리 (회사|팀)' "$BOX"                                   # 사례 2
grep -nE '(^|[^가-힣])(제가|저는|저희|우리 팀|저자는|저자가)' "$BOX"     # 사례 3

# L3, L5: 지어낸 키와 특정 이름(사례 3, 0줄이어야 함)
grep -n '\[@' "$BOX"
grep -nE 'RT-1|RT-2|Figure|Optimus|Tesla|Helix|π0|GR00T|1X|Atlas' "$BOX" "$D/interview.md"

# B13, L7: 상태 칸
grep -nE '^\| 상태 \|' "$D/interview.md"

# B15, L11, L12: 박스 밖과 references.yml이 fixture와 같은지(diff 출력이 박스 줄뿐이어야 함)
F=.claude/skills/drafting-interview/evals/fixtures/vol2-agent/ch03
diff <(awk '/^::: \{\.box-field\}/{s=1} !s{print} s&&/^:::$/{s=0}' "$F/index.md") \
     <(awk '/^::: \{\.box-field\}/{s=1} !s{print} s&&/^:::$/{s=0}' "$D/index.md")
```

해요체 비율(B11)은 `writing-chapter/references/style-rules.md` 9장 명령 6을 `F="$BOX"`로 돌립니다. 박스는 30문장 미만이라 비율은 참고값으로 기록하고, 5~40% 밖이면 사람 판정으로 넘깁니다.

macOS 기본 grep은 `-P`가 없을 수 있습니다. 없으면 S1은 `python3 -c` 한 줄로 같은 문자 집합을 셉니다.
