// 양식: 넓은 접시 위 토마토 스파게티, 바질, 포크
import { s } from "./cls";
import { blob, leaf, open, stick } from "./shapes";

const WASH = blob(80, 55, 60, 33, 51, 0.07, 12);

export function YangsikArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path className={s.drop} d={blob(83, 69, 56, 17, 52, 0.03)} />
      <path className={s.vessel} d={blob(80, 62, 56, 19, 53, 0.02, 12)} />
      <path className={s.vesselShade} d={blob(80, 61, 41, 13, 54, 0.03, 12)} />
      <path
        className={s.sRim}
        strokeWidth={0.9}
        d={open([
          [30, 66],
          [50, 76],
          [80, 79],
          [110, 76],
          [130, 66],
        ])}
      />
      {/* 면 */}
      <path className={s.light} d={blob(78, 57, 29, 11.5, 55, 0.1, 12)} />
      <path
        className={s.sMid}
        strokeWidth={1.3}
        d={open([
          [53, 58],
          [61, 51],
          [76, 48],
          [90, 50],
          [101, 56],
        ])}
      />
      <path
        className={s.sMid}
        strokeWidth={1.3}
        d={open([
          [55, 62],
          [68, 66],
          [86, 66],
          [99, 61],
        ])}
      />
      <path
        className={s.sMid}
        strokeWidth={1.3}
        d={open([
          [60, 55],
          [71, 60],
          [87, 60],
          [96, 54],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.1}
        d={open([
          [57, 60],
          [64, 63.5],
          [74, 64.5],
        ])}
      />
      {/* 소스 */}
      <path className={s.accent} d={blob(75, 53.5, 14, 6.4, 56, 0.14)} />
      <path className={s.accentDeep} d={blob(71, 52.5, 4, 2, 57, 0.2)} />
      <path className={s.accentDeep} d={blob(81, 55.5, 3, 1.5, 58, 0.2)} />
      <path className={s.hi} d={blob(76, 51, 1.4, 0.8, 59)} />
      <path className={s.hi} d={blob(68, 55, 1.2, 0.7, 60)} />
      {/* 바질 */}
      <path className={s.deep} d={leaf(84, 48.5, 10, 5.2, -25, 61)} />
      <path className={s.line} d={leaf(91, 51, 8, 4.2, 20, 62)} />
      {/* 포크 */}
      <path className={s.light} d={blob(106, 55, 6.5, 4, 63, 0.12)} />
      <path
        className={s.sMid}
        strokeWidth={1}
        d={open([
          [101, 55],
          [106, 52.5],
          [111, 55],
          [106, 57.5],
        ])}
      />
      <path className={s.sDeep} strokeWidth={3} d={stick(109, 52, 140, 28)} />
    </g>
  );
}
