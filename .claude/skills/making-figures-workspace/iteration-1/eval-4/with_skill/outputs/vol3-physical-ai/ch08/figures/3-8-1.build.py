"""그림 3-8-1 생성기: 이중 시스템 VLA 개념도

설계서(3권 8장 그림 명세, S): "이중 시스템 개념도: System 2(VLM, 느림) → 잠재 표현 → System 1(작은 정책,
빠름) → 행동, 각각의 입력과 주기. 주기 표기는 N8-1 문자열(System 2 약 7~9 Hz, System 1 200 Hz).
🔄 관리표 Figure Helix 행 값이므로 캡션에 기준일을 붙임. 고속 센서 입력은 회색(ink), 개념색은 3개 이하"
메시지(6.1절): 느린 System 2와 빠른 System 1을 잠재 표현이 잇습니다
정본: 3권 N8-1. 'System 2 약 7~9 Hz', 'System 1 200 Hz'(문자열 그대로, 숫자와 단위 사이 줄바꿈 없는 공백)

설계 판단
- 패턴 P9 입출력 블록(patterns.md 부록 A). 열 x 24(입력, 폭 160), 232(모듈, 폭 176), 456(출력, 폭 160).
- P9를 두 층으로 세웠습니다. 위층 System 2, 아래층 System 1을 가운데 열에 쌓고, 그 사이에
  잠재 표현을 두어 "위에서 정한 뜻이 아래로 내려가 행동이 된다"를 세로 한 줄로 읽게 했습니다.
- 강조는 잠재 표현 상자 하나(accent 상자)와 그 앞뒤 화살표 하나(arr-accent 없이 ink-900)로 한 덩어리.
- 주기는 🔄 관리표 값이라 숫자 칩을 달지 않고(design-rules 4.2절) 모듈 상자 셋째 줄 보통 글자(500)로 씁니다.
- 개념색 3개: 카메라 영상(c-token-image), 언어 지시(c-token-text), 행동(c-token-action). 고속 센서
  입력은 명세대로 띠 없는 회색 입력 상자.
- 입력과 출력 상자 글자는 ink-600으로 낮추고 모듈 이름만 ink-900 600으로 둡니다(design-rules 9장 5번).
- 블록 높이는 입력 묶음 높이(48 + 16 + 48 = 112)와 같게(P9 표).
- 세로 변형(choose-type.md 5장 3번, 선택): 폭 328에서 주기 글자가 8.2 CSS px로 작아져 둡니다.
  폭 400(svg-guide 10장 상한)에서 왼쪽 열(x 16, 폭 160)에 모듈 사슬, 오른쪽 열(x 208, 폭 176)에 입력을
  둡니다. 360에서는 지시선 글(168)이 잠재 표현 오른쪽에 들어가지 않아 400을 씁니다.

실행: .venv/bin/python vol3-physical-ai/ch08/figures/3-8-1.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m  # noqa: E402

NB = ' '
# ---- 정본 문자열(3권 설계서 7장 N8-1)
S2_HZ = f'약 7~9{NB}Hz'
S1_HZ = f'200{NB}Hz'
SUBJECT = '이중 시스템 VLA'
LEAD = '느린 생각과 빠른 손을 잇습니다'
DESC = ("이중 시스템 VLA의 구조를 위아래 두 층으로 나타냈습니다. 위층의 System 2는 VLM으로 만든 느린 모듈이고, "
        "카메라 영상과 언어 지시를 받아 약 7~9 Hz로 잠재 표현을 냅니다. 아래층의 System 1은 작은 정책으로 만든 "
        "빠른 모듈이고, 이 잠재 표현과 고속 센서 입력(영상, 관절 상태)을 받아 200 Hz로 행동을 냅니다. "
        "느린 System 2와 빠른 System 1을 잠재 표현이 잇습니다.")

# ---- 배치: 판마다 다른 값은 여기에만
LAYOUT = {
    'body': dict(flow='tiers', XI=24, WI=160, XM=232, WM=176, XO=456, WO=160),
    'v':    dict(flow='col', width=400, XC=16, WC=160, XI=208, WI=176),
}


def module_lines(name, role, hz):
    return [b(name), role, m(hz)]


def build_body(fig, L):
    XI, WI, XM, WM, XO, WO = (L[k] for k in ('XI', 'WI', 'XM', 'WM', 'XO', 'WO'))
    y2 = fig.top                       # System 2 층 위 끝
    cam = fig.box(XI, y2, WI, 48, 'input', band='c-token-image', lines=['카메라 영상'], fill='ink-600')
    ins = fig.box(XI, y2 + 64, WI, 48, 'input', band='c-token-text', lines=['언어 지시'], fill='ink-600')
    s2 = fig.box(XM, y2, WM, 112, 'step', lines=module_lines('System 2', 'VLM, 느림', S2_HZ))
    lat = fig.box(XM, s2.bottom + 32, WM, 48, 'accent', lines=[b('잠재 표현')])
    s1 = fig.box(XM, lat.bottom + 32, WM, 112, 'step', lines=module_lines('System 1', '작은 정책, 빠름', S1_HZ))
    sen = fig.box(XI, s1.y + 24, WI, 64, 'input', lines=['고속 센서 입력', '영상, 관절 상태'], fill='ink-600')
    act = fig.box(XO, s1.y + 32, WO, 48, 'input', band='c-token-action', lines=['행동'], fill='ink-600')
    for src in (cam, ins):
        fig.connect(src, s2, 'right', 'left', b_at=(src.cy - s2.y))
    fig.connect(s2, lat, 'bottom', 'top', tone='arr-ink900')
    fig.connect(lat, s1, 'bottom', 'top', tone='arr-ink900')
    fig.connect(sen, s1, 'right', 'left', b_at=(sen.cy - s1.y))
    fig.connect(s1, act, 'right', 'left', a_at=(act.cy - s1.y))
    fig.leader(lat.port('right'), 'right', 24, LEAD, message=True)


def build_v(fig, L):
    # 왼쪽 열에 System 2, 잠재 표현, System 1, 행동을 위에서 아래로 쌓고, 입력은 오른쪽 열에서
    # 각 모듈로 들어갑니다. 잠재 표현의 오른쪽 열 칸은 비워 메시지 지시선 자리로 씁니다.
    XC, WC, XI, WI = L['XC'], L['WC'], L['XI'], L['WI']
    y = fig.top
    s2 = fig.box(XC, y, WC, 112, 'step', lines=module_lines('System 2', 'VLM, 느림', S2_HZ))
    cam = fig.box(XI, y, WI, 48, 'input', band='c-token-image', lines=['카메라 영상'], fill='ink-600')
    ins = fig.box(XI, y + 64, WI, 48, 'input', band='c-token-text', lines=['언어 지시'], fill='ink-600')
    lat = fig.box(XC, s2.bottom + 32, WC, 48, 'accent', lines=[b('잠재 표현')])
    s1 = fig.box(XC, lat.bottom + 32, WC, 112, 'step', lines=module_lines('System 1', '작은 정책, 빠름', S1_HZ))
    sen = fig.box(XI, s1.y + 24, WI, 64, 'input', lines=['고속 센서 입력', '영상, 관절 상태'], fill='ink-600')
    act = fig.box(XC, s1.bottom + 32, WC, 48, 'input', band='c-token-action', lines=['행동'], fill='ink-600')
    for src in (cam, ins):
        fig.connect(src, s2, 'left', 'right', b_at=(src.cy - s2.y))
    fig.connect(s2, lat, 'bottom', 'top', tone='arr-ink900')
    fig.connect(lat, s1, 'bottom', 'top', tone='arr-ink900')
    fig.connect(sen, s1, 'left', 'right', b_at=(sen.cy - s1.y))
    fig.connect(s1, act, 'bottom', 'top')
    fig.leader(lat.port('right'), 'right', 24, LEAD, message=True)


def build(variant, preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('3-8-1', SUBJECT, variant=variant, height='auto', desc=DESC, width=L.get('width'))
    with fig.group(canon='N8-1'):
        (build_body if L['flow'] == 'tiers' else build_v)(fig, L)
    out = Path(__file__).with_name('3-8-1.v.svg' if variant == 'v' else '3-8-1.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    variants = [a for a in sys.argv[1:] if a in LAYOUT] or list(LAYOUT)
    prev = next((a for a in sys.argv[1:] if a not in LAYOUT), None)
    for v in variants:
        build(v, prev)
