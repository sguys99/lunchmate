"""그림 3-8-1 생성기: 이중 시스템 VLA (P9 입출력 블록, 모듈 둘)

명세(3권 설계서 8장 그림 명세): "이중 시스템 개념도: System 2(VLM, 느림) → 잠재 표현 → System 1(작은 정책, 빠름)
  → 행동, 각각의 입력과 주기. 주기 표기는 N8-1 문자열(System 2 약 7~9 Hz, System 1 200 Hz).
  🔄 관리표 Figure Helix 행 값이므로 캡션에 기준일을 붙임. 고속 센서 입력은 회색(ink), 개념색은 3개 이하"
메시지: 느린 System 2의 잠재 표현을 빠른 System 1이 행동으로 바꿉니다
정본: 3권 N8-1. 'System 2 약 7~9 Hz', 'System 1 200 Hz'(문자열 그대로). 🔄 관리표 값이라 숫자 칩을 달지 않고
      모듈 상자 둘째 줄에 보통 글자로 둔다(design-rules 4.2절).
설계 판단:
- P9 열(입력 x 24 폭 160, 모듈 x 232 폭 176, 출력 x 456 폭 160, 열 사이 48)을 그대로 쓰고, 모듈 둘을
  가운데 열에 위아래로 쌓아 그 사이에 잠재 표현을 둔다. 위 단은 System 2와 입력 둘(장면, 지시),
  아래 단은 System 1과 고속 센서 입력, 출력 행동. 입력은 늘 왼쪽에서, 연결은 위에서 아래로 들어온다.
- 두 모듈은 같은 역할이라 같은 크기(176 x 112, 입력 묶음 48 + 16 + 48 높이)로 맞춘다.
  모듈 둘과 잠재 표현이 세로로 쌓여 캔버스는 480(P9 기본 320에서 한 단계 올림, note에 기록).
- 개념색 3개: 장면 c-token-image, 지시 c-token-text, 행동 c-token-action(1권 6.2절 멀티모달 묶음).
  고속 센서 입력은 명세대로 개념 띠 없는 입력 상자(ink-200). 강조는 잠재 표현 상자 하나(accent).
- 메시지 지시선은 두지 않는다. 강조 상자가 메시지 자리를 대신한다(design-rules 9장 8번).
- 세로 변형(360): patterns.md P9 '모듈 둘 세로 변형' 와이어프레임. 강조 대상(잠재 표현)이 연결이라
  둘째 입력 행의 오른쪽 칸 상자로 둔다. 두 칸은 152 x 48, 사이 24(와이어프레임 156, 16은 8 격자 밖).
  출력 행동도 본문 판처럼 입력과 같은 크기(152 x 48)로 왼쪽 칸에 둔다(와이어프레임 328이면 같은 열
  입력 상자와 크기가 달라 lint 경고).
실행: .venv/bin/python vol3-physical-ai/ch08/figures/3-8-1.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b  # noqa: E402

# ---- 정본 문자열(3권 설계서 7장 N8-1 그대로) 과 글
S2_HZ = '약 7~9 Hz'
S1_HZ = '200 Hz'
S2_LINES = [[b('System 2'), ' VLM'], f'느림, {S2_HZ}']
S1_LINES = [[b('System 1'), ' 작은 정책'], f'빠름, {S1_HZ}']
LATENT = [b('잠재 표현')]
SUBJECT = '이중 시스템 VLA'
DESC = ("이중 시스템 VLA를 System 2, 잠재 표현, System 1, 행동으로 이어지는 블록도로 나타냈습니다. "
        "VLM인 System 2는 장면과 지시를 받아 약 7~9 Hz로 느리게 잠재 표현을 냅니다. "
        "작은 정책인 System 1은 이 잠재 표현과 고속 센서 입력을 받아 200 Hz로 빠르게 행동을 냅니다. "
        "느린 System 2의 잠재 표현을 빠른 System 1이 행동으로 바꿉니다.")

# ---- 배치: 판마다 다른 값은 여기에만
LAYOUT = {
    'body': dict(width=None),
    'v': dict(width=None),
}


def build_body(fig):
    X_IN, X_MOD, X_OUT = 24, 232, 456
    W_IN, W_MOD = 160, 176
    Y_S2, MOD_H = fig.top, 112
    Y_LAT = Y_S2 + MOD_H + 32                     # 200
    Y_S1 = Y_LAT + 48 + 32                        # 280
    y_sense = Y_S1 + (MOD_H - 48) // 2            # 312

    scene = fig.box(X_IN, Y_S2, W_IN, 48, 'input', band='c-token-image', lines=['장면'])
    instr = fig.box(X_IN, Y_S2 + 64, W_IN, 48, 'input', band='c-token-text', lines=['지시'])
    s2 = fig.box(X_MOD, Y_S2, W_MOD, MOD_H, 'step', lines=S2_LINES)
    lat = fig.box(X_MOD, Y_LAT, W_MOD, 48, 'accent', lines=LATENT)
    sense = fig.box(X_IN, y_sense, W_IN, 48, 'input', lines=['고속 센서 입력'])
    s1 = fig.box(X_MOD, Y_S1, W_MOD, MOD_H, 'step', lines=S1_LINES)
    act = fig.box(X_OUT, y_sense, W_IN, 48, 'input', band='c-token-action', lines=['행동'])

    fk.check_col([scene, instr, sense])
    fk.check_col([s2, lat, s1])
    fk.check_row([sense, act])

    fig.connect(scene, s2, 'right', 'left', b_at=24)
    fig.connect(instr, s2, 'right', 'left', b_at=88)
    fig.connect(s2, lat, 'bottom', 'top', tone='arr-ink900')
    fig.connect(lat, s1, 'bottom', 'top', tone='arr-ink900')
    fig.connect(sense, s1, 'right', 'left')
    fig.connect(s1, act, 'right', 'left')
    return [s2, s1]


def build_v(fig):
    L, FULL = fig.L, fig.content_w                # 16, 328
    # 두 칸 행: P9 와이어프레임 값(156, 사이 16)은 8 격자가 아니라 figkit이 막는다. 같은 바깥 끝(16, 344)을
    # 지키는 가장 가까운 격자 값 152, 사이 24로 둔다(note에 기록).
    (XA, WH), (XB, _) = fk.columns(2, L, fig.R, gap=24)
    ys = fk.stack(fig.top, [48, 64, 48, 64, 48], gap=32)   # 56, 136, 232, 312, 408

    scene = fig.box(XA, ys[0], WH, 48, 'input', band='c-token-image', lines=['장면'])
    instr = fig.box(XB, ys[0], WH, 48, 'input', band='c-token-text', lines=['지시'])
    s2 = fig.box(L, ys[1], FULL, 64, 'step', lines=S2_LINES)
    sense = fig.box(XA, ys[2], WH, 48, 'input', lines=['고속 센서 입력'])
    lat = fig.box(XB, ys[2], WH, 48, 'accent', lines=LATENT)
    s1 = fig.box(L, ys[3], FULL, 64, 'step', lines=S1_LINES)
    act = fig.box(XA, ys[4], WH, 48, 'input', band='c-token-action', lines=['행동'])

    fk.check_row([scene, instr])
    fk.check_row([sense, lat])
    fk.check_col([s2, s1])
    fk.check_col([scene, sense, act])

    ca, cb = WH // 2, XB - L + WH // 2            # 두 칸 가운데(모듈 왼쪽 끝에서 잰 거리)
    fig.connect(scene, s2, 'bottom', 'top', b_at=ca)
    fig.connect(instr, s2, 'bottom', 'top', b_at=cb)
    fig.connect(s2, lat, 'bottom', 'top', a_at=cb, tone='arr-ink900')
    fig.connect(sense, s1, 'bottom', 'top', b_at=ca)
    fig.connect(lat, s1, 'bottom', 'top', b_at=cb, tone='arr-ink900')
    fig.connect(s1, act, 'bottom', 'top', a_at=ca, b_at=ca)
    return [s2, s1]


def build(variant, preview=None):
    fig = fk.Figure('3-8-1', SUBJECT, variant=variant, height='auto', desc=DESC,
                    width=LAYOUT[variant]['width'])
    with fig.group(canon='N8-1'):
        (build_body if variant == 'body' else build_v)(fig)
    out = Path(__file__).with_name('3-8-1.v.svg' if variant == 'v' else '3-8-1.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
