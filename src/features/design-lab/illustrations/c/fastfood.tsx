import { K, L, M } from "./tones";

// 패스트푸드: 번, 치즈, 패티가 쌓인 버거
export function FastfoodC() {
  return (
    <>
      <path d="M13 30a19 16 0 0 1 38 0z" fill={M} />
      <ellipse cx="25" cy="21" rx="1.6" ry="1" fill={L} />
      <ellipse cx="32" cy="18" rx="1.6" ry="1" fill={L} />
      <ellipse cx="39" cy="21" rx="1.6" ry="1" fill={L} />
      <path d="M12 31h40v3h-10l-4 4l-4-4h-22z" fill={L} />
      <rect x="11" y="34" width="42" height="7" rx="3.5" fill={K} />
      <rect x="13" y="43" width="38" height="7" rx="3.5" fill={M} />
    </>
  );
}
