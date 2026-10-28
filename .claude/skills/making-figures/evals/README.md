# making-figures 평가 사례

tasks.md 3.4절의 평가 사례 4건입니다. 3.8절 "스킬 시험 운전"에서 이 사례를 그대로 돌려 스킬을 고쳐요. 종류 넷(M, S, C, S 구조도)과 권 셋을 한 번씩 거치게 골랐습니다.

| id | 사례 | 파일 | 시험하는 것 | 기준 |
|---|---|---|---|---|
| 1 | 1-4-3 M, 어텐션 4단계와 N4-2 숫자(회귀 시험) | `case-1-4-3-attention-steps.md` | 본보기 재현이 깨지지 않는지, 세로 변형 재작도, 검수 기록, 캡션과 alt | 승인 시안과 일치 |
| 2 | 1-4-4 S, 띠 폭 = 가중치 | `case-1-4-4-weight-ribbons.md` | figkit 구조도, 프롬프트의 "굵기"를 띠 폭으로 그리는 판단, 칩 열 | 승인 시안과 일치 |
| 3 | 2-6-6 C, 성공률 곡선 3줄 | `case-2-6-6-success-curves.md` | figlib 선 그래프, 정본 점만 칩, 독립 가정 표기, 세로 변형 | 이 문서의 기대 구도(제안) |
| 4 | 3-8-1 S, 이중 시스템과 주기 | `case-3-8-1-dual-system.md` | P9 입출력 블록, 🔄 값을 칩 없이 쓰고 refresh와 기준일 달기, 센서 입력 회색과 개념색 상한, 로봇 그림 금지 | 이 문서의 기대 구도(제안) |

사례 1, 2는 저자가 승인한 시안(`docs/style-board/final/1-4-3.*`, `1-4-4.*`)이 이미 있습니다. 그래서 기대 결과는 "시안과 구도, 숫자, 강조가 같은가"이고, 시험 실행은 시안을 보지 않고 만든 결과를 채점자만 시안과 비교합니다. 사례 3, 4는 시안이 없어 각 사례 md의 와이어프레임이 기준이며, 그 치수는 스크래치패드에서 빈 상자로 렌더링해 확인한 제안값이에요.

사례 1은 3회차(`iteration-3`)부터 회귀 시험으로 분류합니다. `references/mermaid-guide.md` 2장에 시안 1-4-3의 `.mmd` 전체가 본보기로 실렸기 때문이에요. 그래서 본문 노드 문구와 강조(W2, C1, A2, 본문 H3)는 "본보기 재현이 깨지지 않는가"를 잽니다. 판정 항목과 기준은 그대로 두고, 통과율을 읽을 때 이 항목들의 통과를 일반화 개선으로 세지 않습니다. 스스로 판단을 재는 항목은 세로 변형(W3, H5), 검수 기록(F3, H7), `figures.yml` 필드와 `note`(Y1)예요. 예시에 없는 M 흐름도를 재는 사례는 아직 없습니다(`docs/skill-trial-3.8.md` 5.3절 1번, 추가 여부는 저자 결정).

## 파일 구성

- `evals.json`: skill-creator 형식(`.claude/skills/skill-creator/references/schemas.md`)입니다. 필드는 `skill_name`, `evals[].id`, `prompt`, `expected_output`, `files`, `expectations`입니다. `files` 경로는 스키마대로 스킬 폴더 기준 상대 경로라서 `../../../docs/...` 꼴입니다. 사례 1, 2의 `files`에는 시안을 넣지 않습니다(채점자만 봄).
- `case-*.md`: 사례마다 과제 프롬프트, 입력 파일, 기대 산출물을 적습니다. 이어서 기대 구도 와이어프레임과 치수표, 정본 문자열과 금지 패턴, 판정 항목, 실패 예, 설계서 확인 메모를 담습니다.
- `expectations` 문장 머리의 `[자동]`은 아래 판정 명령으로 가릴 수 있는 항목, `[사람]`은 grader가 PNG를 열어 판정할 항목입니다. 그 뒤의 기호(F1, W2, H3 등)는 사례 md 5장 표의 번호와 같습니다.

판정 번호 체계(네 사례 공통)

