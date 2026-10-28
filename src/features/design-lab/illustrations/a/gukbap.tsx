// 국밥/탕: 받침 위 뚝배기, 뽀얀 국물, 파, 고춧가루, 숟가락, 깍두기
import { s } from "./cls";
import { blob, bowl, bowlShade, open, stick } from "./shapes";

const WASH = blob(80, 54, 60, 33, 111, 0.07, 12);

export function GukbapArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path
        className={s.steam}
        d={open([
          [62, 30],
          [59, 23],
          [63, 16],
          [60, 10],
        ])}
      />
      <path
        className={s.steam}
        d={open([
          [78, 28],
          [81, 21],
          [77, 14],
        ])}
      />
      {/* 받침 */}
      <path className={s.drop} d={blob(77, 84, 42, 5, 112)} />
      <path className={s.mid} d={blob(74, 79, 42, 7.5, 113, 0.02)} />
      {/* 뚝배기 */}
      <path className={s.deep} d={bowl(72, 47, 30, 31, 0.82)} />
      <path className={s.line} d={bowlShade(72, 47, 30, 31, 0.82)} />
      <path
        className={s.sMid}
        strokeWidth={1.2}
        d={open([
          [43, 60],
          [72, 65],
          [101, 60],
        ])}
      />
      <path className={s.deep} d={blob(72, 47, 31, 8.6, 114, 0.02)} />
      <path className={s.hi} d={blob(72, 47.6, 27, 6.6, 115, 0.03)} />
      <path className={s.light} d={blob(62, 47, 7, 2.6, 116, 0.15)} />
      <path className={s.light} d={blob(80, 49.5, 6, 2, 117, 0.15)} />
      <path className={s.sMid} strokeWidth={1.2} d="M70 45a2 1.3 0 1 0 0.1 0" />
      <path className={s.sMid} strokeWidth={1.2} d="M86 46a2 1.3 0 1 0 0.1 0" />
      <path className={s.sMid} strokeWidth={1.2} d="M56 50a2 1.3 0 1 0 0.1 0" />
      <path className={s.accent} d={blob(74, 48.5, 1.3, 0.8, 118)} />
      <path className={s.accent} d={blob(66, 51, 1, 0.7, 119)} />
      <path className={s.accent} d={blob(90, 48, 1.1, 0.7, 120)} />
      {/* 숟가락 */}
      <path className={s.sRim} strokeWidth={3.2} d={stick(88, 45, 120, 20)} />
      {/* 깍두기 */}
      <path className={s.drop} d={blob(134, 82, 15, 3, 121)} />
      <path className={s.vessel} d={blob(132, 77.5, 15, 5, 122, 0.03)} />
      <rect
        className={s.accent}
        x={123}
        y={70}
        width={7}
        height={6}
        rx={1.6}
        transform="rotate(-8 126 73)"
      />
      <rect
        className={s.accentDeep}
        x={131}
        y={71}
        width={6.5}
        height={5.6}
        rx={1.6}
        transform="rotate(12 134 74)"
      />
      <rect
        className={s.accent}
        x={128}
        y={66}
        width={6}
        height={5.4}
        rx={1.5}
        transform="rotate(4 131 69)"
      />
    </g>
  );
}
