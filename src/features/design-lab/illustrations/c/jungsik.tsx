import { K, L, M, S } from "./tones";

// 중식: 넓은 면기 위 짜장면
export function JungsikC() {
  return (
    <>
      <path d="M11 34a21 14 0 0 1 42 0z" fill={L} />
      <path d="M19 30a13 10 0 0 1 26 0z" fill={M} />
      <path
        d="M24 25h4M33 23h5M30 28h4"
        stroke={S}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M7 34h50a25 14 0 0 1-50 0z" fill={K} />
      <rect x="25" y="46" width="14" height="4" rx="2" fill={K} />
    </>
  );
}
