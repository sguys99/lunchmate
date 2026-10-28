// 패스트푸드: 햄버거와 감자튀김
import { s } from "./cls";
import { blob, open } from "./shapes";

const WASH = blob(80, 54, 60, 33, 171, 0.07, 12);
const FRIES = [
  { x: 103, h: 30, r: -9, c: s.light },
  { x: 109, h: 34, r: -3, c: s.hi },
  { x: 115, h: 31, r: 4, c: s.light },
  { x: 121, h: 35, r: 8, c: s.hi },
  { x: 126, h: 28, r: 14, c: s.light },
  { x: 112, h: 26, r: 12, c: s.light },
];

export function FastfoodArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      {/* 감자튀김 */}
      <path className={s.drop} d={blob(118, 83, 16, 3, 172)} />
      <path className={s.accentDeep} d="M100 46L134 46L131 52L103 52Z" />
      {FRIES.map((f) => (
        <rect
          key={f.x + f.r}
          className={f.c}
          x={f.x}
          y={50 - f.h + 20}
          width={4.4}
          height={f.h}
          rx={1.2}
          transform={`rotate(${f.r} ${f.x + 2} 60)`}
        />
      ))}
      <path
        className={s.accent}
        d="M100 50C108 56.5 126 56.5 134 50L130 81C122 83 110 83 104 81Z"
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        opacity={0.6}
        d={open([
          [105, 60],
          [106, 76],
        ])}
      />
      {/* 햄버거 */}
      <path className={s.drop} d={blob(70, 83.5, 34, 4, 173)} />
      <path
        className={s.toast}
        d="M41 71C41 78 48 81 70 81C92 81 99 78 99 71Z"
      />
      <path
        className={s.line}
        d="M38 67C38 61 46 60 70 60C94 60 102 61 102 67C102 73 94 74 70 74C46 74 38 73 38 67Z"
      />
      <path
        className={s.sDeep}
        strokeWidth={1.1}
        d={open([
          [46, 66],
          [56, 64.5],
          [66, 66],
        ])}
      />
      <path
        className={s.sDeep}
        strokeWidth={1.1}
        d={open([
          [76, 68],
          [86, 66.5],
          [95, 68],
        ])}
      />
      <path
        className={s.light}
        d="M37 59L103 59L100 63L93 63L91 67.5L87 63L68 63L65 68.5L61 63L40 63Z"
      />
      <path
        className={s.accent}
        d="M40 56C40 53 50 52 70 52C90 52 100 53 100 56C100 59 90 60 70 60C50 60 40 59 40 56Z"
      />
      <path
        className={s.toast}
        d="M38 53C38 37 52 28 70 28C88 28 102 37 102 53C102 56 92 57 70 57C48 57 38 56 38 53Z"
      />
      <path
        className={s.sHi}
        strokeWidth={2.4}
        opacity={0.5}
        d={open([
          [47, 44],
          [52, 37],
          [60, 33],
        ])}
      />
      {[
        [62, 38, -20],
        [74, 35, 15],
        [84, 40, -10],
        [68, 45, 30],
        [90, 47, 10],
        [54, 47, -35],
      ].map(([x, y, r]) => (
        <ellipse
          key={`${x}-${y}`}
          className={s.hi}
          cx={x}
          cy={y}
          rx={1.8}
          ry={0.9}
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </g>
  );
}
