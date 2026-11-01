// 투표 경로 헬퍼 (T7.15, D-14, D-17). 투표방, 결과 공유 링크, 투표 탭, 회식 모드 주소를 한곳에서 만든다.
// 투표방과 미리보기는 같은 주소(/poll/<code>)이고, 결과 공유 링크는 카카오 스크랩 캐시를 피하려고 따로 둔다(D-17 안건 7).

/** 투표 탭 (POLL-10) */
export const pollTabHref = "/poll";

/** 회식 모드 (PARTY, D-16 안건 7) */
export const partyHref = "/poll/party";

/** 투표방. 비로그인은 미리보기, 참여자는 투표방 (POLL-05) */
export function pollRoomHref(code: string): string {
  return `/poll/${encodeURIComponent(code)}`;
}

/** 결과 공유 링크 (POLL-09S). 공개 OG에는 식당 이름이 없다 */
export function pollResultHref(code: string): string {
  return `${pollRoomHref(code)}/result`;
}
