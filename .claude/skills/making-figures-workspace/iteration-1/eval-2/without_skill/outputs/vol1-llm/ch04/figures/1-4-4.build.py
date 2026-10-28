"""그림 1-4-4: 러닝 예문에서 '안'이 다른 토큰을 보는 정도(띠 폭 = 가중치).

설계서: 1권 4장 그림 명세 1-4-4(S) "러닝 예문에서 '안'이 다른 토큰을 보는 연결선. 띠 폭 = 가중치"
정본: 1권 N4-2 softmax 결과 상자가 0.140, 안 0.284, 왔어요 0.576
규칙: style-guide 6.12절(띠 폭 = 가중치, 비례 상수 1.0 = 80, 합 1이면 출발 변을 빈틈없이 나눔),
      5.11절(EPUB 세로 변형), 6.5절(숫자 칩), 1권 설계서 6.3절(러닝 예문 토큰 분할 고정)

토큰 분할은 concepts.py 미리보기와 같은 '주문한 | 상자가 | 아직 | 안 | 왔어요'입니다.
N4-2 손계산은 상자가, 안, 왔어요 세 토큰만 쓰므로, 나머지 두 토큰은 띠 없이 '계산 제외'로 둡니다.

실행(저장소 루트): .venv/bin/python vol1-llm/ch04/figures/1-4-4.build.py
      같은 폴더에 1-4-4.svg(본문 폭 640)와 1-4-4.v.svg(세로 변형 360)를 만들고 lint 결과를 출력합니다.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import concepts as cp  # noqa: E402
import figkit as fk  # noqa: E402

SUBJECT = "'안'의 어텐션 가중치"
DESC = ("러닝 예문 '주문한 상자가 아직 안 왔어요'에서 토큰 '안'이 다른 토큰을 보는 정도를 띠로 나타냈고, "
        "띠 폭이 가중치입니다. 손계산에 쓴 세 토큰의 가중치는 상자가 0.140, 안 0.284, 왔어요 0.576이고 "
        "합은 1입니다. '주문한'과 '아직'은 계산에서 뺐습니다. '안'은 '왔어요'를 가장 많이 봅니다.")

TOKENS = ['주문한', '상자가', '아직', '안', '왔어요']
WEIGHTS = {'상자가': '0.140', '안': '0.284', '왔어요': '0.576'}   # N4-2 결과 문자열 그대로
MESSAGE = '왔어요'
K = 80                      # 비례 상수: 가중치 1.0 = 80(6.12절)
TOKEN_H = 32                # 텍스트 토큰 칩 32(글자 16/500)

ACCENT = cp.tok('accent')['main']
BAND = cp.ink(200)
PAPER = cp.ink('paper')


def partition(a0):
    """출발 변 a0부터 길이 K를 가중치 비율로 빈틈없이 나눈다. 순서는 토큰 순서(띠가 교차하지 않음)."""
    out, x = {}, a0
    for t in TOKENS:
        if t in WEIGHTS:
            w = float(WEIGHTS[t]) * K
            out[t] = (x, x + w)
            x += w
    assert abs(x - (a0 + K)) < 0.01, '가중치 합이 1이 아닙니다'
    return out


def ribbon(src, dst, s, d, axis):
    """띠 한 개. axis='y'면 위(출발 변 y=s)에서 아래(도착 변 y=d)로, 'x'면 왼쪽에서 오른쪽으로.
    src, dst는 출발 변과 도착 변 위의 (시작, 끝) 구간. 옆선은 양 끝 접선이 변에 수직인 3차 곡선."""
    (a0, a1), (b0, b1) = src, dst
    m = (s + d) / 2

    def P(u, v):  # (변 위 좌표, 흐름 방향 좌표) -> SVG 점
        return f'{u:.2f},{v:.2f}' if axis == 'y' else f'{v:.2f},{u:.2f}'
    return (f'M{P(a0, s)} C{P(a0, m)} {P(b0, m)} {P(b0, d)} L{P(b1, d)} '
            f'C{P(b1, m)} {P(a1, m)} {P(a1, s)} Z')


def band_svg(t, path):
    fill = ACCENT if t == MESSAGE else BAND
    cls = 'band band-msg' if t == MESSAGE else 'band'
    return (f'<path class="{cls}" data-token="{t}" data-weight="{WEIGHTS[t]}" d="{path}" '
            f'fill="{fill}" stroke="{PAPER}" stroke-width="1" stroke-linejoin="round"/>')


def excluded_token(fig, x, y, w, label):
    """손계산에서 뺀 토큰: 같은 자리, 같은 크기. 면 없이 ink-400 파선 테두리(비활성), 글자 ink-500."""
    fig.add(f'<rect class="token-off" x="{x + .5:g}" y="{y + .5:g}" width="{w - 1}" height="{TOKEN_H - 1}" '
            f'fill="{PAPER}" stroke="{cp.ink(400)}" stroke-width="1" stroke-dasharray="4 3"/>'
            + cp.text(x + w / 2, y + 22, label, 16, 500, fill=cp.ink(500), anchor='middle'),
            bottom=y + TOKEN_H)
    return fk.Box(x, y, w, TOKEN_H, 'chip')


def token(fig, x, y, w, label):
    s, _ = cp.token_chip(x, y, label, h=TOKEN_H, w=w)
    fig.add(s, bottom=y + TOKEN_H)
    bx = fk.Box(x, y, w, TOKEN_H, 'chip')
    fig.boxes.append(bx)
    return bx


def build_body():
    """본문 폭 640 x 320. '안'(쿼리)을 위에, 예문 다섯 토큰을 아래 한 줄에 두고 띠를 위에서 아래로 내린다."""
    fig = fk.Figure('1-4-4', SUBJECT, variant='body', height=320, desc=DESC, fid='f144')
    TW, GAP = 80, 32
    x0 = fig.L + (fig.content_w - (5 * TW + 4 * GAP)) // 2           # 56
    xs = {t: x0 + i * (TW + GAP) for i, t in enumerate(TOKENS)}      # 56, 168, 280, 392, 504
    Y_SRC, Y_TOK, Y_CHIP = 56, 224, 272
    src_x = xs['안']                                                   # 출발 변 = 도착 '안' 위, 폭 K
    assert TW == K

    parts = partition(src_x)
    with fig.group('attention-bands', canon='N4-2'):
        for t, (a0, a1) in parts.items():
            w = a1 - a0
            c = xs[t] + TW / 2
            fig.add(band_svg(t, ribbon((a0, a1), (c - w / 2, c + w / 2), Y_SRC + TOKEN_H, Y_TOK, 'y')))

    # 토큰은 띠 뒤에 그려 띠 끝을 테두리가 덮게 한다
    token(fig, src_x, Y_SRC, K, '안')
    fig.text(src_x - 16, Y_SRC + 20, '보는 토큰', 14, 400, 'ink-600', anchor='end')
    for t in TOKENS:
        if t in WEIGHTS:
            token(fig, xs[t], Y_TOK, TW, t)
        else:
            excluded_token(fig, xs[t], Y_TOK, TW, t)

    # 도착 토큰 아래 숫자 칩(정본 문자열 그대로), 뺀 토큰 아래는 보통 글자
    for t in TOKENS:
        c = xs[t] + TW / 2
        if t in WEIGHTS:
            w = fig.chip_w(WEIGHTS[t])
            fig.chip(fk.snap(c - w / 2, 4), Y_CHIP, WEIGHTS[t], emph=(t == MESSAGE), canon='N4-2')
        else:
            fig.text(c, Y_CHIP + 17, '계산 제외', 14, 400, 'ink-500', anchor='middle')
    return fig


def build_v():
    """세로 변형 360 x 304. 같은 토큰, 같은 숫자, 같은 강조. 예문 토큰을 위에서 아래로 쌓고 띠를 왼쪽에서 오른쪽으로."""
    fig = fk.Figure('1-4-4', SUBJECT, variant='v', height='auto', desc=DESC, fid='f144v')
    SRC_W, TW = 56, 80
    X_SRC, X_TOK, X_CHIP = fig.L, 192, 288
    ys = {t: 56 + i * (TOKEN_H + 16) for i, t in enumerate(TOKENS)}  # 56, 104, 152, 200, 248
    cy = ys['안'] + TOKEN_H / 2
    Y_SRC = int(cy - K / 2)                                            # 출발 변(오른쪽 변) 길이 = K

    parts = partition(Y_SRC)
    with fig.group('attention-bands', canon='N4-2'):
        for t, (a0, a1) in parts.items():
            w = a1 - a0
            c = ys[t] + TOKEN_H / 2
            fig.add(band_svg(t, ribbon((a0, a1), (c - w / 2, c + w / 2), X_SRC + SRC_W, X_TOK, 'x')))

    # 출발 토큰은 오른쪽 변이 K여야 하므로 높이 80인 토큰 상자로 그린다(글자는 세로 가운데)
    fig.add(f'<rect x="{X_SRC + .5:g}" y="{Y_SRC + .5:g}" width="{SRC_W - 1}" height="{K - 1}" '
            f'fill="{cp.ink(50)}" stroke="{cp.ink(200)}" stroke-width="1"/>'
            + cp.text(X_SRC + SRC_W / 2, Y_SRC + K / 2 + 6, '안', 16, 500, anchor='middle'),
            bottom=Y_SRC + K)
    fig.boxes.append(fk.Box(X_SRC, Y_SRC, SRC_W, K, 'chip'))
    fig.text(X_SRC, Y_SRC - 12, '보는 토큰', 14, 400, 'ink-600')
    for t in TOKENS:
        if t in WEIGHTS:
            token(fig, X_TOK, ys[t], TW, t)
        else:
            excluded_token(fig, X_TOK, ys[t], TW, t)
    for t in TOKENS:
        if t in WEIGHTS:
            fig.chip(X_CHIP, ys[t] + 4, WEIGHTS[t], emph=(t == MESSAGE), canon='N4-2')
        else:
            fig.text(X_CHIP, ys[t] + 21, '계산 제외', 14, 400, 'ink-500')
    return fig


if __name__ == '__main__':
    for fig, name in ((build_body(), '1-4-4.svg'), (build_v(), '1-4-4.v.svg')):
        out = HERE / name
        probs = fig.save(out)
        print(name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')
