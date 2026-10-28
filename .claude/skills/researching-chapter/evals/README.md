# researching-chapter 평가 사례

tasks.md 3.5절 보조 스킬의 평가 사례 3건입니다. 3.8절 "스킬 시험 운전" 방식으로 돌려 스킬을 고쳐요.

| id | 사례 | 파일 | 시험하는 것 |
|---|---|---|---|
| 1 | 1권 4장 장 리서치 | `case-1-4-sources.md` | 서지 마스터와 장 파일 나누기, 상태 기호를 `check`로 옮기기, 학회와 arXiv 연도, 해설 자료, 키 없는 사례 후보, 🔄 행 없는 장 |
| 2 | 2권 7장 🔄 재확인 | `case-2-7-refresh.md` | 대상 행 고르기, 제안 카드 서식, 관리표 직접 수정 금지, 2차 자료 처리 |
| 3 | 3권 12장 사례 박스 수치 | `case-3-12-press-numbers.md` | 우선순위(보고서, 회사 발표, 보도), 언론 숫자 교차 확인, 가정값과 출처 구분 |

세 사례 모두 실제 리서치 결과(어떤 판이 최신인지, 수치가 맞는지)는 판정하지 않습니다. 그 답은 실행 시점의 원문에 달려 있고, 최종 확인은 사람의 몫이기 때문이에요. 판정하는 것은 절차, 서식, 경계입니다.

## 파일 구성

- `evals.json`: skill-creator 형식(`.claude/skills/skill-creator/references/schemas.md`)입니다. 필드는 `skill_name`, `evals[].id`, `prompt`, `expected_output`, `files`, `expectations`이고, `files`는 스킬 폴더 기준 상대 경로예요.
- `case-*.md`: 사례마다 과제 프롬프트, 입력 파일, 기대 결과, 실패 예, 설계서 확인 메모를 담습니다. `expectations` 문장 머리의 항목 번호(Y1, K3 등)가 사례 파일 표의 번호와 같습니다.
- `[자동]`은 명령으로 판정할 항목, `[사람]`은 grader가 읽고 판정할 항목입니다.

## 실행 방법

1. 작업 폴더: `.claude/skills/researching-chapter-workspace/iteration-1/`.
2. 사례마다 하위 에이전트 둘을 같은 차례에 띄웁니다. 하나는 스킬 경로를 주고(`with_skill`), 하나는 주지 않습니다(`without_skill`).
3. 실행 전에 저장소의 `docs/references-master.yml`을 `outputs/docs/references-master.yml`로 복사해 둡니다. 실행 지시에 덧붙일 줄: "저장소의 파일을 고치지 말고, 같은 상대 경로(`docs/references-master.yml`, `vol1-llm/ch04/references.yml`, `notes.md`)로 `outputs/` 아래에 저장하라. 서지 마스터는 `outputs/docs/references-master.yml`을 고쳐라. 웹 검색과 페이지 열기 도구를 쓸 수 있으면 쓰고, 연 주소를 실행 기록에 남겨라." 리서치 결과가 사람 확인 전에 장 폴더에 섞이지 않게 하려는 것입니다.
4. 실행 전에 `docs/`와 대상 장 폴더의 체크섬을 저장합니다(아래 명령). 경계 항목(B1, Y3)의 판정 기준이에요.
5. 채점은 skill-creator의 `agents/grader.md`를 따르고, `grading.json` 필드는 `text`, `passed`, `evidence`입니다. 사람 항목 가운데 "열어 본 흔적"을 묻는 것(사례 1의 C2, C4)은 실행 기록의 도구 호출로 판정합니다.
6. 실패 원인을 지시 부족, 예시 부족, 검사 누락으로 나눠 스킬을 고치고 `CHANGELOG.md`에 적은 뒤 `iteration-2/`로 다시 돌립니다.

## 판정 명령

```bash
O=.claude/skills/researching-chapter-workspace/iteration-1/eval-1/with_skill/outputs
M=$O/docs/references-master.yml
F=$O/vol1-llm/ch04/references.yml
N=$O/vol1-llm/ch04/notes.md

# 실행 전: 바뀌면 안 되는 파일의 체크섬
shasum docs/*.md docs/references-master.yml vol1-llm/ch04/index.md > "${TMPDIR:-/tmp}/before.sha"
# 실행 뒤: 출력 0줄이면 통과(저장소 파일이 바뀌지 않음)
shasum -c "${TMPDIR:-/tmp}/before.sha" | grep -v ': OK$'

# Y1, Y5 서식 점검과 K1 키 대조: 설계서와 산출물을 임시 루트에 모아 check_references.py로 한 번에
#   요약 끝 OK(오류 0), REF-D01(빠짐)과 REF-C03(마스터에 없음) 0줄
R=$(mktemp -d); mkdir -p "$R/docs" "$R/vol1-llm/ch04"
cp docs/design-vol*.md "$M" "$R/docs/"; cp "$F" "$R/vol1-llm/ch04/"
.venv/bin/python scripts/check_references.py --root "$R" vol1-llm/ch04

# Y3 status(서지 마스터)
grep -c 'status: unverified' "$M"; grep -c '^ *- key: ' "$M"   # 두 수가 같아야 함
grep -cE 'verified_(by|at): null' "$M"                           # 키 수의 두 배

# Y4 금지 기호(보고서 전체, 서지 마스터와 장 파일의 what, conditions, note 줄)
perl -CSD -ne 'print "$.: $_" if /[\x{2014}\x{2015}\x{2013}\x{00B7}\x{318D}\x{30FB}\x{2022}]/' "$N"
cat "$M" "$F" | grep -E '^ *(what|conditions|note):' | perl -CSD -ne 'print if /[\x{2014}\x{2015}\x{2013}\x{00B7}\x{318D}\x{30FB}\x{2022}]/'

# K7 arXiv PDF 주소
grep -n 'arxiv.org/pdf' "$M"

# R1(사례 1) 🔄 행 없음
grep -c '🔄 행 없음' "$N"
```

사례 2와 3은 경로를 `vol2-agent/ch07/`, `vol3-physical-ai/ch12/`로 바꾸고, 키 대조는 `VOL=2 CH=7`, `VOL=3 CH=12`로 돌립니다. 서지 마스터 경로 `$M`은 같습니다. 사례 2의 T4(현재 값이 설계서 셀과 같음)는 카드의 "현재 값" 칸을 뽑아 `grep -F`로 `docs/design-vol2-agent.md`에서 찾습니다.

```bash
grep -E '^\| 현재 값 \|' "$N" | sed -E 's/^\| 현재 값 \| //; s/ \|$//' | while IFS= read -r v; do
  grep -qF -- "$v" docs/design-vol2-agent.md && echo "같음" || echo "다름: $v"; done
```