| 묶음 | 번호 | 뜻 |
|---|---|---|
| F | F1~F3 | 파일 존재, 소스 재실행 일치(손편집 없음), 검수 기록 |
| L | L1~L2 | lint 오류 0, 금지 기호 0 |
| C | C1~C3 | 정본 문자열, 금지 패턴, 숫자 칩 |
| W | W1~W3 | 캔버스, 본문 구도 치수, 세로 변형 구도 |
| A | A1~A3 | title과 desc, 대체 텍스트, 캡션 |
| Y | Y1 | `figures.yml` 필드 |
| H | H1~H7 | 사람 판정: 메시지, 강조, 같은 손, 흑백과 색약, 휴대폰 폭, 사례 고유 항목, 검수 기록의 정직성 |

## 실행 방법 (3.8절)

skill-creator의 "Running and evaluating test cases" 절차를 그대로 씁니다. 처음 돌릴 때는 새 스킬이므로 기준선은 스킬 없이 돌린 결과예요.

1. 작업 폴더는 스킬 폴더 옆에 둡니다. 경로는 `making-figures-workspace/iteration-K/eval-N/{with_skill,without_skill}/outputs/`입니다. K는 회차, N은 사례 id예요. 3회차는 `iteration-3/`이에요. 앞 회차 폴더의 산출물은 고치지 않습니다.
2. 실행 전에 `outputs/` 안에 저장소 도구를 심볼릭 링크로 걸어 둡니다. 그림 소스가 `parents[3]`으로 저장소 뿌리를 찾기 때문에, 링크가 없으면 `outputs/` 아래의 `.build.py`와 `.py`가 공통 부품을 못 찾아요.

   ```bash
   O=.claude/skills/making-figures-workspace/iteration-3/eval-1/with_skill/outputs
   mkdir -p "$O" && for d in assets scripts node_modules .venv; do ln -s "$PWD/$d" "$O/$d"; done
   C=vol1-llm/ch04                               # 사례 md 5.4절 D에서 /figures를 뗀 장 폴더
   mkdir -p "$O/$C" && cp "$PWD/$C/index.md" "$O/$C/index.md"
   ```

   마지막 줄은 `check_figures.py`의 root 옵션 실행이 멈추지 않게 하는 준비입니다. 장 폴더에 `index.md`가 없으면 "장 폴더에 index.md 없음"으로 종료 코드 2를 냅니다. 심볼릭 링크가 아니라 복사를 쓰는 이유는, 실행이 `$O` 아래 `index.md`를 고쳐도 저장소 원고가 덮이지 않게 하려는 것이에요. 이 사본은 채점 대상이 아닙니다.

