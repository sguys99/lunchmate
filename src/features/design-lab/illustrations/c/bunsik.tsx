import { K, L, M } from "./tones";

// 분식: 떡볶이 접시와 김밥 단면
export function BunsikC() {
  return (
    <>
      <path d="M8 38a16 8 0 0 1 32 0z" fill={M} />
      <rect
        x="9"
        y="31"
        width="12"
        height="5"
        rx="2.5"
        fill={L}
        transform="rotate(-12 15 33.5)"
      />
      <rect
        x="19"
        y="26"
        width="12"
        height="5"
        rx="2.5"
        fill={L}
        transform="rotate(10 25 28.5)"
      />
      <rect
        x="25"
        y="32"
        width="12"
        height="5"
        rx="2.5"
        fill={L}
        transform="rotate(-6 31 34.5)"
      />
      <path d="M6 38h36a18 10 0 0 1-36 0z" fill={K} />
      <circle cx="48" cy="38" r="11" fill={K} />
      <circle cx="48" cy="38" r="8" fill={L} />
      <circle cx="48" cy="38" r="3.5" fill={M} />
    </>
  );
}
