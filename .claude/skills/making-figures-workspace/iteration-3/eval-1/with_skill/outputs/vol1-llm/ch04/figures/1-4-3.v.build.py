"""그림 1-4-3 어텐션 계산 4단계: EPUB 세로 변형(360)

명세: 1권 설계서 4장 그림 명세 1-4-3(M) "어텐션 계산 4단계 흐름도(N4-2 숫자를 각 단계에 표기)"
메시지: '안'은 '왔어요'의 정보를 가장 많이 가져옵니다
정본: 1권 N4-2. q = [1, 2]. K 상자가 [1, 0], 안 [0, 1], 왔어요 [1, 1]. V [1, 0], [0, 1], [0.5, 0.5]. d = 2.
      점수 [1, 2, 3] → ÷√2 → [0.707, 1.414, 2.121] → softmax [0.140, 0.284, 0.576] → 출력 [0.428, 0.572]
설계 판단: 본문 판은 1-4-3.mmd(M). 같은 원본을 360으로 렌더링하면 경고 "내용 폭 458px가
          캔버스 내용 폭 328px를 넘음"이 나와(choose-type 5장 manual) 세로 판만 figkit으로 다시 그린다.
          노드 7개, 문구, 정본 숫자, 강조(03 메시지 상자와 0.576 밑줄)는 본문 판과 같고 좌표만 다르다.
          P1 세로 변형 치수: 단계 상자 x 16, 폭 328, 피치 96. 입력 상자 x 56, 폭 288.
          척추 x 40(L + 24)을 따라 흐름이 내려가고, q, k는 01 위에서, v는 04 바로 위에서 척추에 합류한다.
          합류선과 척추는 상자보다 먼저 그려 선 끝이 테두리에 묻히게 한다.
실행: .venv/bin/python vol1-llm/ch04/figures/1-4-3.v.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m, em  # noqa: E402

# ---- 정본 문자열(설계서 7장 N4-2 그대로, 본문 판 1-4-3.mmd와 같은 글자)
Q_VAL = '[1, 2]'
K_VAL = '[1, 0] [0, 1] [1, 1]'
V_VAL = '[1, 0] [0, 1] [0.5, 0.5]'
S1_VAL = '[1, 2, 3]'
S2_VAL = '[0.707, 1.414, 2.121]'
S3_HEAD, S3_EMPH = '[0.140, 0.284, ', '0.576'
S4_VAL = '[0.428, 0.572]'
SUBJECT = '어텐션 계산 4단계'
MSG = "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다"
DESC = ("토큰 '안'의 어텐션 계산을 점수, 크기 조정, softmax, 가중합의 네 단계 흐름도로 나타냈습니다. "
        "점수 1, 2, 3은 루트 2로 나누면 0.707, 1.414, 2.121이 되고, softmax를 거친 가중치는 "
        "상자가 0.140, 안 0.284, 왔어요 0.576입니다. 이 가중치로 값을 섞은 출력은 0.428과 0.572로, "
        "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다.")

# ---- 배치(세로 변형만. 본문 판은 1-4-3.mmd)
LAYOUT = {
    'v': dict(x_in=56, w_in=288, gap_in=24, gap=32, h=64),
}


def build(variant, preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('1-4-3', SUBJECT, variant=variant, height='auto', desc=DESC)
    sx, X, W, XI, WI, H = fig.spine_x, fig.L, fig.content_w, L['x_in'], L['w_in'], L['h']
    # 세로 좌표: q, k(입력) → 01 → 02 → 03 → v(입력) → 04
    y_q = fig.top
    y_k = y_q + H + L['gap_in']
    y1, y2, y3 = fk.stack(y_k + H + L['gap'], [H] * 3, gap=L['gap'])
    y_v = y3 + H + L['gap']
    y4 = y_v + H + L['gap']
    mid = H // 2
    with fig.group(canon='N4-2'):
        # 척추와 합류선 먼저(상자 테두리가 선 끝을 덮음)
        fig.wire([(XI, y_q + mid), (sx, y_q + mid), (sx, y1)])
        fig.wire([(XI, y_k + mid), (sx, y_k + mid)], end='join')
        fig.wire([(sx, y1 + H), (sx, y2)])
        fig.wire([(sx, y2 + H), (sx, y3)])
        fig.wire([(sx, y3 + H), (sx, y4)])
        fig.wire([(XI, y_v + mid), (sx, y_v + mid)], end='join')
        # 입력 상자(단계가 아니므로 input, 개념 띠)
        ins = [fig.box(XI, y_q, WI, H, 'input', band='c-query', lines=[[b('쿼리 q'), ' (안)'], m(Q_VAL)]),
               fig.box(XI, y_k, WI, H, 'input', band='c-key',
                       lines=[[b('키 k'), ' (상자가, 안, 왔어요)'], m(K_VAL)])]
        steps = [fig.box(X, y1, W, H, 'step', lines=[[b('01 점수'), ' q × k'], m(S1_VAL)]),
                 fig.box(X, y2, W, H, 'step', lines=[[b('02 크기 조정'), ' ÷ √d, d = 2'], m(S2_VAL)]),
                 fig.box(X, y3, W, H, 'message', lines=[[b('03 가중치'), ' softmax, 합 = 1'],
                                                       [m(S3_HEAD), em(S3_EMPH), m(']')]])]
        ins.append(fig.box(XI, y_v, WI, H, 'input', band='c-value',
                           lines=[[b('값 v'), ' (상자가, 안, 왔어요)'], m(V_VAL)]))
        steps.append(fig.box(X, y4, W, H, 'step', lines=[[b('04 가중합'), ' Σ 가중치 × v'], m(S4_VAL)]))
        fk.check_col(steps)
        fk.check_col(ins)
    out = Path(__file__).with_name('1-4-3.v.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    for v in LAYOUT:
        build(v, sys.argv[1] if len(sys.argv) > 1 else None)
