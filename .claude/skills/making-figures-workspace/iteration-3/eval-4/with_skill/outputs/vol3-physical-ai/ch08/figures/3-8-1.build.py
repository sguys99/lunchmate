"""그림 3-8-1 생성기: 이중 시스템 개념도 (P9 입출력 블록, 모듈 둘)

명세(3권 설계서 8장 그림 명세): "이중 시스템 개념도: System 2(VLM, 느림) → 잠재 표현 →
  System 1(작은 정책, 빠름) → 액션, 각각의 입력과 주기. 주기 표기는 N8-1 문자열(System 2 약 7~9 Hz,
  System 1 200 Hz). 🔄 관리표 Figure Helix 행 값이므로 캡션에 기준일을 붙임. 고속 센서 입력은
  회색(ink), 개념색은 3개 이하"
메시지: 느린 System 2가 잠재 표현으로 빠른 System 1을 이끕니다
강조: System 2에서 System 1로 가는 잠재 표현 연결(1.5 accent 화살표와 600 라벨). 세로 변형은 같은 연결을
      둘째 입력 행 오른쪽 칸의 accent 상자로 그림(patterns.md P9 모듈 둘 세로 변형)
정본: 3권 N8-1. 'System 2 약 7~9 Hz', 'System 1 200 Hz'(문자열 그대로). 🔄 관리표 8.3 Figure Helix 행 값이라
      숫자 칩을 달지 않고 상자 안 보통 글자(500)로 씀(design-rules 4.2절)
설계 판단:
  - P9 모듈 둘 본문(320): 입력 x 24 폭 160, 블록 x 232 폭 176, 출력 x 456 폭 160. System 2는 입력 둘의 묶음
    높이 112, System 1은 이름과 값 두 줄 64. 두 모듈 사이 48에 수직 화살표, 라벨은 선 오른쪽 8.
  - 입력 이름은 설계서 8.2절 문구 그대로(장면, 지시, 고속 센서 입력). 센서 종류는 붙이지 않음.
  - 개념색 3개: 장면(c-token-image), 지시(c-token-text), 액션(c-token-action) 띠. 고속 센서 입력은 띠 없는
    회색 입력 상자(명세). 모듈은 단계 상자(ink-600), 입력과 출력은 입력 상자(ink-200).
  - 입력과 출력 상자 라벨은 ink-600 400으로 낮추고, 모듈 이름과 잠재 표현만 ink-900 600(1-4-4 키 라벨과 같은 위계).
  - 느림, 빠름은 주기 줄에 함께 둬 두 모듈 상자의 줄 구성을 같게 맞춤(이름 + 역할 / 주기 + 속도).
실행: .venv/bin/python vol3-physical-ai/ch08/figures/3-8-1.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m  # noqa: E402

# ---- 정본 문자열(3권 설계서 7장 N8-1 그대로)
HZ_S2 = '약 7~9 Hz'
HZ_S1 = '200 Hz'
MSG = '느린 System 2가 잠재 표현으로 빠른 System 1을 이끕니다'
SUBJECT = '이중 시스템 VLA'
DESC = ('System 2는 장면과 지시를, System 1은 잠재 표현과 고속 센서 입력을 받아 액션을 내는 두 모듈 구조를 '
        '블록으로 나타냈습니다. '
        'System 2는 VLM이며 약 7~9 Hz로 느리게, System 1은 작은 정책이며 200 Hz로 빠르게 돌아갑니다. '
        '두 모듈은 잠재 표현 하나로 이어져, 느린 System 2가 잠재 표현으로 빠른 System 1을 이끕니다.')

S2_LINES = [[b('System 2'), ' VLM'], [m(HZ_S2), ', 느림']]
S1_LINES = [[b('System 1'), ' 작은 정책'], [m(HZ_S1), ', 빠름']]
LATENT = '잠재 표현'
LOW = 'ink-600'                                  # 입력과 출력 라벨은 낮춤(design-rules 9장 5번)

# ---- 배치: 판마다 다른 값만
LAYOUT = {
    'body': dict(flow='row'),
    'v':    dict(flow='col'),
}


def build_body(fig):
    top = fig.top                                         # 56
    with fig.group(canon='N8-1'):
        scene = fig.box(24, top, 160, 48, 'input', band='c-token-image', lines=['장면'], fill=LOW)
        instr = fig.box(24, top + 64, 160, 48, 'input', band='c-token-text', lines=['지시'], fill=LOW)
        s2 = fig.box(232, top, 176, 112, 'step', lines=S2_LINES)
        s1_y = s2.bottom + 48                             # 216
        s1 = fig.box(232, s1_y, 176, 64, 'step', lines=S1_LINES)
        sensor = fig.box(24, s1_y + 8, 160, 48, 'input', lines=['고속 센서 입력'], fill=LOW)
        action = fig.box(456, s1_y + 8, 160, 48, 'input', band='c-token-action', lines=['액션'], fill=LOW)
        fk.check_col([scene, instr, sensor])
        fk.check_col([s2, s1])

        fig.connect(scene, s2, 'right', 'left', b_at=24)
        fig.connect(instr, s2, 'right', 'left', b_at=88)
        fig.connect(sensor, s1, 'right', 'left')
        fig.connect(s1, action, 'right', 'left')
        # 강조: 잠재 표현 연결(1.5 accent 화살표 + 600 라벨, 글자는 ink-900)
        cx = int(s2.cx)
        fig.wire([(cx, s2.bottom), (cx, s1.top)], tone='arr-accent', width=1.5)
        fig.text(cx + 8, s2.bottom + 28, LATENT, 16, 600)


def build_v(fig):
    L, top = fig.L, fig.top                               # 16, 56
    cw = 152
    x2 = L + cw + 24                                      # 192
    with fig.group(canon='N8-1'):
        scene = fig.box(L, top, cw, 48, 'input', band='c-token-image', lines=['장면'], fill=LOW)
        instr = fig.box(x2, top, cw, 48, 'input', band='c-token-text', lines=['지시'], fill=LOW)
        s2 = fig.box(L, top + 80, fig.content_w, 64, 'step', lines=S2_LINES)            # 136
        row2 = s2.bottom + 32                                                             # 232
        sensor = fig.box(L, row2, cw, 48, 'input', lines=['고속 센서 입력'], fill=LOW)
        latent = fig.box(x2, row2, cw, 48, 'accent', lines=[[b(LATENT)]])
        s1 = fig.box(L, row2 + 80, fig.content_w, 64, 'step', lines=S1_LINES)            # 312
        action = fig.box(L, s1.bottom + 32, cw, 48, 'input', band='c-token-action', lines=['액션'], fill=LOW)
        fk.check_row([scene, instr])
        fk.check_row([sensor, latent])
        fk.check_col([s2, s1])

        fig.connect(scene, s2, 'bottom', 'top', b_at=scene.cx - L)
        fig.connect(instr, s2, 'bottom', 'top', b_at=instr.cx - L)
        fig.connect(sensor, s1, 'bottom', 'top', b_at=sensor.cx - L)
        fig.connect(s1, action, 'bottom', 'top', a_at=action.cx - L)
        # 강조: 잠재 표현 상자와 그 앞뒤 연결
        lx = int(latent.cx)
        fig.wire([(lx, s2.bottom), (lx, latent.top)], tone='arr-accent', width=1.5)
        fig.wire([(lx, latent.bottom), (lx, s1.top)], tone='arr-accent', width=1.5)


def build(variant, preview=None):
    fig = fk.Figure('3-8-1', SUBJECT, variant=variant, height='auto', desc=DESC)
    (build_body if LAYOUT[variant]['flow'] == 'row' else build_v)(fig)
    out = Path(__file__).with_name('3-8-1.v.svg' if variant == 'v' else '3-8-1.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
