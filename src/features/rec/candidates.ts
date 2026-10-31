// 카카오 음식점 → 추천 엔진 후보 (T5.17, REC-03). 순수 함수, React와 네트워크 의존 없음.
//
// 데이터 규칙 (CLAUDE.md 7장, T0.16)
// - 입력(KakaoRestaurant)과 출력(Candidate)은 세션 메모리 값이다. 저장, 로그, 분석 이벤트에 넣지 않는다.
// - 우리 DB 집계(가격 제보, 👍, 폐업, 웨이팅, 할인)는 6단계에서 place_id로 붙는다. 그 전에는 빈 값(콜드 스타트)이다.
//   집계를 붙일 때는 PlaceStats를 넘긴다(없으면 EMPTY_STATS).
import type { Candidate } from "@/lib/reco/types";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import type { LatLng } from "@/lib/map/types";
import { kakaoCategorySlug, kakaoCategoryText } from "./kakao-category";

/** place_id에 붙는 우리 DB 집계(6단계). 홈은 아직 비어 있다 */
export type PlaceStats = Pick<
  Candidate,
  "priceReport" | "thumbs" | "closedReports" | "waiting" | "deal"
>;

export const EMPTY_STATS: PlaceStats = {
  priceReport: null,
  thumbs: { up: 0, down: 0 },
  closedReports: 0,
  waiting: null,
  deal: null,
};

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이 직선거리(m, 하버사인) */
export function straightDistanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 카카오 음식점 한 곳 → 후보. 거리는 카카오 값(기준점 직선거리)이 없을 때만 직접 잰다 */
export function toCandidate(
  place: KakaoRestaurant,
  center: LatLng,
  stats: PlaceStats = EMPTY_STATS,
): Candidate {
  return {
    id: place.id,
    name: place.name,
    category: kakaoCategorySlug(place.categoryName),
    categoryText: kakaoCategoryText(place.categoryName),
    distanceM: place.distance ?? straightDistanceM(center, place.position),
    ...stats,
  };
}

export function toCandidates(
  places: readonly KakaoRestaurant[],
  center: LatLng,
  statsOf: (id: string) => PlaceStats = () => EMPTY_STATS,
): Candidate[] {
  return places.map((p) => toCandidate(p, center, statsOf(p.id)));
}
