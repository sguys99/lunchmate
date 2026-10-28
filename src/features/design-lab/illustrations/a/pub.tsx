// 술집: 와인 잔과 꼬치 두 개를 올린 접시
import { s } from "./cls";
import { blob, open, stick } from "./shapes";

const WASH = blob(80, 54, 60, 33, 231, 0.07, 12);

function Skewer({
  x1,
  y1,
  x2,
  y2,
  seed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: number;
}) {
  const at = (t: number) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as const;
  return (
    <g>
      <path className={s.sDeep} strokeWidth={1.6} d={stick(x1, y1, x2, y2)} />
      {[0.22, 0.4, 0.58, 0.76].map((t, i) => {
        const [x, y] = at(t);
        const meat = i % 2 === 0;
        return (
          <g key={t}>
            <path
              className={meat ? s.accent : s.mid}
              d={blob(x, y, meat ? 6 : 4.2, meat ? 4.6 : 3.8, seed + i, 0.12)}
            />
            {meat ? (
              <path
                className={s.accentDeep}
                d={blob(x + 1.6, y + 1.4, 2.4, 1.6, seed + i + 10, 0.15)}
              />
            ) : null}
            <path
              className={s.hi}
              d={blob(x - 1.6, y - 1.8, meat ? 1.5 : 1, 0.7, seed + i + 20)}
            />
          </g>
        );
      })}
    </g>
  );
}

export function PubArt() {
  return (
    <g>
      <path className={s.wash} d={WASH} />
      {/* 접시와 꼬치 */}
      <path className={s.drop} d={blob(113, 80, 33, 5, 232)} />
      <path className={s.vessel} d={blob(110, 74, 33, 9, 233, 0.02)} />
      <path className={s.vesselShade} d={blob(110, 73, 24, 5.6, 234, 0.03)} />
      <Skewer x1={84} y1={70} x2={140} y2={62} seed={240} />
      <Skewer x1={82} y1={78} x2={138} y2={72} seed={250} />
      {/* 와인 잔 */}
      <path className={s.drop} d={blob(57, 83, 14, 2.8, 235)} />
      <path className={s.hi} d={blob(55, 80, 12, 3, 236, 0.02)} />
      <rect className={s.hi} x={53.8} y={52} width={2.6} height={28} rx={1.3} />
      <path
        className={s.hi}
        opacity={0.55}
        d="M39 18C39 42 45 53 55 53C65 53 71 42 71 18Z"
      />
      <path
        className={s.deep}
        d="M40.4 32C41 45 47 52 55 52C63 52 69 45 69.6 32C63 34.4 47 34.4 40.4 32Z"
      />
      <path className={s.mid} d={blob(55, 32.6, 14.6, 2.4, 237, 0.02)} />
      <path
        className={s.sRim}
        strokeWidth={0.9}
        d={open([
          [39, 18],
          [55, 20.4],
          [71, 18],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.8}
        d={open([
          [43.5, 22],
          [44, 33],
          [47, 42],
        ])}
      />
      <path
        className={s.sHi}
        strokeWidth={1.2}
        opacity={0.7}
        d={open([
          [65, 38],
          [62, 46],
        ])}
      />
    </g>
  );
}
