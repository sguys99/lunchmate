// 카페/베이커리: 받침 위 라테 한 잔과 크루아상
import { s } from "./cls";
import { blob, bowl, bowlShade, open } from "./shapes";

const WASH = blob(82, 55, 60, 33, 211, 0.07, 12);
const CROISSANT: [number, number, number, number, string][] = [
  [98, 74, 7, 5, s.deep],
  [140, 74, 7, 5, s.deep],
  [106, 68, 10, 8, s.toast],
  [132, 68, 10, 8, s.toast],
  [119, 64, 13, 10, s.toastHi],
];

export function CafeArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path
        className={s.steam}
        d={open([
          [56, 30],
          [53, 23],
          [57, 16],
        ])}
      />
      <path
        className={s.steam}
        d={open([
          [68, 29],
          [71, 22],
          [67, 15],
        ])}
      />
      {/* 잔 */}
      <path className={s.drop} d={blob(66, 82, 34, 4.5, 212)} />
      <path className={s.vessel} d={blob(63, 77, 34, 8, 213, 0.02)} />
      <path className={s.vesselShade} d={blob(63, 76, 21, 4.4, 214, 0.03)} />
      <path
        className={s.sVessel}
        strokeWidth={4.6}
        d={open([
          [82, 51],
          [91, 53],
          [91, 62],
          [80, 67],
        ])}
      />
      <path
        className={s.sRim}
        strokeWidth={1}
        d={open([
          [84, 54],
          [88.5, 55.5],
          [88, 61],
          [82, 64],
        ])}
      />
      <path className={s.vessel} d={bowl(62, 46, 23, 30, 0.72)} />
      <path className={s.vesselShade} d={bowlShade(62, 46, 23, 30, 0.72)} />
      <path
        className={s.sAccent}
        strokeWidth={2.6}
        d={open([
          [40, 57],
          [62, 61.5],
          [84, 57],
        ])}
      />
      <path className={s.vesselShade} d={blob(62, 46, 23, 6.6, 215, 0.02)} />
      <path className={s.deep} d={blob(62, 46.8, 20.5, 5.2, 216, 0.03)} />
      <path className={s.hi} d={blob(62, 47.6, 7, 2.6, 217, 0.08)} />
      <path className={s.hi} d={blob(62, 45, 4.6, 1.6, 218, 0.08)} />
      <path className={s.hi} d={blob(62, 43.2, 2.6, 1, 219, 0.08)} />
      <path
        className={s.sHi}
        strokeWidth={0.9}
        d={open([
          [62, 42],
          [62, 50.5],
        ])}
      />
      {/* 크루아상 */}
      <path className={s.drop} d={blob(120, 81, 24, 3.5, 220)} />
      {CROISSANT.map(([x, y, rx, ry, c], i) => (
        <path key={i} className={c} d={blob(x, y, rx, ry, 221 + i, 0.08)} />
      ))}
      <path
        className={s.sDeep}
        strokeWidth={1.2}
        d={open([
          [110, 60],
          [112, 66],
          [111, 73],
        ])}
      />
      <path
        className={s.sDeep}
        strokeWidth={1.2}
        d={open([
          [128, 60],
          [126, 66],
          [127, 73],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.6}
        d={open([
          [113, 59],
          [119, 56.5],
          [125, 58],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.4}
        d={open([
          [100, 65],
          [104, 62],
        ])}
      />
    </g>
  );
}
