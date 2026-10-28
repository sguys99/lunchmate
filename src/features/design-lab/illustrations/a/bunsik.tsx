// 분식: 떡볶이 접시와 김밥 세 조각
import { s } from "./cls";
import { blob, closed } from "./shapes";

const WASH = blob(80, 55, 60, 33, 71, 0.07, 12);

function Tteok({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <rect
        className={s.accent}
        x={x - 8}
        y={y - 2.8}
        width={16}
        height={5.6}
        rx={2.8}
      />
      <rect
        className={s.hi}
        x={x - 5.5}
        y={y - 1.9}
        width={7}
        height={1.1}
        rx={0.55}
        opacity={0.75}
      />
    </g>
  );
}

function Gimbap({ x, y, seed }: { x: number; y: number; seed: number }) {
  return (
    <g>
      <path className={s.drop} d={blob(x + 1.5, y + 7.5, 9, 2.6, seed)} />
      <path
        className={s.line}
        d={`M${x - 9} ${y}L${x - 9} ${y + 5}C${x - 9} ${y + 10} ${x + 9} ${y + 10} ${x + 9} ${y + 5}L${x + 9} ${y}Z`}
      />
      <path className={s.deep} d={blob(x, y, 9, 6, seed + 1, 0.03)} />
      <path className={s.hi} d={blob(x, y, 7.5, 4.8, seed + 2, 0.05)} />
      <path
        className={s.accent}
        d={blob(x - 2.4, y - 1, 1.8, 1.3, seed + 3, 0.1)}
      />
      <path
        className={s.light}
        d={blob(x + 2, y - 1.4, 2, 1.2, seed + 4, 0.1)}
      />
      <path
        className={s.mid}
        d={blob(x + 0.2, y + 1.8, 1.9, 1.1, seed + 5, 0.1)}
      />
      <path className={s.deep} d={blob(x + 3, y + 1.5, 1.1, 0.8, seed + 6)} />
    </g>
  );
}

export function BunsikArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path className={s.drop} d={blob(62, 74, 42, 9, 72, 0.03)} />
      <path className={s.vessel} d={blob(60, 64, 42, 15, 73, 0.02, 12)} />
      <path className={s.accentDeep} d={blob(60, 62.5, 35, 11, 74, 0.06, 12)} />
      <path
        className={s.light}
        d={closed([
          [38, 60],
          [46, 55],
          [50, 63],
        ])}
      />
      <path
        className={s.mid}
        d={closed([
          [68, 66],
          [77, 61],
          [79, 70],
        ])}
      />
      <Tteok x={46} y={66} r={-14} />
      <Tteok x={56} y={58} r={10} />
      <Tteok x={64} y={68} r={-4} />
      <Tteok x={72} y={57} r={-22} />
      <Tteok x={80} y={64} r={16} />
      <Tteok x={50} y={70.5} r={18} />
      <path className={s.hi} d={blob(84, 56.5, 6, 4, 75, 0.05)} />
      <path className={s.light} d={blob(84.5, 56.5, 2.6, 2, 76, 0.05)} />
      <Gimbap x={110} y={70} seed={80} />
      <Gimbap x={126} y={62} seed={90} />
      <Gimbap x={140} y={73} seed={100} />
    </g>
  );
}