3. 사례마다 하위 에이전트 둘을 같은 차례에 띄웁니다. 하나는 스킬 경로를 주고(`with_skill`), 하나는 주지 않습니다(`without_skill`). 과제는 `evals.json`의 `prompt` 그대로예요.
4. 실행 지시에 아래 줄을 덧붙입니다. 시험 결과가 저자 승인 전에 원고 폴더와 기록부에 섞이지 않게 하려는 것입니다.
   - 공통: "저장소 파일을 고치지 말고, 같은 상대 경로(`vol1-llm/ch04/figures/1-4-3.mmd` 등)로 `$O` 아래에 저장하라. `figures.yml` 항목은 `$O/docs/figures.yml`에 둔다. 검수 기록은 `$O/vol*/chNN/notes.md`, 미리보기 PNG는 `$O/vol*/chNN/figures/_render/qa/`에 둔다. 명령은 저장소 뿌리나 `$O` 어디서 실행해도 된다."
   - 사례 1, 2만: 아래 금지 목록의 파일을 열지 말라고 덧붙입니다. "같은 종류 시안과의 대조가 필요하면 나머지 시안(1-5-5, 2-4-2, 1-4-8)과 사례 1이면 1-4-4, 사례 2면 1-4-3을 쓴다." 다른 종류 시안과 대조했다면 9장 표의 같은 종류 관찰값도 줄마다 보라고 덧붙입니다.
   - 사례 2만: 출발 견본을 정해 줍니다. SKILL.md 5단계 표는 S의 시작점으로 금지 목록에 든 `final/1-4-4.build.py`를 가리키기 때문이에요. 덧붙일 문장은 "S 출발 견본은 대체 견본 `docs/style-board/final/1-4-8.build.py`를 쓰고, 치수는 `patterns.md` P8에서 가져온다"입니다.

   금지 목록(2026-10-15에 `docs/style-board/` 전체를 `0.576`, `크기 조정`, `가중합`, `0.707`, `왔어요`로 검색해 확인)

   | 사례 | 열지 않을 파일 | 담긴 정답 |
   |---|---|---|
   | 1, 2 공통 | `docs/style-board/final/figures.yml`, `docs/style-board/final/index.html` | 두 시안의 메시지, 캡션, 강조 대상, 치수 |
   | 1 | `docs/style-board/final/1-4-3.*` | 시안 원본 |
   | 1 | `docs/style-board/mermaid-sample.mmd`, `mermaid-sample.svg` | 1-4-3 노드 글자 전부(단계 이름, 연산 문구, 값 줄) |
   | 1 | `docs/style-board/figkit-sample.build.py`, `figkit-sample.svg` | 1-4-3 세로 변형 노드 7개와 배치 |
   | 1 | `docs/style-board/A-flow.svg`, `B-flow.svg`, `B-flow.v.svg`, `C-flow.svg` | 1-4-3 흐름도 시안 세 벌 |
   | 1 | `docs/style-board/index.html`, `dark-mode.html` | 위 흐름도 시안을 싣거나 불러 옴 |
   | 2 | `docs/style-board/final/1-4-4.*` | 시안 원본 |
   | 1 | `vol1-llm/ch04/figures/1-4-3.*`, `docs/figures.yml`의 1-4-3 항목 | 4장 원고판 소스와 기록부(2026-10-17부터 저장소에 있음) |
   | 2 | `vol1-llm/ch04/figures/1-4-4.*`, `docs/figures.yml`의 1-4-4 항목 | 4장 원고판 소스와 기록부 |
   | 1, 2 공통 | `vol1-llm/ch04/notes.md`의 "그림 검수 기록" 절, `vol1-llm/ch04/review/` | 치수, 강조, 검수 판정 |

   2026-10-17부터 4장 원고와 그림이 저장소에 있어 위 세 줄을 더했습니다. 입력 파일 `vol1-llm/ch04/index.md`의 이미지 줄에도 확정 캡션과 alt가 들어 있어, 캡션과 alt 항목(A2, A3)은 원고 복사로 통과할 수 있어요. 채점 때 이 점을 적고, 입력 원고를 3.8절 시점 사본으로 고정할지는 저자 결정으로 남깁니다(`docs/skill-trial-3.8.md` 7.2절).

   `tokens-type.svg`, `tokens-colors.svg`, `tokens-layout.svg`, `parts-concepts.svg`도 N4-2 값과 토큰 이름을 담습니다. 다만 정본 표와 같은 값만 있고 구도와 노드 글자가 없어 금지하지 않습니다. `svg-guide.md`가 `figkit-sample.build.py`를 견본으로 가리키므로, 사례 1 실행 지시에는 이 파일을 열지 말라는 문장을 꼭 넣습니다.
5. 실행마다 `eval_metadata.json`을 만들고 `assertions`에 이 파일의 `expectations`를 옮깁니다. 끝난 실행의 `total_tokens`와 `duration_ms`는 알림이 오는 즉시 `timing.json`에 적습니다.
6. 채점은 skill-creator의 `agents/grader.md`를 따르고 `grading.json` 필드는 `text`, `passed`, `evidence`를 씁니다. `[자동]` 항목은 아래 명령으로 먼저 판정하고, `[사람]` 항목만 grader가 PNG를 열어 판정합니다.
7. 사례 1, 2의 트랜스크립트에 위 금지 목록의 파일을 연 흔적이 있으면 그 실행은 무효로 하고 다시 돌립니다. 반대로 references 문서에 실린 시안 치수, 캡션, 대체 텍스트를 옮겨 쓴 것은 스킬이 의도한 재사용이라 감점하지 않아요.
8. 집계와 보기 화면은 skill-creator의 `scripts.aggregate_benchmark`와 `eval-viewer/generate_review.py`를 씁니다.
9. 실패 원인을 지시 부족, 예시 부족, 검사 누락으로 나눠 스킬을 고치고 `CHANGELOG.md`에 적습니다. 그 뒤 다음 회차 폴더(`iteration-2/`, `iteration-3/` 순서)로 다시 돌립니다.

## 자동 판정 명령

판정 스크립트는 저장소 뿌리에서 산출 폴더 `$O`를 가리켜 돌립니다. `check_figures.py --root "$O"`는 `$O/docs/figures.yml`을 기록부로 읽고, 설계서가 `$O`에 없으므로 명세 대조(F09)는 건너뛰는 경고(F90)가 나옵니다. 명세 대조는 아래 블록의 사례별 값으로 합니다.

