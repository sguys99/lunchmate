// 투표 링크 미리보기 이미지 주소 (T7.14, D-17 안건 7). 서버 메타(metadata.ts)와 브라우저 카카오 공유(share-invite.ts)가 같이 쓴다.
// ?v=는 캐시 버전이다. 메타는 서버가 읽은 투표 상태로, 카카오 공유는 브라우저가 아는 값(제목, 마감, 후보 수)으로 만든다.
// 라우트는 v가 서버 버전과 같을 때만 하루 캐시하고, 다르면 5분만 캐시한다(값이 바뀌면 주소가 바뀌어 카카오도 새로 읽는다).
import type { OgImageKind } from "./types";

/**
 * 그림 버전. OG 그림 모양을 바꾸면 올린다. 버전 해시에 들어가 주소(?v=)가 바뀌어 카카오 스크랩 캐시와 하루 CDN 캐시가 새 그림을 읽는다.
 * 2: 왼쪽 위 기호 추가(T8.2, D-18 안건 6)
 */
export const OG_ART_VERSION = "2";

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
