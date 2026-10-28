// 아시안: 쌀국수 대접, 고기 고명, 고수, 라임, 면을 든 젓가락
import { s } from "./cls";
import { blob, bowl, bowlShade, leaf, open, stick } from "./shapes";

const WASH = blob(80, 55, 60, 33, 151, 0.07, 12);

export function AsianArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path className={s.drop} d={blob(78, 82, 34, 5, 152)} />
      <path className={s.vessel} d={bowl(76, 46, 35, 33, 0.5)} />
      <path className={s.vesselShade} d={bowlShade(76, 46, 35, 33, 0.5)} />
      <path
        className={s.sRim}
        strokeWidth={1.3}
        d={open([
          [43, 56],
          [76, 62.5],
          [109, 56],
        ])}
      />
      <path
        className={s.sRim}
        strokeWidth={1.3}
        d={open([
          [46, 61],
          [76, 67.5],
          [106, 61],
        ])}
      />
      <path className={s.vesselShade} d={blob(76, 46, 35, 9.4, 153, 0.02)} />
      <path className={s.light} d={blob(76, 46.8, 32, 7.6, 154, 0.03)} />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [50, 47],
          [58, 44.5],
          [66, 47.5],
          [74, 45],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [60, 50.5],
          [70, 48.5],
          [80, 51],
        ])}
      />
      <path className={s.accent} d={blob(66, 46, 8, 3, 155, 0.1)} />
      <path className={s.accentDeep} d={blob(82, 49, 6.5, 2.6, 156, 0.1)} />
      <path
        className={s.sHi}
        strokeWidth={0.9}
        d={open([
          [62, 45.5],
          [69, 45],
        ])}
      />
      <path className={s.mid} d={leaf(92, 44, 8, 4, -30, 157)} />
      <path className={s.deep} d={leaf(97, 47.5, 7, 3.6, 25, 158)} />
      <path className={s.mid} d={leaf(55, 50, 7, 3.4, 160, 159)} />
      <path className={s.deep} d={leaf(88, 50.5, 6, 3, 80, 160)} />
      {/* 라임 */}
      <path className={s.light} d="M101 47a7 7 0 0 1 13 -1Z" />
      <path className={s.hi} d="M102.6 46.6a5.4 5.2 0 0 1 9.8 -0.8Z" />
      {/* 젓가락과 면 */}
      <path
        className={s.sHi}
        strokeWidth={1.4}
        d={open([
          [95, 37],
          [93, 41],
          [94.5, 45],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.4}
        d={open([
          [98, 36],
          [97.5, 40],
          [99, 44],
        ])}
      />
      <path className={s.sDeep} strokeWidth={2.2} d={stick(92, 38, 128, 12)} />
      <path
        className={s.sDeep}
        strokeWidth={2.2}
        d={stick(97, 38.5, 134, 16)}
      />
    </g>
  );
}