```bash
O=.claude/skills/making-figures-workspace/iteration-3/eval-1/with_skill/outputs
ID=1-4-3; D=vol1-llm/ch04/figures
.venv/bin/python scripts/check_figures.py --root "$O" "$O/${D%/figures}"   # 그림 참조, 기록부, 사본 대조
.venv/bin/python scripts/figure_qa.py "$O/$D/$ID.svg" --sheet               # [사람] 항목용 PNG 묶음, $O/$D/_render/qa/
```

아래 블록은 스크립트가 보지 않는 사례별 검사(재현 일치, 값 포함과 금지)와, 스크립트를 못 쓸 때의 예비 명령입니다. 사례별 값(`ID`, `D`, `MUST`, `BAN`, `BOX` 등)은 각 사례 md 5.4절에 한 줄로 적어 두었어요.

```bash
O=.claude/skills/making-figures-workspace/iteration-3/eval-1/with_skill/outputs
ID=1-4-3; D=vol1-llm/ch04/figures            # 사례 md 5.4절 값으로 바꿈

# F1. 파일 (사례 md 4장 표의 파일이 모두 나와야 함)
ls -1 "$O/$D/$ID".* "$O/docs/figures.yml" "$O/${D%/figures}/notes.md" "$O/$D/_render/qa/" 2>&1

# L1. lint (출력 SVG는 도구와 상관없이 figkit, C는 figlib도)
.venv/bin/python assets/svg-parts/_build/figkit.py lint "$O/$D/$ID.svg" "$O/$D/$ID.v.svg"
.venv/bin/python assets/charts/figlib.py lint "$O/$D/$ID.svg" "$O/$D/$ID.v.svg"        # C(사례 3)만

# F2. 소스 재실행 일치: 다시 만든 SVG가 제출본과 같아야 함(손편집 없음). 출력은 모두 임시 경로로 받아 제출본을 덮지 않음
#   M: 렌더링 결과를 임시 파일로 받아 비교 (deterministicIds라 같으면 바이트 단위로 같음)
assets/mermaid/_build/render.sh "$O/$D/$ID.mmd" "${TMPDIR:-/tmp}/$ID.re.svg" && cmp "$O/$D/$ID.svg" "${TMPDIR:-/tmp}/$ID.re.svg" && echo "M 재현 같음"
#   S, C(사례 1의 세로 변형 .v.build.py 포함): 소스를 임시 미러에 복사해 다시 실행하고 제출본과 비교
#   (소스가 Path(__file__).resolve() 옆에 쓰므로 심볼릭 링크가 아니라 복사해야 제출본이 그대로 남음)
T=$(mktemp -d "${TMPDIR:-/tmp}/f2.XXXXXX"); mkdir -p "$T/$D"
for d in assets scripts node_modules .venv; do ln -s "$PWD/$d" "$T/$d"; done
for src in "$O/$D/$ID".build.py "$O/$D/$ID".v.build.py "$O/$D/$ID".py; do
  [ -f "$src" ] || continue; cp "$src" "$T/$D/"; .venv/bin/python "$T/$D/${src##*/}" >/dev/null
done
for v in "" .v; do
  [ -f "$T/$D/$ID$v.svg" ] || continue
  cmp -s "$O/$D/$ID$v.svg" "$T/$D/$ID$v.svg" && echo "$ID$v 재현 같음" || echo "$ID$v 다름: diff \"$O/$D/$ID$v.svg\" \"$T/$D/$ID$v.svg\"로 차이가 id와 날짜뿐인지 확인"
done

# C1~C3, W1~W3, A1~A3, Y1. 사례 md 5.4절의 변수 줄을 붙여 실행
#   예(사례 1): MUST='...' BAN='...' BOX='...' BOXV='...' TOL=16 KIND=M CANON=N4-2 EPUB=manual REFRESH=null \
.venv/bin/python - "$O" "$D" "$ID" <<'EOF'
import os, sys, re, html, yaml, xml.etree.ElementTree as ET
from pathlib import Path
O, D, ID = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
env = lambda k: [s for s in os.environ.get(k, "").split(";;") if s]
MUST, BAN, BOX, BOXV = env("MUST"), env("BAN"), env("BOX"), env("BOXV")
TOL, KIND, CANON, EPUB = int(os.environ.get("TOL", "8")), os.environ.get("KIND"), env("CANON"), os.environ.get("EPUB")
VW = float(os.environ.get("VW", "360"))  # 세로 변형 폭. 400은 사례 md가 사유와 함께 정한 경우에만 VW=400
BH = [float(h) for h in os.environ.get("BH", "216,320,480,640").split(",")]  # 본문 허용 높이. 사례 md W1이 좁히면(예: BH=320) 그 값만
ALTNUM, ALTSKIP = os.environ.get("ALTNUM"), env("ALTSKIP")  # C 사례: alt 결과 소수 개수 범위(예: 2-4)와 세지 않을 계열 이름 숫자
REFRESH = os.environ.get("REFRESH")  # null이면 refresh 없음, 값(예: 2026-10)이면 refresh.as_of가 그 값
BAD = {0x2014, 0x2015, 0x2013, 0xB7, 0x318D, 0x30FB, 0x2022}
NG = ["그림입니다", "이 그림은", "아래 그림", "파란", "빨간", "초록", "주황", "보라", "노란", "회색"]
ns = "{http://www.w3.org/2000/svg}"
out = []
ok = lambda k, c, why="": out.append(("통과" if c else "실패", k, why))

def outer(r):  # 테두리 바깥 끝 (x, y, w, h)
    st = r.get("style") or ""
    m = re.search(r"stroke-width:\s*([\d.]+)", st)
    has = (r.get("stroke") or re.search(r"stroke:\s*#", st)) and r.get("stroke") != "none"
    sw = float(r.get("stroke-width") or (m.group(1) if m else 1)) if has else 0.0
    f = lambda a: float(re.match(r"-?[\d.]+", r.get(a)).group())
    return (f("x") - sw / 2, f("y") - sw / 2, f("width") + sw, f("height") + sw)

def boxes(root, want, tag):  # want: "x,y,w,h", 값 대신 * 를 쓰면 그 값은 보지 않음
    rs = [outer(r) for r in root.iter(ns + "rect") if r.get("x") is not None]
    used, miss = set(), []
    for w in want:
        e = [None if v == "*" else float(v) for v in w.split(",")]
        hit = next((i for i, r in enumerate(rs) if i not in used and
                    all(a is None or abs(a - b) <= TOL for a, b in zip(e, r))), None)
        miss.append(w) if hit is None else used.add(hit)
    ok(f"{tag} 구도 상자 {len(want) - len(miss)}/{len(want)}", not miss, "빠짐 " + " | ".join(miss) if miss else "")

Y = yaml.safe_load(open(O / "docs/figures.yml", encoding="utf-8")) if (O / "docs/figures.yml").exists() else []
e = next((f for f in Y or [] if str(f.get("id")) == ID), None)
ok("figures.yml 항목", e is not None)
alt = (e or {}).get("alt") or ""
for v in ["", ".v"]:
    p = O / D / f"{ID}{v}.svg"
    if not p.exists():  # 세로 변형은 epub_variant: none이 허용된 사례에서만 없어도 됨
        ok(p.name + " 있음", bool(v and e and e.get("epub_variant") == "none" and "none" in (EPUB or "")))
        continue
    root = ET.parse(p).getroot()
    vis = " ".join("".join(t.itertext()) for t in root.iter(ns + "text"))
    flat = re.sub(r"\s+", "", vis)
    title = (root.findtext(ns + "title") or "").strip()
    desc = html.unescape(root.findtext(ns + "desc") or "").strip()
    W, H = float(root.get("width", 0)), float(root.get("height", 0))
    ok(f"{p.name} 폭과 높이 {W:g} x {H:g}", (W == 640 and H in BH) if not v else (W == VW and H <= 720 and H % 8 == 0))
    ok(f"{p.name} 금지 기호", not any(ord(c) in BAD for c in vis + title + desc))
    miss = [m for m in MUST if re.sub(r"\s+", "", m) not in flat]
    ok(f"{p.name} 정본 문자열 {len(MUST) - len(miss)}/{len(MUST)}", not miss, "없음 " + " | ".join(miss) if miss else "")
    hits = [b for b in BAN if re.search(b, vis)]
    ok(f"{p.name} 금지 패턴", not hits, " | ".join(hits))
    ok(f"{p.name} title 서식", title.startswith(f"그림 {ID} ") and (title.endswith("(EPUB 세로 변형)") if v else True), title)
    ok(f"{p.name} desc = alt", bool(alt) and desc == alt.strip())
    chips = ["".join(g.itertext()).strip() for g in root.iter(ns + "g") if "num-chip" in (g.get("class") or "")]
    cb = [c for c in chips if os.environ.get("CHIPBAN") and re.search(os.environ["CHIPBAN"], c)]
    ok(f"{p.name} 숫자 칩 {len(chips)}개", len(chips) <= 3 and not cb, " | ".join(chips))
    if v == "" and BOX: boxes(root, BOX, p.name)
    if v and BOXV: boxes(root, BOXV, p.name)
if e:
    c = e.get("caption") or {}
    t, r, cv = c.get("title") or "", c.get("reading") or "", c.get("caveat") or ""
    msg = e.get("message") or ""
    ok(f"message {len(msg)}자, 마침표 없음", 0 < len(msg) <= 40 and not msg.endswith("."), msg)
    ok("accent 채움", bool(e.get("accent")))
    ok(f"kind = {KIND}", str(e.get("kind")) == KIND, str(e.get("kind")))
    ok(f"source.canon에 {CANON}", all(x in ((e.get("source") or {}).get("canon") or []) for x in CANON))
    if EPUB: ok(f"epub_variant = {EPUB}", e.get("epub_variant") in EPUB.split("|"), str(e.get("epub_variant")))
    if REFRESH:
        rf = e.get("refresh")
        ok(f"refresh = {REFRESH}", rf is None if REFRESH == "null" else str((rf or {}).get("as_of")) == REFRESH and bool((rf or {}).get("ledger")), str(rf))
    ok("status는 approved가 아님", e.get("status") in ("rendered", "reviewed"), str(e.get("status")))
    S = [x for x in re.split(r"(?<=다\.)\s+", alt.strip()) if x]
    ok(f"alt {len(S)}문장 {len(alt)}자", 2 <= len(S) <= 4 and len(alt) <= 300 and all(len(x) <= 100 for x in S))
    if ALTNUM:
        lo, hi = map(int, ALTNUM.split("-"))
        nums = sorted({n for n in re.findall(r"(?<![\d.])\d+\.\d+(?![\d.])", alt) if n not in ALTSKIP})
        ok(f"alt 결과 소수 {len(nums)}개(기준 {ALTNUM})", lo <= len(nums) <= hi, " ".join(nums))
    ok("alt와 캡션 금지어, 큰따옴표", not [w for w in NG if w in alt + r + cv] and '"' not in alt)
    ok(f"캡션 길이 {len(t)}/{len(r)}/{len(cv)}", len(t) <= 40 and len(r) <= 70 and len(cv) <= 70 and len(t + r + cv) <= 120)
    ok("캡션 금지 기호", not any(ord(ch) in BAD for ch in t + r + cv + alt + msg))
    hits = [b for b in BAN if re.search(b, alt + " " + t + " " + r + " " + cv)]
    ok("alt와 캡션 금지 패턴", not hits, " | ".join(hits))
for s, k, w in out:
    print(f"{s}  {k}" + (f"  ({w})" if w and (s == "실패" or "구도" in k or "칩" in k) else ""))
print("실패", sum(s == "실패" for s, _, _ in out), "/ 전체", len(out))
EOF
```

