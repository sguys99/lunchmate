"""그림 1-4-3 EPUB 세로 변형(폭 360): 어텐션 계산 4단계.

본문판은 1-4-3.mmd(Mermaid)입니다. 본문판을 폭 328에 줄이면 라벨이 8 CSS px 남짓이 되어
정본 숫자를 읽기 어렵고, Mermaid 세로 변형은 입력 상자가 옆으로 붙어 내용 폭 328을 넘었습니다.
그래서 style-guide 5.11절 규칙(왼쪽 척추, 값 v를 4단계 바로 위로)에 따라 figkit으로 다시 그립니다.
노드 7개, 글자, 정본 숫자(1권 N4-1, N4-2), 강조(0.576)는 본문판과 같습니다.

실행: .venv/bin/python scripts/build_charts.py vol1-llm/ch04 --kind build
      또는 이 파일을 직접 실행하면 옆에 1-4-3.v.svg를 씁니다.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'assets/svg-parts/_build'))
import figkit as fk  # noqa: E402
from figkit import b, m, em  # noqa: E402

# 대체 텍스트는 원고와 docs/figures.yml의 alt와 같은 글을 씁니다.
DESC = ("토큰 '안'의 어텐션 계산을 점수, 크기 조정, softmax, 가중합의 네 단계 흐름도로 나타냈습니다. "
        "'안'의 쿼리와 세 토큰의 키를 곱한 점수 1, 2, 3을 루트 2로 나누면 0.707, 1.414, 2.121이 됩니다. "
        "softmax를 거친 가중치는 상자가 0.140, 안 0.284, 왔어요 0.576이고, 이 가중치로 값을 섞은 출력은 0.428과 0.572입니다. "
        "'안'은 '왔어요'의 정보를 가장 많이 가져옵니다.")

fig = fk.Figure('1-4-3', '어텐션 계산 4단계', variant='v', height='auto', desc=DESC, fid='f143v')
SP = fig.spine_x            # 척추 x(내용 왼쪽 끝 + 24)
X_IN = SP + 16              # 입력 상자는 척추 오른쪽 16에서 시작
IN_W = fig.R - X_IN
FULL = fig.content_w
H = 64
# 입력끼리 16, 화살표로 잇는 상자 사이 32(5.3절). 값 v는 처음 쓰이는 4단계 바로 위(5.11절)
Y = dict(zip(['q', 'k', 's1', 's2', 's3', 'v', 's4'], [56, 136, 232, 328, 424, 504, 600]))

with fig.group(canon='N4-2'):
    fig.wire([(X_IN, Y['q'] + 32), (SP, Y['q'] + 32)], end='join')
    fig.wire([(X_IN, Y['k'] + 32), (SP, Y['k'] + 32)], end='join')
    fig.wire([(SP, Y['q'] + 32), (SP, Y['s1'])])
    fig.wire([(X_IN, Y['v'] + 32), (SP, Y['v'] + 32)], end='join')

    q = fig.box(X_IN, Y['q'], IN_W, H, 'input', band='c-query', lines=[[b('쿼리 q'), ' (안)'], m('[1, 2]')])
    k = fig.box(X_IN, Y['k'], IN_W, H, 'input', band='c-key',
                lines=[[b('키 k'), ' (상자가, 안, 왔어요)'], m('[1, 0] [0, 1] [1, 1]')])
    s1 = fig.box(fig.L, Y['s1'], FULL, H, 'step', lines=[[b('01 점수'), ' q × k'], m('[1, 2, 3]')])
    s2 = fig.box(fig.L, Y['s2'], FULL, H, 'step',
                 lines=[[b('02 크기 조정'), ' ÷ √d, d = 2'], m('[0.707, 1.414, 2.121]')])
    s3 = fig.box(fig.L, Y['s3'], FULL, H, 'message',
                 lines=[[b('03 가중치'), ' softmax, 합 = 1'], [m('[0.140, 0.284,'), ' ', em('0.576'), m(']')]])
    v = fig.box(X_IN, Y['v'], IN_W, H, 'input', band='c-value',
                lines=[[b('값 v'), ' (상자가, 안, 왔어요)'], m('[1, 0] [0, 1] [0.5, 0.5]')])
    s4 = fig.box(fig.L, Y['s4'], FULL, H, 'step', lines=[[b('04 가중합'), ' Σ 가중치 × v'], m('[0.428, 0.572]')])

    for a, c in ((s1, s2), (s2, s3), (s3, s4)):
        fig.connect(a, c, 'bottom', 'top', a_at=24, b_at=24, check=False)

fk.check_col([s1, s2, s3, s4])
fk.check_col([q, k, v])
out = HERE / '1-4-3.v.svg'
probs = fig.save(out)
print(out.name, f'{fig.W} x {fig.H}', 'lint:', probs or 'OK')
