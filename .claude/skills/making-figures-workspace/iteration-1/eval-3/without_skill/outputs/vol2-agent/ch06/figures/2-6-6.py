"""그림 2-6-6: 단계 수에 따른 전체 성공률(정본 N6-1만 씀).

설계서(2권 5장 6장 그림 명세): 단계 수에 따른 전체 성공률 곡선, p = 0.99, 0.95, 0.9 세 줄(N6-1).
  강조 선은 p = 0.95(E6-1 손계산과 같은 선)
메시지(6.1절): 단계가 늘수록 전체 성공률은 곱으로 빠르게 떨어집니다
값: 2권 설계서 7장 N6-1. 전체 성공률 = p^n(단계마다 독립 가정, E6-1)
  p=0.99: 1, 5, 10, 20단계 → 0.99, 0.951, 0.904, 0.818
  p=0.95: 0.95, 0.774, 0.599, 0.358
  p=0.9:  0.9, 0.590, 0.349, 0.122

구성: 가로축은 단계 수 n(1~20), 세로축은 전체 성공률 0~1. 선은 정수 n마다 p^n을 이은 것이고,
점은 정본 표가 값을 정한 1, 5, 10, 20단계에만 찍습니다. p = 0.95 선만 메시지 선(강조색)이고
나머지 둘은 맥락 선입니다. 강조는 메시지 선과 칩 2개(10단계 0.599, 20단계 0.358)입니다(6.2절).
칩 숫자는 정본 문자열 그대로이고, 1~20 사이 다른 정수의 값은 그림에 숫자로 적지 않습니다.

실행: .venv/bin/python vol2-agent/ch06/figures/2-6-6.py [미리보기폴더]
      출력은 2-6-6.svg(640 × 480) 하나입니다. EPUB 세로 변형은 두지 않습니다(5.11절 필수 대상 아님).
      폭 400 세로 변형을 시험했으나 지시선 문장이 칩 0.599와 겹치고 캔버스를 넘어 뺐습니다.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "assets/charts"))
import figlib as fl  # noqa: E402

STEPS = [1, 5, 10, 20]
# N6-1 정본 문자열 그대로(칩 숫자와 대조하려고 문자열로 둔다)
N61 = {
    "0.99": ["0.99", "0.951", "0.904", "0.818"],
    "0.95": ["0.95", "0.774", "0.599", "0.358"],
    "0.9": ["0.9", "0.590", "0.349", "0.122"],
}
N = list(range(1, 21))
MARK = [N.index(s) for s in STEPS]  # 점은 정본 단계에만

MSG = "단계가 늘수록 성공률이 곱으로 줄어듭니다"
DESC = ("단계별 성공률 p가 0.99, 0.95, 0.9일 때 단계 수 1~20에 따른 전체 성공률을 선 그래프로 "
        "나타냈습니다. 세로축은 전체 성공률 0~1입니다. p = 0.95면 5단계 0.774, 10단계 0.599, "
        "20단계 0.358로 줄고, p = 0.99는 20단계 0.818, p = 0.9는 20단계 0.122입니다. "
        "단계가 늘수록 전체 성공률은 곱으로 빠르게 떨어집니다.")

# 축 영역 px (왼, 위, 오른, 아래)
LAYOUT = {
    "body": dict(width="body", height=480, plot=(88, 88, 472, 424), leader_x=7, out="2-6-6.svg"),
}


def build(variant, preview_dir=None):
    lay = LAYOUT[variant]
    fig, ax = fl.figure(lay["width"], height=lay["height"], plot=lay["plot"])
    fl.header(fig, "그림 2-6-6", "단계 수와 전체 성공률")
    fl.y_title(ax, "전체 성공률")
    fl.x_title(ax, "단계 수")

    ax.set_xlim(0, 20.5)
    ax.set_xticks(STEPS)
    ax.set_ylim(0, 1)
    ax.set_yticks([0, 0.5, 1])
    fl.fixed_decimals(ax, "y", 1)

    lines = {}
    for p in ("0.99", "0.9", "0.95"):  # 메시지 선을 마지막에 그려 위에 오게 한다
        pv = float(p)
        role = "message" if p == "0.95" else "context"
        lines[p] = fl.line(ax, N, [pv ** n for n in N], role=role, markevery=MARK)

    v95 = [float(s) for s in N61["0.95"]]
    # 메시지가 기대는 숫자 두 개만 칩(강조 칩 2개 이하). 선이 오른쪽 아래로 내려가므로 위 오른쪽에 붙인다
    fl.chip(ax, 10, v95[2], N61["0.95"][2], accent=True, canon="N6-1", side="above-right")
    end_side = lay.get("end_side", "right")
    end_chip = fl.chip(ax, 20, v95[3], N61["0.95"][3], accent=True, canon="N6-1", side=end_side)
    top = dict(line=lines["0.95"], text="p = 0.95")
    if end_side == "right":
        top["after"] = end_chip

    fl.direct_labels(ax, [
        dict(line=lines["0.99"], text="p = 0.99"),
        top,
        dict(line=lines["0.9"], text="p = 0.9"),
    ])

    # 점은 메시지 선 위(5단계와 10단계 사이), 문장은 자동 배치(선, 칩, 라벨, 보조선을 피한다)
    fl.leader(ax, fl.on_line(lines["0.95"], lay["leader_x"]), MSG)

    out = Path(__file__).with_name(lay["out"])
    title = "그림 2-6-6 단계 수에 따른 전체 성공률"
    fl.save(fig, out, title=title, desc=DESC, preview_dir=preview_dir)
    print(out)


build("body", preview_dir=str(Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else None)
