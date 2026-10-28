// 고기: 둥근 불판 위 삼겹살 세 줄, 마늘
import { s } from "./cls";
import { blob, closed, open } from "./shapes";

const WASH = blob(80, 54, 60, 33, 131, 0.07, 12);
const CX = 78;
const CY = 57;
const RX = 43;
const RY = 16;
const SLATS = [-12, -7, -2, 3, 8, 13].map((dy) => {
  const y = CY + dy;
  const hw = RX * Math.sqrt(1 - (dy / RY) ** 2) - 2;
  return `M${(CX - hw).toFixed(1)} ${y}L${(CX + hw).toFixed(1)} ${y}`;
});

function Strip({
  x,
  y,
  r,
  seed,
}: {
  x: number;
  y: number;
  r: number;
  seed: number;
}) {
  return (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <path
        className={s.accent}
        d={closed([
          [x - 17, y - 3],
          [x, y - 4.6],
          [x + 17, y - 3.4],
          [x + 18, y + 3],
          [x, y + 4.4],
          [x - 18, y + 3.2],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.6}
        d={open([
          [x - 15, y - 1],
          [x - 2, y - 2],
          [x + 15, y - 1.2],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.1}
        d={open([
          [x - 14, y + 2],
          [x + 2, y + 1.6],
          [x + 14, y + 2.2],
        ])}
      />
      <path
        className={s.accentDeep}
        d={blob(x - 7, y + 0.2, 1.8, 3.4, seed, 0.1)}
      />
      <path
        className={s.accentDeep}
        d={blob(x + 6, y + 0.2, 1.8, 3.4, seed + 1, 0.1)}
      />
    </g>
  );
}

export function GogiArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path
        className={s.steam}
        d={open([
          [60, 30],
          [57, 23],
          [61, 16],
        ])}
      />
      <path
        className={s.steam}
        d={open([
          [96, 29],
          [99, 22],
          [95, 15],
        ])}
      />
      <path className={s.drop} d={blob(81, 67, 50, 15, 132, 0.03)} />
      <path className={s.line} d={blob(CX, CY + 2.5, 50, 19, 133, 0.015, 12)} />
      <path className={s.deep} d={blob(CX, CY, 50, 19, 134, 0.015, 12)} />
      <path className={s.line} d={blob(CX, CY, RX, RY, 135, 0.015, 12)} />
      {SLATS.map((d) => (
        <path key={d} className={s.sDeep} strokeWidth={1.4} d={d} />
      ))}
      <Strip x={62} y={53} r={-8} seed={136} />
      <Strip x={86} y={56} r={-4} seed={138} />
      <Strip x={70} y={64} r={-6} seed={140} />
      <path className={s.hi} d={blob(102, 63, 4.2, 2.6, 142, 0.08)} />
      <path className={s.light} d={blob(102, 63, 1.8, 1.1, 143)} />
      <path className={s.hi} d={blob(98, 48, 3.8, 2.4, 144, 0.08)} />
      <path className={s.light} d={blob(98, 48, 1.6, 1, 145)} />
    </g>
  );
}
