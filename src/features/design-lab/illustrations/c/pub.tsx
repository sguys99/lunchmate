import { K, L, M } from "./tones";

// 술집: 맥주잔과 꼬치 안주
export function PubC() {
  return (
    <>
      <path
        d="M31 26h2a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5h-2"
        stroke={K}
        strokeWidth="3.5"
        fill="none"
      />
      <rect x="9" y="20" width="23" height="30" rx="3" fill={K} />
      <rect x="12" y="25" width="17" height="22" rx="1.5" fill={M} />
      <path d="M8 23a4 4 0 0 1 4-7h17a4 4 0 0 1 4 7z" fill={L} />
      <path d="M46 47l10-33" stroke={K} strokeWidth="2" strokeLinecap="round" />
      <circle cx="49" cy="37" r="5" fill={M} />
      <circle cx="51.5" cy="28.5" r="4" fill={L} />
      <circle cx="54" cy="20" r="5" fill={M} />
      <rect x="40" y="47" width="20" height="3" rx="1.5" fill={K} />
    </>
  );
}
