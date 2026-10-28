import { K, M, S } from "./tones";

// 양식: 접시 위 말아 올린 파스타와 포크
export function YangsikC() {
  return (
    <>
      <path d="M13 44a19 16 0 0 1 38 0z" fill={M} />
      <path
        d="M19 40q13-9 26 0M23 34q9-7 18 0M28 29q4-3 8 0"
        stroke={S}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="44.5" y="20" width="3" height="18" rx="1.5" fill={K} />
      <path d="M41 9v8a5 5 0 0 0 10 0V9" stroke={K} strokeWidth="2" fill="none" />
      <path d="M44.3 9v9M47.7 9v9" stroke={K} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="32" cy="46" rx="26" ry="4" fill={K} />
    </>
  );
}
