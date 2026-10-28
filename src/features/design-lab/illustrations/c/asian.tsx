import { K, L, M } from "./tones";

// 아시안: 깊은 면기 위 쌀국수와 젓가락
export function AsianC() {
  return (
    <>
      <path
        d="M29 30V17M33.5 30V15M38 30V17"
        stroke={L}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M22 14l28-7M22 18l29-4"
        stroke={K}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M8 30h48a24 19 0 0 1-48 0z" fill={K} />
      <rect x="10" y="28" width="44" height="4" rx="2" fill={M} />
      <rect x="26" y="47" width="12" height="4" rx="2" fill={K} />
    </>
  );
}
