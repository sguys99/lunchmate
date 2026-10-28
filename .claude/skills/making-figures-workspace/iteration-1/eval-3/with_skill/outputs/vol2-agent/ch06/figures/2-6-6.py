"""그림 2-6-6: 단계 수에 따른 전체 성공률.

명세: 2권 설계서 6장 그림 명세 2-6-6(C). 단계 수에 따른 전체 성공률 곡선, p = 0.99, 0.95, 0.9 세 줄(N6-1).
  강조 선은 p = 0.95(E6-1 손계산과 같은 선)
메시지: 단계별 성공률 0.95도 20단계면 0.358로 떨어집니다
데이터: 2권 설계서 7장 N6-1(E6-1 전체 성공률 = p^n, 단계마다 독립 가정)
  p=0.99: 1, 5, 10, 20단계 → 0.99, 0.951, 0.904, 0.818
  p=0.95: 0.95, 0.774, 0.599, 0.358
  p=0.9: 0.9, 0.590, 0.349, 0.122
  선은 정본 식 p^n을 정수 단계 1~20에서 계산해 직선으로 이은 것이다. 정본 점(5, 10, 20단계)에만
  점을 찍고, 칩은 메시지가 기대는 p = 0.95의 10단계 0.599와 20단계 0.358 두 개만 단다.
  1단계 점은 세 선의 간격이 약 7px라 점이 서로 닿아 찍지 않는다(값은 p 자신이라 라벨로 충분).
가정값: 없음(독립 가정은 캡션 단서로 밝힘)
출처: 정본만 씀
🔄: 아님

실행: .venv/bin/python vol2-agent/ch06/figures/2-6-6.py [미리보기폴더]
출력: vol2-agent/ch06/figures/2-6-6.svg (640 × 320)와 EPUB 세로 변형 2-6-6.v.svg (360 × 392, 5.11절 선택 변형)
  세로 변형 사유: 폭 328에서 메시지 칩(0.358)과 선 이름이 14 글자뿐이라 약 7.2 CSS px로 작아진다
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "assets/charts"))
import figlib as fl  # noqa: E402

# N6-1 정본 문자열 그대로(칩 숫자와 글자 단위로 대조한다). 키는 단계 수
N61 = {
    "0.99": {1: "0.99", 5: "0.951", 10: "0.904", 20: "0.818"},
    "0.95": {1: "0.95", 5: "0.774", 10: "0.599", 20: "0.358"},
    "0.9": {1: "0.9", 5: "0.590", 10: "0.349", 20: "0.122"},
}
STEPS = list(range(1, 21))          # 그리기용 정수 단계(정본 식 p^n)
CANON_STEPS = [5, 10, 20]           # 점을 찍는 정본 단계
MARK = [STEPS.index(n) for n in CANON_STEPS]
LEADER_V = 3
MSG = "단계가 쌓일수록 곱으로 줄어듭니다"
DESC = ("단계마다 서로 독립적으로 성공률 p로 성공한다고 할 때, 단계 수 1~20에 따른 전체 성공률을 "
        "p = 0.99, 0.95, 0.9 세 선으로 나타냈습니다. p = 0.99는 10단계 0.904, 20단계 0.818로 "
        "완만히 줄고, p = 0.9는 20단계에 0.122까지 떨어집니다. p = 0.95는 10단계 0.599를 거쳐 "
        "20단계 0.358까지 내려가, 단계가 쌓일수록 전체 성공률이 곱으로 줄어듭니다.")


def curve(p: str):
    """정본 식 p^n. 정본 단계에서는 정본 문자열 값을 그대로 쓴다."""
    pv = float(p)
    return [float(N61[p][n]) if n in N61[p] else pv ** n for n in STEPS]


# 축 영역 px (왼, 위, 오른, 아래). 본문은 가로축 제목 자리 때문에 아래를 240으로(examples/example-log-n6-1.py 판). 세로 변형은 1-5-5.v 실측 판(그림 영역 같음)에 가로축 제목 자리 24를 더하고, 끝 칩을 점 위로 올린다
LAYOUT = {
    "body": dict(width="body", height=320, plot=(104, 88, 432, 240), end_side="right",
                 leader_x=15, out="2-6-6.svg"),
    "v": dict(width=360, height=392, plot=(64, 128, 264, 320), end_side="above",
              leader_x=LEADER_V, leader_kw=dict(direction="up", length=48),
              out="2-6-6.v.svg"),
}


def build(variant, preview_dir=None):
    lay = LAYOUT[variant]
    fig, ax = fl.figure(lay["width"], height=lay["height"], plot=lay["plot"])
    fl.header(fig, "그림 2-6-6", "단계 수와 전체 성공률")
    fl.y_title(ax, "전체 성공률")
    fl.x_title(ax, "단계 수")

    # 1) 축을 먼저 확정한다
    ax.set_xlim(0, 20.5)
    ax.set_xticks([1, 5, 10, 20])
    ax.set_ylim(0, 1)
    ax.set_yticks([0, 0.5, 1])
    fl.fixed_decimals(ax, "y", 1)

    # 2) 계열: 맥락 선 둘을 먼저, 메시지 선(p = 0.95)을 위에
    ln_99 = fl.line(ax, STEPS, curve("0.99"), role="context", markevery=MARK)
    ln_90 = fl.line(ax, STEPS, curve("0.9"), role="context", markevery=MARK)
    ln_95 = fl.line(ax, STEPS, curve("0.95"), role="message", markevery=MARK)

    # 3) 칩: 메시지가 기대는 p = 0.95의 10단계, 20단계 두 값만(강조 칩 2개)
    fl.chip(ax, 10, float(N61["0.95"][10]), N61["0.95"][10], accent=True, canon="N6-1",
            side="above-right")
    end_chip = fl.chip(ax, 20, float(N61["0.95"][20]), N61["0.95"][20], accent=True,
                       canon="N6-1", side=lay["end_side"])

    # 4) 선 끝 직접 라벨(범례 대신)
    fl.direct_labels(ax, [
        dict(line=ln_99, text="p = 0.99"),
        dict(line=ln_95, text="p = 0.95", **({"after": end_chip} if lay["end_side"] == "right" else {})),
        dict(line=ln_90, text="p = 0.9"),
    ])

    # 5) 메시지 지시선: 본문은 10단계와 20단계 사이 메시지 선 위(15단계)에서 자동 배치.
    #    정본 점(5, 10단계)에서는 깨끗한 자리가 없어 선 위 중간점을 쓴다(examples/example-log-n6-1.py 선례).
    #    세로 변형은 3단계 선 위에서 위로 48 올려 세로축 제목 줄보다 위에 문장을 둔다
    fl.leader(ax, fl.on_line(ln_95, lay["leader_x"]), MSG, **lay.get("leader_kw", {}))

    out = Path(__file__).with_name(lay["out"])
    title = "그림 2-6-6 단계 수와 전체 성공률" + (" (EPUB 세로 변형)" if variant == "v" else "")
    fl.save(fig, out, title=title, desc=DESC, preview_dir=preview_dir)
    print(out)


for variant in ("body", "v"):
    build(variant, preview_dir=sys.argv[1] if len(sys.argv) > 1 else None)
