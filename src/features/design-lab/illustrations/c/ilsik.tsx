import { K, L, M, S } from "./tones";

// 일식: 나무 받침 위 초밥 두 점
export function IlsikC() {
  return (
    <>
      <rect x="11" y="32" width="19" height="12" rx="5" fill={L} />
      <path d="M9 34q0-9 11-9h4q9 0 9 6v1q0 2-2 2z" fill={K} />
      <path d="M14 28.5l3 4M20 27l3 5M26 27l2.5 5" stroke={S} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="34" y="32" width="19" height="12" rx="5" fill={L} />
      <path d="M32 34q0-9 11-9h4q9 0 9 6v1q0 2-2 2z" fill={K} />
      <rect x="41" y="24" width="5" height="20" rx="1" fill={M} />
      <rect x="6" y="44" width="52" height="5" rx="2.5" fill={M} />
      <rect x="12" y="49" width="6" height="3" fill={M} />
      <rect x="46" y="49" width="6" height="3" fill={M} />
    </>
  );
}
