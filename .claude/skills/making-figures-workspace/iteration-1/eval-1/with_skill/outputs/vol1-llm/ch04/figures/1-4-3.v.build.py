"""그림 1-4-3 어텐션 계산 4단계: EPUB 세로 변형(360) 전용 생성기

명세: 1권 설계서 4장 그림 1-4-3(M). 어텐션 계산 4단계 흐름도(N4-2 숫자를 각 단계에 표기)
본문 판: 1-4-3.mmd(Mermaid, 640 x 640, 경고 0건). 이 스크립트는 1-4-3.v.svg만 만듭니다.
메시지: '안'은 '왔어요'의 정보를 가장 많이 가져옵니다
정본: 1권 N4-2. 점수 [1, 2, 3] → ÷√2 → [0.707, 1.414, 2.121]
      → softmax [0.140, 0.284, 0.576] → 출력 [0.428, 0.572] (문자열 그대로)
설계 판단:
- 본문 판을 render_mermaid.sh --variant(폭 360)로 돌리면 "내용 폭 448px가 캔버스 내용 폭
  328px를 넘음" 경고가 남습니다(쿼리와 키가 한 행). 방향은 이미 TB라 Mermaid로 더 고칠 수
  없어 choose-type.md 5장 표대로 세로 변형만 S로 그립니다(epub_variant: manual).
- P1 단계 흐름 세로 변형 치수: 단계 상자 x 16, 폭 328, 피치 96. 입력 상자 x 56, 폭 288.
  척추 x 40(L + 24)을 따라 입력을 단계 위쪽에 꽂습니다. 값 V는 처음 쓰이는 04 단계 바로 위.
- 노드 7개, 글자, 숫자, 강조(03 메시지 상자와 0.576 밑줄)는 본문 판과 같습니다.
- 화살표 없는 입력 상자 사이 24, 화살표로 이은 상자 사이 32(5.3절).
실행: .venv/bin/python vol1-llm/ch04/figures/1-4-3.v.build.py [미리보기폴더]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # vol*/chNN/figures/ 에서 저장소 루트
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m, em  # noqa: E402

# ---- 정본 문자열(설계서 7장 N4-2 그대로, float로 바꾸지 않음)
Q = '[1, 2]'
K = '[1, 0], [0, 1], [1, 1]'
V = '[1, 0], [0, 1], [0.5, 0.5]'
SCORE = '[1, 2, 3]'
SCALED = '[0.707, 1.414, 2.121]'
W_HEAD, W_MSG = '[0.140, 0.284, ', '0.576'
OUT = '[0.428, 0.572]'

SUBJECT = '어텐션 계산 4단계'
MSG = "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다"
# figures.yml의 alt와 글자 단위로 같아야 합니다(caption-alt.md 3.4절). 1-4-3.mmd의 accDescr와도 같음.
DESC = ("토큰 '안'의 어텐션 계산을 내적 점수, 루트 2로 나누기, softmax, 가중합의 네 단계 흐름도로 "
        "나타냈습니다. 쿼리 [1, 2]와 세 키의 내적 점수 [1, 2, 3]을 루트 2로 나누면 "
        "[0.707, 1.414, 2.121]이 됩니다. softmax를 거친 가중치는 상자가 0.140, 안 0.284, "
        "왔어요 0.576이고, 이 가중치로 값을 섞은 출력은 [0.428, 0.572]입니다. "
        "가중치가 가장 큰 왔어요의 정보를 '안'이 가장 많이 가져옵니다.")

# ---- 배치(세로 변형만)
LAYOUT = {
    'v': dict(x_in=56, gap_in=24, gap=32, h=64),
}


def build(variant='v', preview=None):
    L = LAYOUT[variant]
    fig = fk.Figure('1-4-3', SUBJECT, variant=variant, height='auto', desc=DESC)
    x_in, w_in = L['x_in'], fig.R - L['x_in']          # 56, 288
    sx = fig.spine_x                                   # 40
    h = L['h']

    y_q = fig.top
    y_k = y_q + h + L['gap_in']
    y_s1, y_s2, y_s3 = fk.stack(y_k + h + L['gap'], [h] * 3, gap=L['gap'])
    y_v = y_s3 + h + L['gap']
    y_s4 = y_v + h + L['gap']

    with fig.group(canon='N4-2'):
        q = fig.box(x_in, y_q, w_in, h, 'input', band='c-query',
                    lines=[[b('쿼리 q'), " 토큰 '안'"], m(Q)])
        k = fig.box(x_in, y_k, w_in, h, 'input', band='c-key',
                    lines=[[b('키 K'), ' 상자가, 안, 왔어요'], m(K)])
        s1 = fig.box(fig.L, y_s1, fig.content_w, h, 'step', lines=[b('01 내적 점수'), m(SCORE)])
        s2 = fig.box(fig.L, y_s2, fig.content_w, h, 'step', lines=[b('02 √2로 나누기'), m(SCALED)])
        s3 = fig.box(fig.L, y_s3, fig.content_w, h, 'message',
                     lines=[b('03 softmax'), [m(W_HEAD), em(W_MSG), m(']')]])
        v = fig.box(x_in, y_v, w_in, h, 'input', band='c-value', lines=[b('값 V'), m(V)])
        s4 = fig.box(fig.L, y_s4, fig.content_w, h, 'step', lines=[b('04 가중합'), m(OUT)])
        fk.check_col([s1, s2, s3, s4])
        fk.check_col([q, k, v])

        # 입력은 왼쪽 변에서 척추로 나와 첫 단계 위 끝에 꽂힘. 키는 척추에 합류
        fig.wire([(x_in, q.cy), (sx, q.cy), (sx, s1.top)], 'arrow')
        fig.wire([(x_in, k.cy), (sx, k.cy)], 'join')
        for a, c in ((s1, s2), (s2, s3), (s3, s4)):
            fig.connect(a, c, 'bottom', 'top', a_at=24, b_at=24)
        fig.wire([(x_in, v.cy), (sx, v.cy)], 'join')

    out = Path(__file__).with_name('1-4-3.v.svg')
    probs = fig.save(out, preview=preview)
    print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')


if __name__ == '__main__':
    build('v', sys.argv[1] if len(sys.argv) > 1 else None)
