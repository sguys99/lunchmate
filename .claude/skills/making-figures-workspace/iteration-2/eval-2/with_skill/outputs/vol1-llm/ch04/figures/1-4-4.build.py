"""그림 1-4-4 생성기: '안'이 다른 토큰을 보는 정도 (P8 가중치 띠)

명세: 1권 설계서 4장 그림 명세 1-4-4(S) "러닝 예문에서 "안"이 다른 토큰을 보는 연결선. 띠 폭 = 가중치"
메시지: '안'은 '왔어요'를 가장 많이 봅니다
정본: 1권 N4-2. softmax 결과 [0.140, 0.284, 0.576] (키 순서 상자가, 안, 왔어요). 문자열 그대로 칩에 씀
설계 판단
- 연결은 선(stroke)이 아니라 면(띠)으로 그리고 띠 폭 = 가중치 x 80(가중치 1.0 = 쿼리 상자 높이 80)으로
  잡습니다(style-guide 6.12절). 선 굵기 네 단계로는 0.140, 0.284, 0.576이 단계로 뭉개지기 때문입니다.
- 세 띠는 쿼리 상자 오른쪽 변(높이 80)을 위에서부터 빈틈없이 나눠 "가중치 합 = 1"을 모양으로 보입니다.
  띠 사이는 1px paper 테두리로 틈을 둡니다. 가장 가는 띠(0.140)도 11.2라 하한 4를 넘습니다.
- 토큰은 정본 N4-2에 가중치가 있는 상자가, 안, 왔어요 셋만 그립니다(러닝 예문보다 줄인 사실은 캡션 caveat).
  분할은 1-2-1과 같은 어절 단위를 따릅니다.
- 강조는 흐름의 결과 자리인 왔어요로 가는 띠와 칩 0.576 한 덩어리(accent 2곳). 나머지 띠는 ink-200 면.
- 쿼리와 키 상자는 단계가 아니라 띠의 출발점과 도착점이라 입력 상자 종류(1px ink-200)로 낮추고,
  개념색은 왼쪽 4px 띠(c-query 실선, c-key 파선)에만 씁니다.
- 치수는 patterns.md P8(1-4-4 실측) 표 그대로입니다. 본문 640 x 320, 세로 변형 360 x 320(y 좌표 같음).
- 세로 변형: 본문 폭을 표시 폭 328로 줄이면 열 머리와 토큰 이름이 7~8 CSS px로 내려가
  (choose-type.md 5장 3번) 같은 소스에서 함께 만듭니다. 쿼리 72, 키 88 폭은 P8 세로 변형 실측 값이며
  figkit 최소 폭 120 경고는 이 실측을 따른 결과입니다.

실행: .venv/bin/python vol1-llm/ch04/figures/1-4-4.build.py [미리보기폴더]
      1-4-4.svg(640)와 1-4-4.v.svg(360)를 함께 만듭니다.
"""
import sys
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b  # noqa: E402

# ---- 정본 문자열(1권 설계서 7장 N4-2 그대로, 계산에는 float 사본만 씀)
CANON = 'N4-2'
QUERY = '안'
KEYS = ['상자가', '안', '왔어요']
WEIGHTS = ['0.140', '0.284', '0.576']
ACCENT_I = 2                                         # 왔어요: 가장 큰 가중치(메시지)
MSG = "'안'은 '왔어요'를 가장 많이 봅니다"
SUBJECT = "'안'이 토큰을 보는 정도"
DESC = ("토큰 '안'이 상자가, 안, 왔어요를 얼마나 보는지를 연결 띠의 굵기로 나타냈습니다. "
        "가중치는 상자가 0.140, 안 0.284, 왔어요 0.576이고 셋을 더하면 1입니다. "
        "가장 굵은 띠가 왔어요로 이어져, '안'은 '왔어요'를 가장 많이 봅니다.")

SCALE = 80                                           # 가중치 1.0 = 80(쿼리 상자 높이, 6.12절)
HEAD_Y = 72                                          # 열 머리 기준선(첫 키 상자 위 끝 88보다 16 위)
KEY_Y0, KEY_H, KEY_PITCH = 88, 48, 64
Q_Y, Q_H = 136, 80

