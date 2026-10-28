// 샐러드/건강식: 넓은 볼에 잎채소, 방울토마토, 오이
import { s } from "./cls";
import { blob, bowl, bowlShade, leaf, open } from "./shapes";

const WASH = blob(80, 54, 60, 33, 191, 0.07, 12);
const LEAVES: [number, number, number, number, number, string][] = [
  [56, 46, 26, 13, -30, s.deep],
  [96, 44, 26, 13, 210, s.deep],
  [70, 40, 24, 12, -70, s.mid],
  [86, 41, 22, 11, -110, s.light],
  [64, 49, 22, 10, 10, s.light],
  [92, 50, 22, 10, 170, s.mid],
  [78, 46, 20, 10, -95, s.deep],
];

function Tomato({ x, y, seed }: { x: number; y: number; seed: number }) {
  return (
    <g>
      <path className={s.accent} d={blob(x, y, 5.2, 4.8, seed, 0.05)} />
      <path
        className={s.accentDeep}
        d={blob(x + 1.6, y + 1.6, 2.6, 2, seed + 1, 0.1)}
      />
      <path className={s.hi} d={blob(x - 1.8, y - 1.8, 1.3, 0.9, seed + 2)} />
    </g>
  );
}

export function SaladArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path className={s.drop} d={blob(80, 82, 38, 5, 192)} />
      <path className={s.vesselShade} d={blob(78, 54, 40, 10, 193, 0.02)} />
      {LEAVES.map(([x, y, l, w, r, c], i) => (
        <path key={i} className={c} d={leaf(x, y, l, w, r, 194 + i)} />
      ))}
      <path
        className={s.sLine}
        strokeWidth={0.9}
        d={open([
          [46, 50],
          [56, 46],
          [66, 42],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={0.9}
        d={open([
          [106, 48],
          [96, 44],
          [86, 41],
        ])}
      />
      <Tomato x={72} y={50} seed={201} />
      <Tomato x={98} y={52} seed={204} />
      <path className={s.hi} d={blob(84, 52, 5, 3.4, 207, 0.03)} />
      <path
        className={s.sMid}
        strokeWidth={1.1}
        d="M84 50a3.4 2.2 0 1 0 0.1 0"
      />
      <path className={s.hi} d={blob(60, 54, 4.6, 3, 208, 0.03)} />
      <path className={s.sMid} strokeWidth={1.1} d="M60 52.2a3 2 0 1 0 0.1 0" />
      <path className={s.vessel} d={bowl(78, 54, 40, 27, 0.55)} />
      <path className={s.vesselShade} d={bowlShade(78, 54, 40, 27, 0.55)} />
      <path
        className={s.sRim}
        strokeWidth={1.3}
        d={open([
          [38, 54],
          [58, 58.5],
          [78, 59.5],
          [98, 58.5],
          [118, 54],
        ])}
      />
      <path
        className={s.sAccent}
        strokeWidth={1.6}
        d={open([
          [42, 63],
          [78, 70],
          [114, 63],
        ])}
      />
    </g>
  );
}
