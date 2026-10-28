"""그림 1-4-3 어텐션 계산 4단계: EPUB 세로 변형(360) 전용 생성기

명세: 1권 설계서 4장 그림 1-4-3(M) "어텐션 계산 4단계 흐름도(N4-2 숫자를 각 단계에 표기)"
본문 판: 1-4-3.mmd(Mermaid, 640 × 640). 이 스크립트는 1-4-3.v.svg만 만든다.
메시지: '안'은 '왔어요'의 정보를 가장 많이 가져옵니다
정본: 1권 N4-2(문자열 그대로)
  q = [1, 2]. K 상자가 [1, 0], 안 [0, 1], 왔어요 [1, 1]. V [1, 0], [0, 1], [0.5, 0.5]. d = 2
  점수 [1, 2, 3] → ÷√2 → [0.707, 1.414, 2.121] → softmax [0.140, 0.284, 0.576] → 출력 [0.428, 0.572]
설계 판단:
  - Mermaid 세로 변형 자동 렌더링(--variant, 360)이 "내용 폭 458px가 캔버스 내용 폭 328px를 넘음"
    경고를 내서 S로 다시 그린다(choose-type 5장 manual, 3.4절).
  - 노드, 글자, 정본 숫자, 강조 위치는 본문 .mmd와 같다. 바꾸는 것은 좌표뿐이다(svg-guide 10장).
  - P1 세로 변형: 단계 상자 x 16, 폭 328, 피치 96. 입력 상자 x 56, 폭 288, 척추 x 40을 따라
    내려 단계에 꽂는다. q, k는 01 바로 위, v는 처음 쓰이는 04 바로 위로 옮긴다.
  - 강조는 03 가중치 메시지 상자와 0.576 밑줄 한 덩어리. 지시선은 본문 판처럼 쓰지 않는다.
  - 척추와 합류선이 상자 테두리에 묻히도록 선을 먼저 그리고 상자를 나중에 그린다.
실행: .venv/bin/python vol1-llm/ch04/figures/1-4-3.v.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m, em  # noqa: E402

# ---- 정본 문자열(설계서 7장 N4-2 그대로, float로 바꾸지 않음)
Q_VEC = '[1, 2]'
K_VECS = '[1, 0] [0, 1] [1, 1]'
V_VECS = '[1, 0] [0, 1] [0.5, 0.5]'
SCORE = '[1, 2, 3]'
SCALED = '[0.707, 1.414, 2.121]'
W_HEAD = '[0.140, 0.284, '
W_MSG = '0.576'
OUT = '[0.428, 0.572]'
TOKENS = ' (상자가, 안, 왔어요)'

SUBJECT = '어텐션 계산 4단계'
MSG = "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다"
DESC = ("토큰 '안'의 어텐션 계산을 점수, 크기 조정, softmax, 가중합의 네 단계 흐름도로 나타냈습니다. "
        "점수 1, 2, 3은 루트 2로 나누면 0.707, 1.414, 2.121이 되고, softmax를 거친 가중치는 "
        "상자가 0.140, 안 0.284, 왔어요 0.576입니다. 이 가중치로 값을 섞은 출력은 0.428과 0.572로, "
        "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다.")

# ---- 배치(세로 변형 한 판)
LAYOUT = {
    'v': dict(x_in=56, w_in=288, h=64, gap_in=24, gap_step=32),
}


def build(variant='v', preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('1-4-3', SUBJECT, variant=variant, height='auto', desc=DESC)
    sx = fig.spine_x                                   # 40
    X, W, H = fig.L, fig.content_w, L['h']             # 단계 상자 16, 328, 64
    xi, wi = L['x_in'], L['w_in']                      # 입력 상자 56, 288

    # 위에서 아래로: q, k(입력) → 01 → 02 → 03 → v(입력) → 04
    y_q, y_k = fk.stack(fig.top, [H, H], gap=L['gap_in'])
    y1, y2, y3 = fk.stack(y_k + H + L['gap_step'], [H] * 3, gap=L['gap_step'])
    y_v = y3 + H + L['gap_in']
    y4 = y_v + H + L['gap_step']

    with fig.group(canon='N4-2'):
        # 선 먼저: 입력 왼쪽 변 가운데에서 척추로 들어가 아래 단계 위 변에 꽂힌다
        fig.wire([(xi, y_q + H // 2), (sx, y_q + H // 2), (sx, y1)], 'arrow')
        fig.wire([(xi, y_k + H // 2), (sx, y_k + H // 2)], 'join')
        fig.wire([(sx, y1 + H), (sx, y2)], 'arrow')
        fig.wire([(sx, y2 + H), (sx, y3)], 'arrow')
        fig.wire([(sx, y3 + H), (sx, y4)], 'arrow')
        fig.wire([(xi, y_v + H // 2), (sx, y_v + H // 2)], 'join')

        steps = [
            fig.box(X, y1, W, H, 'step', lines=[[b('01 점수'), ' q × k'], m(SCORE)]),
            fig.box(X, y2, W, H, 'step', lines=[[b('02 크기 조정'), ' ÷ √d, d = 2'], m(SCALED)]),
            fig.box(X, y3, W, H, 'message', lines=[[b('03 가중치'), ' softmax, 합 = 1'],
                                                   [m(W_HEAD), em(W_MSG), m(']')]]),
        ]
        fig.box(xi, y_q, wi, H, 'input', band='c-query', lines=[[b('쿼리 q'), ' (안)'], m(Q_VEC)])
        fig.box(xi, y_k, wi, H, 'input', band='c-key', lines=[[b('키 k'), TOKENS], m(K_VECS)])
        fig.box(xi, y_v, wi, H, 'input', band='c-value', lines=[[b('값 v'), TOKENS], m(V_VECS)])
        steps.append(fig.box(X, y4, W, H, 'step', lines=[[b('04 가중합'), ' Σ 가중치 × v'], m(OUT)]))
        fk.check_col(steps)

    out = Path(__file__).with_name('1-4-3.v.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
