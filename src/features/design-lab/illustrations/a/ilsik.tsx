// 일식: 긴 접시 위 연어 초밥 두 점과 마키 두 점, 간장 종지, 젓가락
import { s } from "./cls";
import { blob, closed, open, stick } from "./shapes";

const WASH = blob(80, 54, 60, 33, 41, 0.07, 12);

function Nigiri({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path className={s.hi} d={blob(x, y + 3, 12.5, 6, x, 0.06)} />
      <path
        className={s.light}
        d={blob(x + 1, y + 6.5, 10.5, 2.6, x + 1, 0.06)}
      />
      <path
        className={s.accent}
        d={closed([
          [x - 14, y + 1.5],
          [x - 10, y - 4],
          [x, y - 6],
          [x + 11, y - 4.5],
          [x + 15, y],
          [x + 4, y + 2.5],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [x - 7, y - 4],
          [x - 9, y + 0.5],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [x - 1, y - 5],
          [x - 3, y + 1],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        d={open([
          [x + 5, y - 4.5],
          [x + 3.5, y + 0.8],
        ])}
      />
    </g>
  );
}

function Maki({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        className={s.line}
        d={`M${x - 8} ${y}L${x - 8} ${y + 9}C${x - 8} ${y + 13} ${x + 8} ${y + 13} ${x + 8} ${y + 9}L${x + 8} ${y}Z`}
      />
      <path className={s.deep} d={blob(x, y, 8, 4, x, 0.03)} />
      <path className={s.hi} d={blob(x, y, 6.6, 3.1, x + 2, 0.05)} />
      <path
        className={s.accent}
        d={blob(x - 0.5, y - 0.2, 2.8, 1.5, x + 3, 0.15)}
      />
      <path className={s.mid} d={blob(x + 2.4, y + 0.8, 1.5, 0.9, x + 4)} />
    </g>
  );
}

export function IlsikArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      <path className={s.sDeep} strokeWidth={2} d={stick(30, 36, 118, 26)} />
      <path
        className={s.sDeep}
        strokeWidth={2}
        d={stick(33, 40.5, 121, 30.5)}
      />
      <path className={s.drop} d={blob(84, 75, 60, 9, 42, 0.03)} />
      <path
        className={s.vessel}
        d={closed([
          [22, 66],
          [28, 58],
          [80, 53.5],
          [134, 55],
          [142, 61],
          [136, 70],
          [82, 73.5],
          [28, 72],
        ])}
      />
      <path
        className={s.vesselShade}
        d={closed([
          [32, 65],
          [36, 60.5],
          [82, 57],
          [128, 58.5],
          [133, 62.5],
          [128, 67],
          [82, 69],
          [36, 68],
        ])}
      />
      <Nigiri x={44} y={57} />
      <Nigiri x={74} y={55} />
      <Maki x={104} y={56} />
      <Maki x={124} y={58} />
      {/* 간장 종지 */}
      <path className={s.drop} d={blob(140, 83, 12, 2.8, 43)} />
      <path className={s.vessel} d={blob(138, 80, 12, 4.4, 44, 0.03)} />
      <path className={s.line} d={blob(138, 79.6, 8.5, 2.6, 45, 0.04)} />
      <path
        className={s.sHi}
        strokeWidth={1}
        d={open([
          [133, 79],
          [136, 78.3],
        ])}
      />
    </g>
  );
}
