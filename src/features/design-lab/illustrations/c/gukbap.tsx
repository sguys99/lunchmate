import { K, L, M } from "./tones";

// 국밥/탕: 손잡이 달린 뚝배기와 김
export function GukbapC() {
  return (
    <>
      <path
        d="M24 22q-3-4 0-8M32 22q-3-4 0-8M40 22q-3-4 0-8"
        stroke={L}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="6" y="30" width="8" height="5" rx="2.5" fill={K} />
      <rect x="50" y="30" width="8" height="5" rx="2.5" fill={K} />
      <path d="M11 28h42v8a14 14 0 0 1-14 14h-14a14 14 0 0 1-14-14z" fill={K} />
      <rect x="14" y="27" width="36" height="5" rx="2.5" fill={M} />
    </>
  );
}
