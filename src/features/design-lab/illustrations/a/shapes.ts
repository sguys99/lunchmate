// 시안 A 일러스트용 형태 도우미 (T1.4).
// 손으로 칠한 듯 약간 어긋난 외곽을 만들기 위해, 타원 둘레 점을 결정적 잡음으로 흔든 뒤
// Catmull-Rom 곡선을 베지어로 바꿔 닫힌 path 문자열을 만든다. 무작위가 아니라 seed로 고정된다.

type Pt = readonly [number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 0~1 결정적 잡음. */
function noise(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** 점 목록을 지나는 부드러운 닫힌 곡선. */
export function closed(pts: readonly Pt[]): string {
  const n = pts.length;
  const at = (i: number): Pt => pts[((i % n) + n) % n] as Pt;
  let d = `M${r1(at(0)[0])} ${r1(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${r1(x1 + (x2 - x0) / 6)} ${r1(y1 + (y2 - y0) / 6)} ${r1(x2 - (x3 - x1) / 6)} ${r1(y2 - (y3 - y1) / 6)} ${r1(x2)} ${r1(y2)}`;
  }
  return `${d}Z`;
}

/** 점 목록을 지나는 부드러운 열린 곡선 (붓 선). */
export function open(pts: readonly Pt[]): string {
  const n = pts.length;
  const at = (i: number): Pt => pts[Math.min(n - 1, Math.max(0, i))] as Pt;
  let d = `M${r1(at(0)[0])} ${r1(at(0)[1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${r1(x1 + (x2 - x0) / 6)} ${r1(y1 + (y2 - y0) / 6)} ${r1(x2 - (x3 - x1) / 6)} ${r1(y2 - (y3 - y1) / 6)} ${r1(x2)} ${r1(y2)}`;
  }
  return d;
}

/** 살짝 흔들린 타원. amt는 반지름 대비 흔들림 비율. */
export function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed = 1,
  amt = 0.05,
  n = 10,
): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (noise(seed, i) - 0.5) * 2 * amt;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return closed(pts);
}

/**
 * 3/4 시점 그릇 몸통. 입구 타원(cx, rimY, rx)의 양 끝에서 아래로 깊이 depth만큼 내려가는 곡면.
 * flare가 크면 대접처럼 벌어지고, 작으면 뚝배기처럼 곧다.
 */
export function bowl(
  cx: number,
  rimY: number,
  rx: number,
  depth: number,
  flare = 0.45,
): string {
  const b = rimY + depth;
  const f = rx * flare;
  return `M${r1(cx - rx)} ${r1(rimY)}C${r1(cx - rx + 0.5)} ${r1(rimY + depth * 0.7)} ${r1(cx - f)} ${r1(b)} ${r1(cx)} ${r1(b)}C${r1(cx + f)} ${r1(b)} ${r1(cx + rx - 0.5)} ${r1(rimY + depth * 0.7)} ${r1(cx + rx)} ${r1(rimY)}Z`;
}

/** 끝이 둥근 막대(젓가락, 꼬치). */
export function stick(x1: number, y1: number, x2: number, y2: number): string {
  return `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`;
}

/** 잎사귀. (cx, cy) 중심, len 길이, wid 폭, deg 기울기. */
export function leaf(
  cx: number,
  cy: number,
  len: number,
  wid: number,
  deg: number,
  seed = 1,
): string {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const local: Pt[] = [
    [len / 2, 0],
    [len * 0.15, wid * (0.5 + noise(seed, 1) * 0.08)],
    [-len * 0.3, wid * (0.36 + noise(seed, 2) * 0.08)],
    [-len / 2, 0],
    [-len * 0.3, -wid * (0.36 + noise(seed, 3) * 0.08)],
    [len * 0.15, -wid * (0.5 + noise(seed, 4) * 0.08)],
  ];
  return closed(
    local.map(([x, y]) => [cx + x * ux - y * uy, cy + x * uy + y * ux] as Pt),
  );
}

/** bowl()과 같은 그릇의 오른쪽 그늘 (빛은 왼쪽 위에서). */
export function bowlShade(
  cx: number,
  rimY: number,
  rx: number,
  depth: number,
  flare = 0.45,
): string {
  const b = rimY + depth;
  const f = rx * flare;
  return `M${r1(cx + rx)} ${r1(rimY)}C${r1(cx + rx - 0.5)} ${r1(rimY + depth * 0.7)} ${r1(cx + f)} ${r1(b)} ${r1(cx)} ${r1(b)}C${r1(cx + f * 0.9)} ${r1(b - depth * 0.12)} ${r1(cx + rx * 0.72)} ${r1(rimY + depth * 0.55)} ${r1(cx + rx * 0.78)} ${r1(rimY)}Z`;
}
