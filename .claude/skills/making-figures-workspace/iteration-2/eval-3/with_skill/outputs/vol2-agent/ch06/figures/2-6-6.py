"""그림 2-6-6: 단계 수와 전체 성공률.

명세: 2권 설계서 6장 그림 명세 2-6-6(C). 단계 수에 따른 전체 성공률 곡선, p = 0.99, 0.95, 0.9 세 줄(N6-1).
  강조 선은 p = 0.95(E6-1 손계산과 같은 선)
메시지: 전체 성공률은 단계가 늘수록 곱으로 빠르게 떨어집니다
데이터: 2권 설계서 7장 N6-1(E6-1, 전체 성공률 = p^n, 단계마다 독립 가정)
  p=0.99: 1, 5, 10, 20단계 → 0.99, 0.951, 0.904, 0.818
  p=0.95: 0.95, 0.774, 0.599, 0.358
  p=0.9: 0.9, 0.590, 0.349, 0.122
가정값: 단계마다 독립이라는 가정. 그림 안 표시 없이 캡션 둘째 문장에 둔다
출처: 정본만 씀(references.yml 키 없음)
🔄: 아님

설계 판단
- 판은 patterns.md P15(1-5-5 실측): 640 x 320, 그림 영역 x 104~432, y 88~264.
- 곡선은 정본 식 p^n을 n = 1~20에서 0.25 간격으로 계산해 그리고, 점은 정본 x(1, 5, 10, 20단계)에만 찍는다
  (markevery). 곡선 위 정본 밖 값은 숫자로 쓰지 않는다.
- 강조는 p = 0.95 선과 칩 2개(10단계 0.599, 20단계 0.358). 맥락 선은 비교의 짝인 p = 0.99를 rank 1
  (ink-600 파선), p = 0.9를 rank 2(ink-400 점선)로 둔다(chart-guide.md 4.2절).
- 가로축이 무엇인지는 눈금 글자("5단계")에 담는다. 320 판에는 가로축 제목 자리가 없다(P15, 저자 확인 대기).
- 지시선은 두지 않는다. 메시지 선 옆 빈자리가 맥락 선 사이에 끼어 있어 문장을 놓으면 선을 가린다.
  메시지는 칩 두 개와 캡션 첫 문장이 전한다(design-rules.md 9장 기준 8, 지시선 0~1개).
- 세로 변형 360 x 328(1-5-5.v 판을 지시선 없이 줄인 판)을 같은 스크립트가 만든다. 본문 판을 폭 328로 줄이면 메시지가
  기대는 칩 숫자(14)가 7.2 CSS px라 qa-checklist Q3 기준에 못 미친다(choose-type.md 5장 3번).

실행: .venv/bin/python vol2-agent/ch06/figures/2-6-6.py [미리보기폴더]
출력: vol2-agent/ch06/figures/2-6-6.svg (640 x 320), 2-6-6.v.svg (360 x 328)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "assets/charts"))
import figlib as fl  # noqa: E402

# N6-1 정본 문자열 그대로(칩 숫자와 글자 단위로 대조한다). 키는 단계별 성공률 p
STEPS = [1, 5, 10, 20]
N61 = {
    "0.99": ["0.99", "0.951", "0.904", "0.818"],
    "0.95": ["0.95", "0.774", "0.599", "0.358"],
    "0.9": ["0.9", "0.590", "0.349", "0.122"],
}
STEP = 0.25  # 곡선을 매끄럽게 그리는 n 간격(정본 식 p^n에서 계산, 숫자로 쓰지 않음)
DESC = (  # figures.yml alt와 글자 단위로 같게 둔다
    "단계 수 1부터 20까지 전체 성공률이 줄어드는 모습을 단계별 성공률 p = 0.99, 0.95, 0.9의 세 곡선으로 나타냈습니다. "
    "가로축은 단계 수, 세로축은 전체 성공률이고, 강조한 곡선은 p = 0.95입니다. "
    "이 곡선은 10단계에서 0.599, 20단계에서 0.358로 떨어지고, p = 0.99도 20단계에서 0.818까지 내려갑니다. "
    "단계가 늘수록 전체 성공률은 곱으로 빠르게 떨어집니다."
)

xs = [1 + i * STEP for i in range(int((20 - 1) / STEP) + 1)]
marks = [round((n - 1) / STEP) for n in STEPS]


def curve(p):
    return [float(p) ** n for n in xs]


# 축 영역 px (왼, 위, 오른, 아래). 본문은 P15(1-5-5 실측), 세로 변형은 1-5-5.v 실측
LAYOUT = {
    "body": dict(width="body", height=320, plot=(104, 88, 432, 264), end_side="right",
                 out="2-6-6.svg"),
    # 세로 변형: 지시선이 없어 위 여백을 본문 판과 같게(영역 위 88) 두고, 눈금 글자 간격을 벌리려
    # 영역을 좌우로 8씩 넓힌다. 끝 칩은 점 오른쪽 위로 올려 선 끝 라벨과 함께 328 안에 넣는다
    "v": dict(width=360, height=328, plot=(56, 88, 272, 280), end_side="above-right",
              out="2-6-6.v.svg"),
}


def build(variant, preview_dir=None):
    lay = LAYOUT[variant]
    fig, ax = fl.figure(lay["width"], height=lay["height"], plot=lay["plot"])
    fl.header(fig, "그림 2-6-6", "단계 수와 전체 성공률")
    fl.y_title(ax, "전체 성공률")

    # 1) 축을 먼저 확정한다
    ax.set_xlim(0, 20)
    ax.set_xticks(STEPS, [f"{n}단계" for n in STEPS])
    ax.set_ylim(0, 1)
    ax.set_yticks([0, 0.5, 1])
    fl.fixed_decimals(ax, "y", 1)

    # 2) 계열: 메시지 선 p = 0.95, 맥락 선 p = 0.99(rank 1), p = 0.9(rank 2)
    ln_99 = fl.line(ax, xs, curve("0.99"), role="context", rank=1, markevery=marks)
    ln_90 = fl.line(ax, xs, curve("0.9"), role="context", rank=2, markevery=marks)
    ln_95 = fl.line(ax, xs, curve("0.95"), role="message", markevery=marks)

    # 3) 칩: 메시지가 기대는 정본 결과 두 개(강조 칩 2개)
    v95 = [float(s) for s in N61["0.95"]]
    fl.chip(ax, 10, v95[2], N61["0.95"][2], accent=True, canon="N6-1", side="above-right")
    end_chip = fl.chip(ax, 20, v95[3], N61["0.95"][3], accent=True, canon="N6-1",
                       side=lay["end_side"])
    label_95 = dict(line=ln_95, text="p = 0.95")
    if lay["end_side"] == "right":
        label_95["after"] = end_chip

    # 4) 선 끝 직접 라벨
    fl.direct_labels(ax, [
        dict(line=ln_99, text="p = 0.99"),
        label_95,
        dict(line=ln_90, text="p = 0.9"),
    ])

    out = Path(__file__).with_name(lay["out"])
    title = "그림 2-6-6 단계 수와 전체 성공률" + (" (EPUB 세로 변형)" if variant == "v" else "")
    fl.save(fig, out, title=title, desc=DESC, preview_dir=preview_dir)
    print(out.relative_to(ROOT))


# 정본 점이 곡선 위 계산값과 같은 자리인지 확인(반올림 차이 0.0005 이내)
for p, vals in N61.items():
    for n, s in zip(STEPS, vals):
        assert abs(float(p) ** n - float(s)) < 0.0006, (p, n, s)

for variant in ("body", "v"):
    build(variant, preview_dir=sys.argv[1] if len(sys.argv) > 1 else None)
