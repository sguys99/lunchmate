// 현위치 (T4.16, T0.18). 브라우저 측위 좌표는 지도 중심 이동에만 쓴다.
// - 받은 좌표는 곧바로 MapMoveTarget(지도 이동 전용)으로 감싼다. 핀, 저장 요청, 분석, 로그로 가지 않는다.
// - 서버, PostHog, Sentry로 보내지 않는다(CLAUDE.md 7장). 이 파일은 좌표를 콘솔에도 쓰지 않는다.
// - 권한 거부(PERMISSION_DENIED)는 "denied"로 알리고, 화면은 현위치 버튼을 숨기고 검색 안내를 보여 준다(AC-ONB-2).
import { mapMoveTarget, type MapMoveTarget } from "./pin";

export type LocateResult =
  | { ok: true; target: MapMoveTarget }
  | { ok: false; reason: "denied" | "unavailable" };

export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

const PERMISSION_DENIED = 1;

export function locateOnce(
  geo: Geolocation | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation,
  timeoutMs = 10_000,
): Promise<LocateResult> {
  if (!geo) return Promise.resolve({ ok: false, reason: "unavailable" });
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          target: mapMoveTarget(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            "current-location",
          ),
        }),
      (err) =>
        resolve({
          ok: false,
          reason: err.code === PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
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
