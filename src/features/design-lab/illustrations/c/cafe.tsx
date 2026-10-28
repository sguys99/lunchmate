import { K, L, M } from "./tones";

// 카페/베이커리: 손잡이 컵과 식빵
export function CafeC() {
  return (
    <>
      <path
        d="M19 20q-3-4 0-8M27 20q-3-4 0-8"
        stroke={L}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="35" cy="34" r="5" stroke={K} strokeWidth="3.5" fill="none" />
      <path d="M10 25h26v14a9 9 0 0 1-9 9h-8a9 9 0 0 1-9-9z" fill={K} />
      <rect x="12" y="25" width="22" height="3" rx="1.5" fill={M} />
      <rect x="6" y="48" width="34" height="3" rx="1.5" fill={M} />
      <path d="M41 51v-12a9.5 8 0 0 1 19 0v12z" fill={M} />
      <path
        d="M46 36v8M51 34v10M56 36v8"
        stroke={L}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}