# ---- 배치: 판마다 다른 값은 여기에만(patterns.md P8 본문, 세로 변형 실측)
LAYOUT = {
    'body': dict(qx=48, qw=136, kx=384, kw=120, cx=520, height=320,
                 leader='band', out='1-4-4.svg'),
    'v':    dict(qx=16, qw=72, kx=184, kw=88, cx=280, height=320,
                 leader='chip', out='1-4-4.v.svg'),
}


def band_path(x0, x1, top0, bot0, top1, bot1):
    """출발 변 [top0, bot0]에서 도착 변 [top1, bot1]로 가는 띠. 제어점은 두 변의 가운데 x(P8)."""
    xm = (x0 + x1) / 2
    return (f'M{x0:g},{top0:g} C{xm:g},{top0:g} {xm:g},{top1:g} {x1:g},{top1:g} '
            f'L{x1:g},{bot1:g} C{xm:g},{bot1:g} {xm:g},{bot0:g} {x0:g},{bot0:g} Z')


def build(variant, preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('1-4-4', SUBJECT, variant=variant, height=L['height'], desc=DESC)
    qx, qw, kx, kw, cx = L['qx'], L['qw'], L['kx'], L['kw'], L['cx']
    ws = [float(w) for w in WEIGHTS]
    assert abs(sum(ws) - 1) < 1e-9

    # 열 머리(14, ink-500): 쿼리 q, 키 k, 가중치
    for x, name in ((qx, '쿼리 q'), (kx, '키 k'), (cx, '가중치')):
        fig.text(x, HEAD_Y, name, 14, 400, 'ink-500')

    key_y = [KEY_Y0 + i * KEY_PITCH for i in range(len(KEYS))]
    x0, x1 = qx + qw, kx
    with fig.group('attn-bands', canon=CANON):
        # 띠를 상자보다 먼저 그려 상자 테두리가 띠 끝을 덮게 한다
        top0 = Q_Y
        acc_geom = None
        for i, (w, ky) in enumerate(zip(ws, key_y)):
            t = w * SCALE
            bot0 = top0 + t
            c1 = ky + KEY_H / 2
            top1, bot1 = c1 - t / 2, c1 + t / 2
            face = fk.color('accent') if i == ACCENT_I else fk.color('ink-200')
            fig.add(f'<path d="{band_path(x0, x1, top0, bot0, top1, bot1)}" fill="{face}" '
                    f'stroke="{fk.color("paper")}" stroke-width="1" data-weight="{WEIGHTS[i]}"/>')
            if i == ACCENT_I:
                acc_geom = (top0, bot0, top1, bot1)
            top0 = bot0

    q = fig.box(qx, Q_Y, qw, Q_H, 'input', band='c-query', lines=[b(QUERY)], size=20, weight=600)
    keys = [fig.box(kx, y, kw, KEY_H, 'input', band='c-key', lines=[k]) for k, y in zip(KEYS, key_y)]
    fk.check_col(keys)

    chips = []
    with fig.group(canon=CANON):
        for i, (w, ky) in enumerate(zip(WEIGHTS, key_y)):
            chips.append(fig.chip(cx, ky + 12, w, emph=(i == ACCENT_I), canon=CANON))

    # 메시지 지시선 1개
    if L['leader'] == 'band':
        # 본문: 강조 띠의 가운데(x 284)에서 띠 아래 끝부터 수직으로 내리고 글자는 오른쪽
        top0, bot0, top1, bot1 = acc_geom
        xm = (x0 + x1) // 2
        y_edge = fk.snap_up((bot0 + bot1) / 2, 4)          # 가운데 x에서 띠 아래 끝(베지어 t = 0.5)
        fig.leader((xm, y_edge), 'down', 44, MSG, message=True, side='right')
    else:
        # 세로 변형: 강조 칩 아래에서 내려 칩 열 아래 빈 곳을 글 자리로(글자는 점 왼쪽 끝 정렬)
        c = chips[ACCENT_I]
        fig.leader((c.x + c.w / 2, c.bottom), 'down', 32, MSG, message=True, side='left')

    out = Path(__file__).with_name(L['out'])
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')
    return q


if __name__ == '__main__':
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        for v in LAYOUT:
            build(v, sys.argv[1] if len(sys.argv) > 1 else None)
    for w in caught:
        print('경고:', w.message)
