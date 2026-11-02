// 현위치 (T4.16, T0.18). 브라우저 측위 좌표는 지도 중심 이동에만 쓴다.
// - 받은 좌표는 곧바로 MapMoveTarget(지도 이동 전용)으로 감싼다. 핀, 저장 요청, 분석, 로그로 가지 않는다.
// - 서버, PostHog, Sentry로 보내지 않는다(CLAUDE.md 7장). 이 파일은 좌표를 콘솔에도 쓰지 않는다.
// - 콜백이 오지 않으면 LOCATE_HARD_CAP_MS 뒤 "unavailable"로 끝낸다(T9.10, 스켈레톤에 멈추지 않게).
// - 권한 거부(PERMISSION_DENIED)는 "denied"로 알리고, 화면은 현위치 버튼을 숨기고 검색 안내를 보여 준다(AC-ONB-2).
import { mapMoveTarget, type MapMoveTarget } from "./pin";

export type LocateResult =
  | { ok: true; target: MapMoveTarget }
  | { ok: false; reason: "denied" | "unavailable" };

export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

const PERMISSION_DENIED = 1;

/** 측위 제한 시간(브라우저 timeout 옵션). 권한을 받은 뒤부터 센다 */
export const LOCATE_TIMEOUT_MS = 8_000;
/**
 * 콜백이 아예 오지 않을 때의 상한(T9.10). 브라우저 timeout 옵션은 권한을 받은 뒤부터만 세므로, 권한 창이 뜨지 않거나
 * (iOS Chrome, 인앱 브라우저), 답하지 않은 채 탭을 옮기면 성공도 실패도 오지 않아 화면이 스켈레톤에 멈춘다.
 * 권한 창을 읽을 시간만큼 더 기다린 뒤 "unavailable"로 끝낸다. 늦게 오는 결과는 버린다(다시 찾기로 다시 묻는다).
 */
export const LOCATE_HARD_CAP_MS = LOCATE_TIMEOUT_MS + 4_000;

export function locateOnce(
  geo: Geolocation | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation,
  timeoutMs = LOCATE_TIMEOUT_MS,
  capMs = timeoutMs + (LOCATE_HARD_CAP_MS - LOCATE_TIMEOUT_MS),
): Promise<LocateResult> {
  if (!geo) return Promise.resolve({ ok: false, reason: "unavailable" });
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: LocateResult) => {
      if (done) return;
      done = true;
      clearTimeout(cap);
      resolve(r);
    };
    const cap = setTimeout(
      () => finish({ ok: false, reason: "unavailable" }),
      capMs,
    );
    try {
      geo.getCurrentPosition(
        (pos) =>
          finish({
            ok: true,
            target: mapMoveTarget(
              { lat: pos.coords.latitude, lng: pos.coords.longitude },
              "current-location",
            ),
          }),
        (err) =>
          finish({
            ok: false,
            reason: err.code === PERMISSION_DENIED ? "denied" : "unavailable",
          }),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
      );
    } catch {
      finish({ ok: false, reason: "unavailable" });
    }
  });
}

/** 권한 상태(묻지 않고 읽기만). Permissions API가 없으면 unknown */
export async function readGeoPermission(): Promise<GeoPermission> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions)
      return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}
