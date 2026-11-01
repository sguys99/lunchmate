// 투표 링크 미리보기 이미지 주소 (T7.14, D-17 안건 7). 서버 메타(metadata.ts)와 브라우저 카카오 공유(share-invite.ts)가 같이 쓴다.
// ?v=는 캐시 버전이다. 메타는 서버가 읽은 투표 상태로, 카카오 공유는 브라우저가 아는 값(제목, 마감, 후보 수)으로 만든다.
// 라우트는 v가 서버 버전과 같을 때만 하루 캐시하고, 다르면 5분만 캐시한다(값이 바뀌면 주소가 바뀌어 카카오도 새로 읽는다).
import type { OgImageKind } from "./types";

/** FNV-1a 32비트. 보안용이 아니라 캐시 버전용 */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function pollOgImagePath(
  code: string,
  img: OgImageKind,
  version: string | null,
): string {
  const q = new URLSearchParams({ img });
  if (version) q.set("v", version);
  return `/api/og/poll/${encodeURIComponent(code)}?${q.toString()}`;
}