- 시험 확인(2026-10-14): 시안 1-4-3, 1-4-4, 1-5-5를 가짜 `outputs/`에 옮겼습니다. 사례 1, 2의 변수 줄로 돌리면 사례마다 28항목 모두 통과입니다. 2026-10-15에 `REFRESH` 항목을 더해 다시 돌려 사례마다 29항목 모두 통과했고, 사례 1에 `REFRESH=2026-10`을 주면 그 항목만 실패로 나왔습니다. 1-4-4.v.svg의 0.576을 0.58로 바꾼 사본에서는 정본 문자열, 금지 패턴, desc와 alt 불일치 3건이 실패로 나왔어요.
- `MUST`는 공백을 지우고 대조하므로 `tspan`으로 쪼개진 숫자도 잡습니다. 정수 하나짜리 값("1", "2")은 어디에나 있어 넣지 않았고, 벡터 묶음("[1, 2, 3]")으로 대조합니다.
- 본문 높이는 `BH`(기본 216, 320, 480, 640) 안이어야 통과합니다. 사례 md W1이 높이를 하나로 정하면 변수 줄에 `BH=320`처럼 적습니다(사례 4: P9는 하위 모듈 3개 이상일 때만 480).
- `message ○자, 마침표 없음` 줄은 네 사례 모두 `[자동] Y1`에 들어갑니다. 이 줄이 실패하면 다른 Y1 줄이 통과해도 Y1은 실패예요.
- 세로 변형 폭은 `VW`(기본 360)와 같아야 통과합니다. 사례 md W1 문구와 같은 값이에요. 400은 `svg-guide.md` 10장 조건(정본 숫자 묶음이 328에 안 들어감)일 때만이고, 그런 사례만 변수 줄에 `VW=400`을 적습니다.
- `ALTNUM`은 C 사례(사례 3)에만 씁니다. alt 속 소수 가운데 `ALTSKIP`에 적은 계열 이름 숫자(예: p 값)를 뺀 서로 다른 값의 개수가 범위 안이어야 통과합니다(`caption-alt.md` 3.2절).
- `BOX` 대조 허용 오차는 `TOL`입니다. Mermaid 자동 배치(사례 1 본문)는 16, figkit과 figlib은 8을 씁니다. `*`는 그 값을 보지 않는다는 뜻이고, 텍스트 길이에 따라 달라지는 폭이나 사례 4처럼 행 순서를 정하지 않은 y에 씁니다.
- 숫자 칩 대조(Q20)는 `qa-checklist.md` 3.6절 명령을 그대로 씁니다. `C="N4-2"`처럼 사례의 정본 ID를 넣습니다.
- 캡션과 대체 텍스트의 정본 대조는 `caption-alt.md` 7장 명령으로 합니다. 그 명령은 `output_file`과 설계서를 현재 폴더 기준으로 읽습니다. 그래서 해당 설계서를 `$O/docs/`에 심볼릭 링크로 걸어 둡니다(`ln -s "$PWD/docs/design-vol1-llm.md" "$O/docs/"`). 그다음 `cd "$O"`에서 `Y=docs/figures.yml`로 실행해요.

