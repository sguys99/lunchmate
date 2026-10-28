import { K, L, M } from "./tones";

// 한식: 밥공기와 반찬 접시 둘
export function HansikC() {
  return (
    <>
      <path d="M8 31a13 12 0 0 1 26 0z" fill={L} />
      <path d="M6 31h30a15 15 0 0 1-30 0z" fill={K} />
      <rect x="15" y="45" width="12" height="4" rx="2" fill={K} />
      <path d="M41 34a8 6 0 0 1 16 0z" fill={M} />
      <rect x="39" y="33" width="20" height="4" rx="2" fill={K} />
      <path d="M41 46a8 6 0 0 1 16 0z" fill={L} />
      <rect x="39" y="45" width="20" height="4" rx="2" fill={K} />
    </>
  );
}
