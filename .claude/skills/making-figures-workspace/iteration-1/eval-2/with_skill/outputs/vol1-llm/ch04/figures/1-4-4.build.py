"""그림 1-4-4 생성기: '안'이 토큰을 보는 정도 (P8 가중치 띠)

명세(1권 설계서 4장 그림 명세, 종류 S): 러닝 예문에서 "안"이 다른 토큰을 보는 연결선. 띠 폭 = 가중치
메시지(6.1절): '안'은 '왔어요'를 가장 많이 봅니다
정본: 1권 N4-2. softmax [0.140, 0.284, 0.576](상자가, 안, 왔어요). 칩에는 문자열 그대로 씁니다.
설계 판단
- 연결을 선 굵기가 아니라 면(띠)으로 그리고 폭을 가중치에 비례시킵니다(style-guide 6.12절).
  비례 상수는 하나, 가중치 1.0 = 80 = 쿼리 상자 높이. 세 띠가 쿼리 상자 오른쪽 변을 빈틈없이 나눠
  "가중치의 합 = 1"이 모양으로 보입니다. 가장 가는 띠(0.140)도 11.2라 4 이상입니다.
- 토큰은 N4-2 손계산과 같은 세 개(상자가, 안, 왔어요)만 둡니다. 정본에 나머지 토큰의 가중치가 없어서
  러닝 예문 전체를 그리면 정본 밖 숫자가 필요해집니다. 줄인 사실은 캡션 caveat가 밝힙니다.
- 강조는 한 덩어리: 왔어요로 가는 띠(accent 면)와 칩 0.576. 다른 띠는 ink-200 면, 라벨은 ink-600.
- 치수는 patterns.md P8 표 그대로(본문 640 x 320, 세로 변형 360 x 320, y 좌표는 두 판이 같음).
- 세로 변형: 본문 판을 폭 328로 줄이면 메시지 지시선과 칩(14)이 7.2 CSS px라 읽히지 않습니다
  (choose-type.md 5장 3번, 선택 변형). 숫자, 문구, 강조는 본문 판과 같고 x 좌표만 바꿉니다.
실행: .venv/bin/python vol1-llm/ch04/figures/1-4-4.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402

# ---- 정본 문자열(설계서 7장 N4-2 그대로, 칩에는 이 문자열을 넘김)
CANON = 'N4-2'
QUERY = '안'
KEYS = [('상자가', '0.140'), ('안', '0.284'), ('왔어요', '0.576')]
EMPH = 2                                            # 메시지 대상: 왔어요
SUBJECT = "'안'이 토큰을 보는 정도"
MSG = "'안'은 '왔어요'를 가장 많이 봅니다"
DESC = ("토큰 '안'이 상자가, 안, 왔어요를 얼마나 보는지를 연결 띠의 굵기로 나타냈습니다. "
        "가중치는 상자가 0.140, 안 0.284, 왔어요 0.576이고 셋을 더하면 1입니다. "
        "가장 굵은 띠가 왔어요로 이어져, '안'은 '왔어요'를 가장 많이 봅니다.")

# ---- 공통 y(두 판 같음, P8 표)
HEAD_Y = 68                 # 열 머리 기준선
Q_Y, Q_H = 136, 80          # 쿼리 상자: 키 묶음(88~264)의 가운데에 맞춤
K_Y0, K_H, K_PITCH = 88, 48, 64
UNIT = Q_H                  # 가중치 1.0 = 80
LEADER_LEN = 43             # 띠 아래 끝(약 240)에서 점 283, 글자 기준선 288

# ---- 판마다 다른 값: x와 폭만
LAYOUT = {
    'body': dict(qx=48, qw=136, kx=384, kw=120, cx=520),
    'v':    dict(qx=16, qw=72, kx=184, kw=88, cx=280),
}


def ribbon(x0, x1, s0, s1, t0, t1):
    """출발 변 [s0, s1]에서 도착 변 [t0, t1]로 가는 띠. 제어점은 가운데 x(P8)."""
    xm = (x0 + x1) / 2
    f = lambda v: f'{v:.2f}'.rstrip('0').rstrip('.')  # noqa: E731
    return (f'M{f(x0)},{f(s0)} C{f(xm)},{f(s0)} {f(xm)},{f(t0)} {f(x1)},{f(t0)} '
            f'V{f(t1)} C{f(xm)},{f(t1)} {f(xm)},{f(s1)} {f(x0)},{f(s1)} Z')


def build(variant, preview=None):
    L = LAYOUT[variant]
    qx, qw, kx, kw, cx = L['qx'], L['qw'], L['kx'], L['kw'], L['cx']
    fig = fk.Figure('1-4-4', SUBJECT, variant=variant, height=320, desc=DESC)
    acc = fk.tok('accent')['main']

    # 열 머리(14, ink-500)
    fig.text(qx, HEAD_Y, '쿼리 q', 14, 400, 'ink-500')
    fig.text(kx, HEAD_Y, '키 k', 14, 400, 'ink-500')
    fig.text(cx, HEAD_Y, '가중치', 14, 400, 'ink-500')

    # 띠: 상자보다 먼저 그려 띠 끝이 상자 테두리에 묻히게 한다
    x0, x1 = qx + qw, kx
    s = Q_Y
    mids = []
    with fig.group('weight-ribbons', canon=CANON):
        for i, (_, w) in enumerate(KEYS):
            th = float(w) * UNIT                     # 폭 계산에만 float, 글자는 문자열 그대로
            kc = K_Y0 + i * K_PITCH + K_H / 2
            t0, t1 = kc - th / 2, kc + th / 2
            face = acc if i == EMPH else fk.color('ink-200')
            fig.add(f'<path d="{ribbon(x0, x1, s, s + th, t0, t1)}" fill="{face}" '
                    f'stroke="{fk.color("paper")}" stroke-width="1" data-weight="{w}"/>')
            mids.append((s + th + t1) / 2)           # 가운데 x에서 띠 아래 끝 y
            s += th

    # 쿼리 상자(c-query 띠)와 키 상자 셋(c-key 파선 띠)
    fig.box(qx, Q_Y, qw, Q_H, 'step', band='c-query', lines=[QUERY], size=20, weight=600)
    keys = []
    for i, (name, _) in enumerate(KEYS):
        emph = i == EMPH
        keys.append(fig.box(kx, K_Y0 + i * K_PITCH, kw, K_H, 'step', band='c-key', lines=[name],
                            weight=600 if emph else 400, fill='ink-900' if emph else 'ink-600'))
    fk.check_col(keys)

    # 숫자 칩: 키 상자 가운데 높이, 칩 열 x 하나
    for i, (_, w) in enumerate(KEYS):
        fig.chip(cx, K_Y0 + i * K_PITCH + (K_H - 24) // 2, w, emph=(i == EMPH), canon=CANON)

    # 메시지 지시선: 강조 띠의 가운데에서 아래로 수직, 글자는 오른쪽
    xm = (x0 + x1) // 2
    fig.leader((xm, fk.snap_up(mids[EMPH], 1)), 'down', LEADER_LEN, MSG, message=True, side='right')

    out = Path(__file__).with_name('1-4-4.v.svg' if variant == 'v' else '1-4-4.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
