// 한식: 흰 밥 한 공기, 나물 접시, 김치 접시, 젓가락
import { s } from "./cls";
import { blob, bowl, bowlShade, closed, open, stick } from "./shapes";

const WASH = blob(82, 56, 60, 33, 3, 0.07, 12);
const RICE = closed([
  [51, 47],
  [55, 39],
  [65, 33.5],
  [77, 32],
  [89, 34.5],
  [97, 40],
  [101, 47],
  [88, 50.5],
  [64, 50.5],
]);
const KIMCHI = closed([
  [105, 70],
  [107, 64],
  [113, 60.5],
  [121, 61],
  [127, 64],
  [131, 70],
  [121, 73],
  [111, 73],
]);

export function HansikArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      {/* 나물 */}
      <path className={s.drop} d={blob(38, 70, 20, 5, 4)} />
      <path className={s.vessel} d={blob(36, 65, 19, 6.5, 5, 0.03)} />
      <path className={s.vesselShade} d={blob(36, 64.5, 13.5, 4.2, 6)} />
      <path className={s.mid} d={blob(36, 61, 11.5, 5.2, 7, 0.12)} />
      <path
        className={s.sDeep}
        strokeWidth={1.4}
        d={open([
          [27, 62],
          [32, 58.5],
          [38, 61],
          [44, 58.5],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.2}
        d={open([
          [30, 59],
          [35, 57],
          [41, 57.5],
        ])}
      />
      <path className={s.hi} d={blob(33, 59.5, 0.9, 0.6, 13)} />
      <path className={s.hi} d={blob(39, 60.5, 0.9, 0.6, 14)} />
      <path className={s.hi} d={blob(36, 57.6, 0.9, 0.6, 15)} />
      {/* 밥 */}
      <path className={s.drop} d={blob(78, 78.5, 24, 4.5, 8)} />
      <path className={s.vessel} d={bowl(76, 46, 25, 31)} />
      <path className={s.vesselShade} d={bowlShade(76, 46, 25, 31)} />
      <path
        className={s.sRim}
        strokeWidth={1.6}
        d={open([
          [53, 57],
          [76, 62],
          [99, 57],
        ])}
      />
      <path
        className={s.sAccent}
        strokeWidth={1.6}
        d={open([
          [55, 61.5],
          [76, 66.5],
          [97, 61.5],
        ])}
      />
      <path className={s.hi} d={RICE} />
      <path
        className={s.sLight}
        strokeWidth={1.3}
        d={open([
          [60, 44],
          [64, 41],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.3}
        d={open([
          [72, 38],
          [76, 36.5],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.3}
        d={open([
          [84, 41.5],
          [88, 43],
        ])}
      />
      <path
        className={s.sLight}
        strokeWidth={1.3}
        d={open([
          [70, 46],
          [74, 47],
        ])}
      />
      <path
        className={s.sRim}
        strokeWidth={1.4}
        d={open([
          [51, 47],
          [76, 51.5],
          [101, 47],
        ])}
      />
      {/* 김치 */}
      <path className={s.drop} d={blob(120, 78, 19, 4.5, 9)} />
      <path className={s.vessel} d={blob(118, 72.5, 19, 6, 10, 0.03)} />
      <path className={s.accent} d={KIMCHI} />
      <path className={s.accentDeep} d={blob(115, 68, 5, 2.4, 11, 0.15)} />
      <path className={s.accentDeep} d={blob(125, 67, 3.6, 2, 12, 0.15)} />
      <path
        className={s.sHi}
        strokeWidth={1.5}
        d={open([
          [110, 68.5],
          [114, 64],
          [119, 65],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.5}
        d={open([
          [119, 70.5],
          [123, 65.5],
          [127, 67.5],
        ])}
      />
      {/* 젓가락 */}
      <path className={s.sDeep} strokeWidth={2.2} d={stick(108, 47, 148, 36)} />
      <path
        className={s.sDeep}
        strokeWidth={2.2}
        d={stick(111, 51.5, 150, 41.5)}
      />
    </g>
  );
}
