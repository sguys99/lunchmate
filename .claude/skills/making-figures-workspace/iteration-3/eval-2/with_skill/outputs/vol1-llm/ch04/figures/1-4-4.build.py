"""그림 1-4-4 생성기: '안'의 어텐션 가중치 (P8 가중치 띠)

명세(1권 설계서 4장 그림 명세, S): 러닝 예문에서 "안"이 다른 토큰을 보는 연결선. 띠 폭 = 가중치
메시지: '안'은 '왔어요'를 가장 많이 봅니다
강조: 왔어요로 가는 연결 띠, 숫자 칩 0.576 (도착 라벨 왔어요는 600 ink-900)
정본: 1권 N4-2. K: 상자가, 안, 왔어요. softmax [0.140, 0.284, 0.576] (문자열 그대로)
설계 판단
- 패턴 P8(patterns.md 5장). 640 x 320, 출발 상자 x 48 136 x 80, 도착 상자 x 384 120 x 48 피치 64,
  칩 열 x 520 56 x 24, 열 머리 기준선 72. 세로 변형은 360 x 320, 출발 x 16 72 x 80, 도착 x 184 88 x 48, 칩 x 280.
- 연결을 선 굵기 대신 면(띠)으로 그리고 띠 폭을 가중치에 비례시킨다(style-guide 6.12절).
  비례 상수는 가중치 1.0 = 80(출발 상자 높이). 세 가중치의 합이 1이라 세 띠가 출발 상자 오른쪽 변을
  빈틈없이 나눈다. 가장 가는 띠(0.140)는 11.2라 4 이상.
- 띠 면은 ink-200, 메시지 띠 하나만 accent 면. 띠 사이 1px paper 테두리로 출발점에서 갈라 보이게 한다.
- 띠를 상자보다 먼저 그려 상자 테두리와 개념 띠가 띠 끝을 덮게 한다.
- 쿼리 상자에 c-query 띠, 키 상자에 c-key 띠(1권 6.2절 개념색). 상자 테두리는 입력 상자(ink-200)로 낮춘다.
- 정본 행에 가중치가 있는 토큰(상자가, 안, 왔어요)만 그린다. 러닝 예문의 주문한, 아직은 캡션 caveat로 밝힌다.
- 세로 변형은 본문 폭 328 축소에서 토큰 이름(16)이 약 8 CSS px로 작아져 만든다(choose-type.md 5장 3번).
실행: .venv/bin/python vol1-llm/ch04/figures/1-4-4.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b  # noqa: E402

# ---- 정본 문자열(설계서 7장 N4-2 그대로, float로 바꾸지 않음)
QUERY = '안'
KEYS = [('상자가', '0.140'), ('안', '0.284'), ('왔어요', '0.576')]
EMPH = 2                                             # 메시지 띠: 왔어요
MSG = "'안'은 '왔어요'를 가장 많이 봅니다"
SUBJECT = "'안'의 어텐션 가중치"
DESC = ("토큰 '안'이 상자가, 안, 왔어요를 얼마나 보는지를 연결 띠의 굵기로 나타냈습니다. "
        "가중치는 상자가 0.140, 안 0.284, 왔어요 0.576이고 세 띠의 굵기를 합하면 쿼리 상자 한 변과 같습니다. "
        "가장 굵은 띠가 왔어요로 이어져, '안'은 '왔어요'를 가장 많이 봅니다.")
SCALE = 80                                           # 가중치 1.0 = 80 (출발 상자 높이)

# ---- 배치: 판마다 다른 값은 여기에만 (y 좌표는 두 판이 같음)
LAYOUT = {
    'body': dict(qx=48, qw=136, kx=384, kw=120, cx=520, leader='band'),
    'v':    dict(qx=16, qw=72, kx=184, kw=88, cx=280, leader='chip'),
}
HEAD_Y = 72        # 열 머리 기준선: 첫 키 상자 위 끝 88보다 16 위
KEY_Y0, PITCH = 88, 64
Q_Y, Q_H = 136, 80


def ribbon(x0, x1, s0, s1, t0, t1, fill):
    """출발 변 구간 [s0, s1]에서 도착 변 구간 [t0, t1]까지의 띠(제어점은 가운데 x)."""
    xm = (x0 + x1) / 2
    d = (f'M{x0:g},{s0:g} C{xm:g},{s0:g} {xm:g},{t0:g} {x1:g},{t0:g} '
         f'L{x1:g},{t1:g} C{xm:g},{t1:g} {xm:g},{s1:g} {x0:g},{s1:g} Z')
    return (f'<path d="{d}" fill="{fk.color(fill)}" stroke="{fk.color("paper")}" '
            f'stroke-width="1" stroke-linejoin="round"/>')


def build(variant, preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('1-4-4', SUBJECT, variant=variant, height=320, desc=DESC)
    qx, qw, kx, kw, cx = L['qx'], L['qw'], L['kx'], L['kw'], L['cx']
    ky = [KEY_Y0 + i * PITCH for i in range(len(KEYS))]

    # 열 머리(14, ink-500)
    for x, head in ((qx, '쿼리 q'), (kx, '키 k'), (cx, '가중치')):
        fig.text(x, HEAD_Y, head, 14, 400, 'ink-500')

    with fig.group('weight-bands', canon='N4-2'):
        # 띠: 출발 상자 오른쪽 변을 위에서부터 가중치 비율로 나누고, 도착 상자 가운데에 같은 폭으로 닿음
        s = Q_Y
        mid_emph = None
        for i, (_, w) in enumerate(KEYS):
            h = float(w) * SCALE
            tc = ky[i] + 24
            fill = 'accent' if i == EMPH else 'ink-200'
            fig.add(ribbon(qx + qw, kx, s, s + h, tc - h / 2, tc + h / 2, fill))
            if i == EMPH:
                mid_emph = ((qx + qw + kx) / 2, ((s + h) + (tc + h / 2)) / 2)   # 띠 아래 변의 가운데
            s += h

        # 상자: 띠 끝을 덮도록 나중에 그림
        fig.box(qx, Q_Y, qw, Q_H, 'input', band='c-query', lines=[[b(QUERY)]], size=20, weight=600)
        boxes = []
        for i, (name, _) in enumerate(KEYS):
            emph = i == EMPH
            boxes.append(fig.box(kx, ky[i], kw, 48, 'input', band='c-key', lines=[name],
                                 weight=600 if emph else 400, fill='ink-900' if emph else 'ink-600'))
        fk.check_col(boxes)

        # 칩 열: 도착 상자 옆, 상자 가운데 높이
        chips = [fig.chip(cx, y + 12, w, emph=(i == EMPH), canon='N4-2') for i, ((_, w), y) in
                 enumerate(zip(KEYS, ky))]

    # 메시지 지시선 1개
    if L['leader'] == 'band':      # 본문: 강조 띠 가운데에서 아래로, 글은 오른쪽
        x, y = mid_emph
        fig.leader((fk.snap(x, 4), fk.snap_up(y, 4)), 'down', 40, MSG, message=True, side='right')
    else:                          # 세로: 강조 칩 아래에서 내려 칩 열 아래 빈 곳에, 글은 점 왼쪽
        c = chips[EMPH]
        fig.leader(c.port('bottom', 0.5), 'down', 32, MSG, message=True, side='left')

    out = Path(__file__).with_name('1-4-4.v.svg' if variant == 'v' else '1-4-4.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
