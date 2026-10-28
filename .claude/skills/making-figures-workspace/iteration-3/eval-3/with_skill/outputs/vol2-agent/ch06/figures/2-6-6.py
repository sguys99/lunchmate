"""그림 2-6-6: 단계 수에 따른 전체 성공률.

명세: 2권 설계서 6장 그림 명세 2-6-6(C). 단계 수에 따른 전체 성공률 곡선, p = 0.99, 0.95, 0.9 세 줄(N6-1).
  강조 선은 p = 0.95(E6-1 손계산과 같은 선)
메시지: 단계 성공률이 0.95여도 20단계면 전체 성공률은 0.358입니다
데이터: 2권 설계서 7장 N6-1(단계별 성공률 p, 단계 n, 독립 가정), 식은 E6-1(전체 성공률 = p^n)
  p=0.99: 1, 5, 10, 20단계 → 0.99, 0.951, 0.904, 0.818
  p=0.95: 0.95, 0.774, 0.599, 0.358
  p=0.9: 0.9, 0.590, 0.349, 0.122
  정본 점(1, 5, 10, 20단계)만 점을 찍고, 사이는 E6-1 식에서 촘촘히 계산한 곡선으로 잇는다.
  곡선 위 정본이 아닌 값은 숫자로 쓰지 않고, 1~20단계 밖으로 선을 늘이지 않는다(외삽 없음).
가정값: 독립 가정(단계마다 같은 p로 따로 성공). 그림 안에는 쓰지 않고 캡션 단서로 보냄
출처: 정본만 씀(references.yml 키 없음)
🔄: 아님

설계 판단
- 판은 patterns.md P15(1-5-5 실측) 640 x 320, 그림 영역 x 104~432, y 88~264.
- 강조는 p = 0.95 선(accent 1.5, 채운 점)과 강조 칩 0.599, 0.358 두 개. 맥락 선 둘은 흑백에서
  선 종류로 갈리게 p = 0.99(E6-1이 비교하는 짝)를 rank 1(ink-600 파선), p = 0.9를 rank 2(ink-400 점선)로 둔다.
- 메시지 지시선은 뺐다. 메시지는 강조 칩 두 개와 캡션이 맡는다(chart-guide 4.2절 "지시선" 행).
- 가로축은 320 판이라 축 제목 자리가 없어 눈금 글자에 "1단계"처럼 단위를 붙였다(chart-guide 4.2절 제안안, note에 기록).
- 계열 수를 3으로 지키려고 곡선과 정본 점을 선 하나로 그리고 markevery로 정본 x에만 점을 찍는다.

실행: .venv/bin/python vol2-agent/ch06/figures/2-6-6.py [미리보기폴더]
출력: vol2-agent/ch06/figures/2-6-6.svg (640 x 320), EPUB 세로 변형 2-6-6.v.svg (360 x 368, 5.11절 선택 변형)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "assets/charts"))
import figlib as fl  # noqa: E402

STEPS = [1, 5, 10, 20]
# N6-1 정본 문자열 그대로(칩 숫자와 글자 단위로 대조한다)
N61 = {
    "0.99": ["0.99", "0.951", "0.904", "0.818"],
    "0.95": ["0.95", "0.774", "0.599", "0.358"],
    "0.9": ["0.9", "0.590", "0.349", "0.122"],
}
MSG_P = "0.95"
# figures.yml alt와 글자 단위로 같게 둔다(caption-alt.md 3.4절)
DESC = (
    "단계마다 같은 성공률 p로 독립적으로 성공한다고 할 때, 단계 수 1에서 20까지의 전체 성공률을 p = 0"
    ".99, 0.95, 0.9 세 곡선으로 나타냈습니다. 세 곡선 모두 단계가 늘수록 내려가고, p가 낮을수록 "
    "더 가파르게 떨어집니다. 강조한 p = 0.95 곡선은 10단계에서 0.599, 20단계에서 0.358이고,"
    " 같은 20단계에서 p = 0.99는 0.818입니다. 단계 성공률이 0.95여도 20단계면 전체 성공률은 "
    "0.358로 떨어집니다."
)

# 곡선용 촘촘한 x: 1~20을 0.25 간격으로, 정본 x를 정확히 포함한다
XS = [1 + i * 0.25 for i in range(77)]
MARK = [XS.index(float(s)) for s in STEPS]

LAYOUT = {
    "body": dict(width="body", height=320, plot=(104, 88, 432, 264), xlim=(0, 20.5),
                 mid_side="above", end_side="right", out="2-6-6.svg"),
    # 세로 변형(P15, 1-5-5.v 실측 판 360 x 368, 영역 x 64~264, y 128~320). 1단계와 5단계 눈금 글자가
    # 8 이상 떨어지게 x 범위를 0.5~20으로 좁히고, 끝 칩을 점 오른쪽 위로 올려 라벨 자리를 남긴다.
    # 곡선이 가팔라 10단계 칩을 점 바로 위에 두면 왼쪽 아래 모서리가 곡선에 닿아, 선이 내려가는 쪽(오른쪽 위)에 둔다
    "v": dict(width=360, height=368, plot=(64, 128, 264, 320), xlim=(0.5, 20),
              mid_side="above-right", end_side="above-right", out="2-6-6.v.svg"),
}

def curve(p):
    return [float(p) ** n for n in XS]


def build(variant, preview_dir=None):
    lay = LAYOUT[variant]
    fig, ax = fl.figure(lay["width"], height=lay["height"], plot=lay["plot"])
    fl.header(fig, "그림 2-6-6", "단계 수와 전체 성공률")
    fl.y_title(ax, "전체 성공률")

    # 1) 축을 먼저 확정한다
    ax.set_xlim(*lay["xlim"])
    ax.set_xticks(STEPS, [f"{s}단계" for s in STEPS])
    ax.set_ylim(0, 1)
    ax.set_yticks([0, 0.5, 1])
    fl.fixed_decimals(ax, "y", 1)

    # 2) 계열: 맥락 선 둘을 먼저, 메시지 선을 위에
    ln99 = fl.line(ax, XS, curve("0.99"), role="context", rank=1, markevery=MARK)
    ln90 = fl.line(ax, XS, curve("0.9"), role="context", rank=2, markevery=MARK)
    ln95 = fl.line(ax, XS, curve(MSG_P), role="message", markevery=MARK)

    # 3) 칩: 메시지가 기대는 정본 결과 두 개(10단계, 20단계)만, 강조 칩
    v95 = [float(s) for s in N61[MSG_P]]
    fl.chip(ax, 10, v95[2], N61[MSG_P][2], accent=True, canon="N6-1", side=lay["mid_side"])
    end_side = lay["end_side"]
    end = fl.chip(ax, 20, v95[3], N61[MSG_P][3], accent=True, canon="N6-1", side=end_side)
    top = dict(line=ln95, text="p = 0.95")
    if end_side == "right":
        top["after"] = end

    # 4) 선 끝 직접 라벨(범례 대신)
    fl.direct_labels(ax, [
        top,
        dict(line=ln99, text="p = 0.99"),
        dict(line=ln90, text="p = 0.9"),
    ])

    # 지시선은 두지 않는다. 강조 선의 정본 점 위아래로 맥락 선이 지나가 문장 자리가 없고(5단계에서
    # 위로 내면 p = 0.99 선을 가로지름), 칩과 떨어진 점에 accent를 찍으면 강조가 흩어진다(chart-guide 4.2절, 6장)

    out = Path(__file__).with_name(lay["out"])
    title = "그림 2-6-6 단계 수와 전체 성공률" + (" (EPUB 세로 변형)" if variant == "v" else "")
    fl.save(fig, out, title=title, desc=DESC, preview_dir=preview_dir)
    print(out)


for variant in LAYOUT:
    build(variant, preview_dir=sys.argv[1] if len(sys.argv) > 1 else None)
