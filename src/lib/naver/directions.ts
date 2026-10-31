// 네이버 지도 길찾기와 장소 링크 만들기 (T5.36 NAV-01, T5.37 NAV-02, NAV-03, T5.35 PLACE-04). 순수 함수, React와 DOM 의존 없음.
//
// 출처
// - 앱 URL Scheme (2026-10-31 확인): NAVER Cloud "지도앱 연동 URL Scheme"
//   https://guide.ncloud-docs.com/docs/maps-url-scheme
//   도보 길찾기 nmap://route/walk?slat=&slng=&sname=&dlat=&dlng=&dname=&appname=
//   appname은 모든 URL에 필수이고, 웹 페이지는 그 페이지의 URL을 값으로 쓴다.
//   출발지를 빼면 앱이 현위치에서 출발한다. 미설치 감지는 문서의 iOS 예시처럼 타이머 방식(1500ms)이다.
// - 네이버 지도 웹 길찾기와 검색 링크: 네이버는 웹 URL 형식 문서를 제공하지 않는다
//   (NAVER Cloud Forum "모바일에서 위도, 경도만으로 웹 url 호출 관련 문의" 답변: 웹 URL Scheme 문서 없음).
//   아래 형식은 지금 map.naver.com이 쓰는 주소 모양이다 [확인 필요: 실기기에서 열어 보고 바뀌면 이 파일만 고친다].
//     길찾기 https://map.naver.com/p/directions/{경도},{위도},{이름}/{경도},{위도},{이름}/-/walk  (출발지 모르면 "-")
//     검색   https://map.naver.com/p/search/{검색어}?c={경도},{위도},{줌},0,0,0,dh
//
// 데이터 규칙 (CLAUDE.md 7장)
// - 여기서 만든 URL은 사용자 브라우저가 네이버 앱이나 웹으로 바로 연다. 우리 서버, PostHog, Sentry로 보내지 않는다.
// - 현위치 출발이면 앱 URL에는 출발지를 넣지 않는다(앱이 기기 위치를 쓴다). 웹 URL에만 넣는다.
import type { LatLng } from "@/lib/map/types";

export type DirectionsPoint = {
  /** 화면에 보일 이름(식당명, "사무실", "현위치") */
  readonly name: string;
  readonly position: LatLng;
};

/** 길찾기 출발지. office: 사무실 핀, current: 브라우저 현위치(서버 전송 금지) */
export type DirectionsOrigin = DirectionsPoint & {
  readonly kind: "office" | "current";
};

export const NAVER_MAP_WEB = "https://map.naver.com";
/** 검색 링크의 지도 줌. 동네 식당이 보이는 정도 */
const SEARCH_ZOOM = 17;

/** 좌표를 7자리(약 1cm)로 자른다. 지수 표기와 긴 꼬리를 막는다 */
function coord(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError("좌표가 올바르지 않습니다");
  return String(Math.round(n * 1e7) / 1e7);
}

/**
 * URL Scheme의 appname. 웹은 페이지 URL을 쓴다(공식 문서). NEXT_PUBLIC_SITE_URL에서 만든 사이트 기준 URL을 받는다.
 * 하드코딩 금지(CLAUDE.md 12장): 부르는 쪽이 siteUrl()을 넘긴다.
 */
export function naverAppName(site: string): string {
  const trimmed = site.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+/i.test(trimmed)) {
    throw new Error("appname에는 http(s) 사이트 URL이 필요합니다");
  }
  return trimmed;
}

/** 앱 도보 길찾기 (NAV-01). 출발지가 현위치거나 없으면 생략해 앱이 현위치에서 출발하게 한다 */
export function nmapWalkUrl(args: {
  destination: DirectionsPoint;
  origin: DirectionsOrigin | null;
  appname: string;
}): string {
  const { destination: d, origin: o, appname } = args;
  const parts: [string, string][] = [];
  if (o && o.kind === "office") {
    parts.push(
      ["slat", coord(o.position.lat)],
      ["slng", coord(o.position.lng)],
      ["sname", o.name],
    );
  }
  parts.push(
    ["dlat", coord(d.position.lat)],
    ["dlng", coord(d.position.lng)],
    ["dname", d.name],
    ["appname", appname],
  );
  // URLSearchParams는 공백을 +로 바꾼다. 앱 쪽 해석이 확실한 퍼센트 인코딩을 쓴다
  const query = parts
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `nmap://route/walk?${query}`;
}

/** 경로 칸 하나: "경도,위도,이름". 이름 안의 쉼표와 슬래시는 칸을 깨므로 공백으로 바꾼다 */
function webPoint(p: DirectionsPoint): string {
  const safeName = p.name.replace(/[,/]/g, " ").trim();
  return [
    coord(p.position.lng),
    coord(p.position.lat),
    encodeURIComponent(safeName),
  ].join(",");
}

/** 네이버 지도 웹 도보 길찾기 (NAV-02 앱 미설치 대체, NAV-03 데스크톱) [확인 필요: 웹 URL 비공식 형식] */
export function naverWebWalkUrl(args: {
  destination: DirectionsPoint;
  origin: DirectionsOrigin | null;
}): string {
  // 현위치는 추천 계산과 지도 중심 이동에만 쓴다(CLAUDE.md 7장). URL이 Sentry 이동 기록에 남을 수 있어
  // 웹 URL에도 넣지 않고, 출발지를 비워 네이버 지도가 기기 위치를 묻게 한다.
  const start =
    args.origin && args.origin.kind === "office" ? webPoint(args.origin) : "-";
  return `${NAVER_MAP_WEB}/p/directions/${start}/${webPoint(args.destination)}/-/walk`;
}

/**
 * "네이버 플레이스에서 보기" (PLACE-04, 영업시간, 메뉴, 사진). 카카오 id로는 네이버 장소를 찾을 수 없어
 * 이름 검색에 그 식당 좌표를 지도 중심으로 붙인다(동명 식당이 섞이지 않게, D-10 안건 7).
 */
export function naverPlaceSearchUrl(
  name: string,
  position: LatLng | null,
): string {
  const base = `${NAVER_MAP_WEB}/p/search/${encodeURIComponent(name.trim())}`;
  if (!position) return base;
  return `${base}?c=${coord(position.lng)},${coord(position.lat)},${SEARCH_ZOOM},0,0,0,dh`;
}

/** 휴대폰, 태블릿 브라우저인가(앱 실행을 시도할지). 데스크톱은 바로 웹(NAV-03) */
export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /Android|iPhone|iPad|iPod|Mobile|KAKAOTALK|NAVER\(inapp/i.test(ua);
}
