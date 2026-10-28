import { K, L, M } from "./tones";

// 고기: 둥근 불판 격자 위 고기 두 점
export function GogiC() {
  return (
    <>
      <rect x="5" y="32" width="54" height="5" rx="2.5" fill={K} />
      <circle cx="32" cy="34.5" r="21" fill={K} />
      <circle cx="32" cy="34.5" r="17" fill={L} />
      <path
        d="M19 27h26M16 34.5h32M19 42h26"
        stroke={K}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="14" y="25" width="19" height="11" rx="4" fill={M} transform="rotate(-16 23.5 30.5)" />
      <rect x="31" y="34" width="18" height="10" rx="4" fill={M} transform="rotate(12 40 39)" />
    </>
  );
}