## 사람 판정 절차

1. grader는 `$O/$D/_render/qa/`의 PNG를 Read 도구로 엽니다. 없으면 아래처럼 `figure_qa.py`로 만들고, 그 사실을 `evidence`에 적어요(`qa-checklist.md` 2.2절). 출력 폴더는 늘 `--out-dir`로 지정합니다. `figures/` 밖의 SVG(대조 시안)는 기본 출력이 공용 임시 폴더 `figqa/`라서, 사례를 병렬로 채점하면 시안 PNG가 서로 덮이거나 섞이기 때문입니다.

   ```bash
   O=.claude/skills/making-figures-workspace/iteration-3/eval-2/with_skill/outputs
   ID=1-4-4; D=vol1-llm/ch04/figures
   G=$(mktemp -d "${TMPDIR:-/tmp}/figqa-iter3-eval2.XXXXXX")       # 채점 실행마다 따로 만듦
   .venv/bin/python scripts/figure_qa.py "$O/$D/$ID.svg" "$O/$D/$ID.v.svg" --sheet --out-dir "$O/$D/_render/qa"   # 제출본(없을 때만)
   .venv/bin/python scripts/figure_qa.py docs/style-board/final/1-4-4.svg --sheet --out-dir "$G/draft"          # 대조 시안
   ```

   제출본 PNG는 실행이 만든 자리(`$O/$D/_render/qa/`)에 두고, 대조 시안 PNG는 `$G` 아래에만 둡니다. `evidence`에는 연 PNG의 경로를 적어요.
2. H1(메시지 5초)은 `figures.yml`의 `message`를 보기 전에 컬러 PNG만 보고 그림이 말하는 바를 한 문장으로 먼저 적은 뒤 대조합니다(Q12).
3. H3(같은 손)은 같은 종류 시안 PNG와 연달아 엽니다. 사례 1은 1-4-3, 사례 2는 1-4-4, 사례 3은 1-5-5, 사례 4는 1-4-4입니다. `design-rules.md` 9장 12가지를 한 줄씩 대조하고 어긋난 번호를 적어요.
4. H4는 `gray`, `protan`, `deutan` PNG로 판정합니다(Q11, Q14, Q15). H5는 `w328`과 `.v.w360`, `.v.w328` PNG로 봅니다(Q17, Q18).
5. 기준에 없는 위화감은 실패가 아니라 "저자 확인"으로 `evidence`에 남깁니다(`qa-checklist.md` 4장).
