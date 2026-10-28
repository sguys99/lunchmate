import { K, L, M } from "./tones";

// 샐러드/건강식: 볼 위 잎채소와 방울토마토
export function SaladC() {
  return (
    <>
      <circle cx="19" cy="31" r="7" fill={M} />
      <circle cx="30" cy="26" r="8" fill={M} />
      <circle cx="43" cy="29" r="7.5" fill={M} />
      <circle cx="26" cy="31" r="4" fill={K} />
      <circle cx="41" cy="22" r="3.5" fill={K} />
      <circle cx="36" cy="32" r="3" fill={L} />
      <path d="M8 34h48a24 15 0 0 1-48 0z" fill={K} />
      <rect x="26" y="47" width="12" height="4" rx="2" fill={K} />
    </>
  );
}
