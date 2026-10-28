"""그림 3-8-1 생성기: 이중 시스템 개념도(System 2, 잠재 표현, System 1, 각자의 입력과 갱신 주기).

설계서(3권 8장 그림 명세): "이중 시스템 개념도: System 2(VLM, 느림) → 잠재 표현 → System 1(작은 정책, 빠름)
→ 행동, 각각의 입력과 주기. 주기 표기는 N8-1 문자열(System 2 약 7~9 Hz, System 1 200 Hz). 🔄 관리표
Figure Helix 행 값이므로 캡션에 기준일을 붙임. 고속 센서 입력은 회색(ink), 개념색은 3개 이하"

메시지(6.1절): System 2의 잠재 표현을 빠른 System 1이 행동으로 바꿉니다
주기 값: N8-1 문자열 그대로. 🔄 관리표 값이라 숫자 칩을 달지 않습니다(6.5절, 6.10절).
개념색: c-token-image(카메라 이미지), c-token-text(언어 지시, 중립), c-token-action(행동). 3개.
고속 센서 입력은 개념색 없이 입력 상자(ink)로 둡니다.
강조: 별도 accent 없이 System 1 상자를 메시지 상자(1.5px ink-900, paper-warm)로 둡니다(6.2절).

배치: 세 열(입력, 처리, 갱신 주기)과 네 행(System 2, 잠재 표현, System 1, 행동).
가로 한 줄 노드는 2개(입력 상자, 모듈 상자)라 세로 변형은 필수가 아닙니다(5.11절).

실행(저장소 루트 또는 이 출력 폴더의 심볼릭 링크 기준):
    .venv/bin/python vol3-physical-ai/ch08/figures/3-8-1.build.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# 출력 폴더에는 assets 심볼릭 링크가 있습니다. 저장소 안에서는 parents[3]이 루트입니다.
for base in (HERE, *HERE.parents):
    if (base / 'assets/svg-parts/_build/figkit.py').exists():
        sys.path.insert(0, str(base / 'assets/svg-parts/_build'))
        break
import figkit as fk  # noqa: E402
from figkit import b  # noqa: E402

# N8-1 정본 문자열(🔄 Figure Helix 행)
S2_HZ, S2_PER = '약 7~9 Hz', '1초에 약 7~9번'
S1_HZ, S1_PER = '200 Hz', '1초에 200번'

DESC = ("이중 시스템 VLA의 두 모듈과 각자의 입력, 갱신 주기를 구조도로 나타냈습니다. "
        "System 2(VLM)는 카메라 이미지와 언어 지시를 받아 약 7~9 Hz로 잠재 표현을 냅니다. "
        "System 1(작은 정책)은 이 잠재 표현과 고속 센서 입력을 함께 받아 200 Hz로 행동을 냅니다. "
        "느리게 생각하는 System 2의 결과를 빠른 System 1이 행동으로 바꿉니다.")

fig = fk.Figure('3-8-1', '이중 시스템 VLA', variant='body', height='auto', desc=DESC)

# 열(8 격자): 입력 168, 처리 208, 갱신 주기 152, 사이 32
X_IN, W_IN = 24, 168
X_MOD, W_MOD = 224, 208
X_HZ = 464
X_LAT, W_LAT = 248, 160          # 잠재 표현은 처리 열 가운데에 좁게

# 행: 열 머리 기준선 72, 본문 88부터. 화살표로 잇는 상자 사이 32(5.3절)
HEAD_Y = 72
Y_S2, Y_LAT, Y_S1, Y_ACT = 88, 192, 272, 376
H_MOD, H_LAT, H_ACT = 72, 48, 48

# 열 머리(2.2절, ink-500 14/400)
for x, name in ((X_IN, '입력'), (X_MOD, '처리'), (X_HZ, '갱신 주기')):
    fig.text(x, HEAD_Y, name, 14, 400, fill='ink-500')

with fig.group(canon='N8-1'):
    # System 2 입력: 카메라 이미지(이미지 토큰), 언어 지시(텍스트 토큰)
    in2 = fig.box(X_IN, Y_S2, W_IN, H_MOD, 'input')
    fig.token(X_IN + 16, Y_S2 + 8, '카메라 이미지', kind='image')
    fig.token(X_IN + 16, Y_S2 + 40, '언어 지시', kind='text')

    s2 = fig.box(X_MOD, Y_S2, W_MOD, H_MOD, 'step',
                 lines=[[b('System 2'), ' (VLM)'], '장면과 지시를 이해'])
    lat = fig.box(X_LAT, Y_LAT, W_LAT, H_LAT, 'input', lines=[b('잠재 표현')], align='center')

    # System 1 입력: 고속 센서 입력(회색, 개념색 없음)
    in1 = fig.box(X_IN, Y_S1, W_IN, H_MOD, 'input',
                  lines=[b('고속 센서 입력'), '이미지, 로봇 상태'])
    s1 = fig.box(X_MOD, Y_S1, W_MOD, H_MOD, 'message',
                 lines=[[b('System 1'), ' (작은 정책)'], '잠재 표현을 행동으로'])
    act = fig.box(X_MOD, Y_ACT, W_MOD, H_ACT, 'step', band='c-token-action', lines=[b('행동')])

    fig.connect(in2, s2, 'right', 'left')
    fig.connect(s2, lat, 'bottom', 'top')
    fig.connect(lat, s1, 'bottom', 'top')
    fig.connect(in1, s1, 'right', 'left')
    fig.connect(s1, act, 'bottom', 'top')

    # 갱신 주기(🔄 값, 칩 없음): 값 16/500, 풀이 14/400 ink-600. 기준선은 상자 안 두 줄과 맞춤
    for y, hz, per, pace in ((Y_S2, S2_HZ, S2_PER, '느림'), (Y_S1, S1_HZ, S1_PER, '빠름')):
        fig.text(X_HZ, y + 27, [b(hz)], 16, 500, max_w=152)
        fig.text(X_HZ, y + 49, f'{pace}, {per}', 14, 400, fill='ink-600', max_w=152)

fk.check_col([s2, s1, act])
fk.check_col([in2, in1])
fk.check_row([in2, s2])

out = HERE / '3-8-1.svg'
probs = fig.save(out)
print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')

# ---------------------------------------------------------------- EPUB 세로 변형(5.11절 선택 변형)
# 폭 328에서 입력 칩(카메라 이미지, 언어 지시)과 느림, 빠름 풀이가 14 글자라 약 7 CSS px로 작아집니다.
# 같은 노드, 같은 글자, 같은 주기 문자열을 위에서 아래로 쌓고, 갱신 주기는 모듈 상자 셋째 줄로 옮깁니다.
# 잠재 표현과 고속 센서 입력은 System 1로 함께 들어가므로 한 행에 나란히 둡니다.
v = fk.Figure('3-8-1', '이중 시스템 VLA', variant='v', height='auto', desc=DESC)
L, FW = v.L, v.content_w                      # 16, 328
H3 = 96                                       # 세 줄 상자
with v.group(canon='N8-1'):
    vin2 = v.box(L, 56, FW, 72, 'input')
    v.token(L + 16, 64, '카메라 이미지', kind='image')
    v.token(L + 16, 96, '언어 지시', kind='text')
    vs2 = v.box(L, 160, FW, H3, 'step',
                lines=[[b('System 2'), ' (VLM)'], '장면과 지시를 이해', [b(S2_HZ), f'  느림, {S2_PER}']])
    vlat = v.box(L, 288, 152, 72, 'input', lines=[b('잠재 표현')], align='center')
    vin1 = v.box(L + 176, 288, 152, 72, 'input', lines=[b('고속 센서 입력'), '이미지, 로봇 상태'])
    vs1 = v.box(L, 392, FW, H3, 'message',
                lines=[[b('System 1'), ' (작은 정책)'], '잠재 표현을 행동으로', [b(S1_HZ), f'  빠름, {S1_PER}']])
    vact = v.box(L, 520, FW, 48, 'step', band='c-token-action', lines=[b('행동')])
    at_lat = (vlat.cx - L) / FW
    at_in1 = (vin1.cx - L) / FW
    v.connect(vin2, vs2, 'bottom', 'top')
    v.connect(vs2, vlat, 'bottom', 'top', a_at=at_lat)
    v.connect(vlat, vs1, 'bottom', 'top', b_at=at_lat)
    v.connect(vin1, vs1, 'bottom', 'top', b_at=at_in1)
    v.connect(vs1, vact, 'bottom', 'top')
fk.check_col([vin2, vs2, vs1, vact])
fk.check_row([vlat, vin1])
outv = HERE / '3-8-1.v.svg'
probs = v.save(outv)
print(outv.name, f'{v.W} x {v.H}', 'lint:', probs or 'OK')
