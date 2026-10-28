// 중식: 짜장면 그릇(앞)과 짬뽕 그릇(뒤)
import { s } from "./cls";
import { blob, bowl, bowlShade, open } from "./shapes";

const WASH = blob(82, 54, 60, 33, 21, 0.07, 12);

export function JungsikArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      {/* 짬뽕 (뒤) */}
      <path className={s.drop} d={blob(113, 69, 26, 4.5, 22)} />
      <path className={s.vessel} d={bowl(112, 42, 26, 24)} />
      <path className={s.vesselShade} d={bowlShade(112, 42, 26, 24)} />
      <path
        className={s.sRim}
        strokeWidth={1.4}
        d={open([
          [88, 50],
          [112, 55],
          [136, 50],
        ])}
      />
      <path className={s.vesselShade} d={blob(112, 42, 26, 7.4, 23, 0.02)} />
      <path className={s.accent} d={blob(112, 42.8, 23, 5.8, 24, 0.04)} />
      <path
        className={s.sHi}
        strokeWidth={1.3}
        d={open([
          [94, 43],
          [99, 40.5],
          [104, 43],
          [109, 40.5],
        ])}
      />
      <path className={s.line} d={blob(119, 41.5, 4.6, 2.3, 25, 0.1)} />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [116, 41.5],
          [122, 41],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.4}
        d="M126 44.5a2.4 1.6 0 1 0 0.1 0"
      />
      <path className={s.accentDeep} d={blob(104, 45, 2.4, 1.2, 26)} />
      {/* 짜장면 (앞) */}
      <path className={s.drop} d={blob(64, 80.5, 31, 5, 27)} />
      <path className={s.vessel} d={bowl(62, 50, 31, 28)} />
      <path className={s.vesselShade} d={bowlShade(62, 50, 31, 28)} />
      <path
        className={s.sAccent}
        strokeWidth={1.6}
        d={open([
          [34, 60],
          [62, 66],
          [90, 60],
        ])}
      />
      <path
        className={s.sRim}
        strokeWidth={1.2}
        d={open([
          [36, 64],
          [62, 70],
          [88, 64],
        ])}
      />
      <path className={s.vesselShade} d={blob(62, 50, 31, 8.6, 28, 0.02)} />
      <path className={s.light} d={blob(62, 50.8, 28, 7, 29, 0.03)} />
      <path
        className={s.sMid}
        strokeWidth={1}
        d={open([
          [37, 51],
          [44, 47.5],
          [52, 49],
        ])}
      />
      <path
        className={s.sMid}
        strokeWidth={1}
        d={open([
          [72, 54.5],
          [80, 52],
          [86, 52.5],
        ])}
      />
      <path className={s.deep} d={blob(61, 49.5, 16.5, 5.4, 30, 0.12)} />
      <path className={s.line} d={blob(64, 49, 6, 2, 31, 0.2)} />
      <path
        className={s.sHi}
        strokeWidth={1.1}
        d={open([
          [52, 48],
          [55, 46.8],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.6}
        d={open([
          [60, 45.6],
          [67, 44.8],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.6}
        d={open([
          [62, 47.4],
          [69, 46.4],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.6}
        d={open([
          [58, 47.2],
          [64, 46.6],
        ])}
      />
    </g>
  );
}
