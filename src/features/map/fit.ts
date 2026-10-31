// 지도 맞춤 계산 (T5.26, MAP-01). 순수 함수.
// 모바일은 위(칩 줄)와 아래(시트, 하단 탭)가 지도를 가리므로, 보이는 칸에 맞는 확대 단계와 그 칸 가운데에 오는 지도 가운데를 계산한다.
import type { Bounds, LatLng } from "@/lib/map/types";

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) =>
  M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/** 원(반지름 m)을 감싸는 영역 */
export function circleBounds(center: LatLng, radiusM: number): Bounds {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng(center.lat);
  return {
    sw: { lat: center.lat - dLat, lng: center.lng - dLng },
    ne: { lat: center.lat + dLat, lng: center.lng + dLng },
  };
}

export type Inset = { top: number; bottom: number };

/**
 * 맞출 원의 반지름(m). 카카오 상한(45곳)에 닿으면 받은 식당은 걸어서 갈 수 있는 원보다 훨씬 안쪽에 모여 있다
 * (강남역 도보 10분 원 515m, 받은 45곳은 모두 160m 안). 원 전체에 맞추면 45곳이 알약 한 개 크기에 겹쳐 한 묶음이 된다.
 * 그때는 받은 식당이 모인 범위(가장 먼 곳 + 10%, 최소 120m)에 맞춘다. 상한이 아니면 걸어서 갈 수 있는 원 그대로.
 */
export const FIT_MIN_RADIUS_M = 120;
export function fitRadiusM(
  center: LatLng,
  places: readonly { position: LatLng }[] | null,
  radiusM: number,
  capped: boolean,
): number {
  if (!capped || !places || places.length === 0) return radiusM;
  let far = 0;
  for (const p of places) far = Math.max(far, distanceM(center, p.position));
  // 10m 단위로 끊어 목록이 조금 바뀌어도(즐겨찾기, 숨김) 다시 맞추지 않게
  const r = Math.min(radiusM, Math.max(FIT_MIN_RADIUS_M, far * 1.1));
  return Math.min(radiusM, Math.ceil(r / 10) * 10);
}

function distanceM(a: LatLng, b: LatLng): number {
  const dy = (a.lat - b.lat) * M_PER_DEG_LAT;
  const dx = (a.lng - b.lng) * mPerDegLng((a.lat + b.lat) / 2);
  return Math.hypot(dx, dy);
}

/**
 * 맞춤 계획: box가 위아래 겹침(inset)을 뺀 보이는 칸에 들어오게 하는 지도 가운데와 확대 단계.
 *
 * 2026-10-31 실기기 피드백(원이 작게, 45곳이 한 묶음) 원인과 바꾼 점:
 * - 네이버 지도는 확대 단계가 정수뿐이고 fitBounds는 다 들어가는 가장 큰 단계(내림)를 고른다. 원이 보이는 칸의 절반까지 작아진다.
 *   (소수 단계를 쓰는 디자인 랩 목업에서는 드러나지 않았다.) 정수 단계 공급자는 반올림한다. 원은 보이는 칸의 0.71~1.41배.
 * - 예전 방식은 넓힌 영역의 가운데를 "목표 m/px"로 옮겼는데, 실제 단계가 내림되면 m/px가 달라 원이 보이는 칸 아래로 처졌다.
 *   이제는 고른 단계의 실제 m/px로 가운데를 옮긴다.
 * - 네이버 fitBounds의 위아래 다른 여백은 쏠림의 절반만 반영한다(실측). 그래서 fitBounds 대신 setCenter + setZoom을 쓴다.
 * current는 지금 단계와 지금 영역(지금 m/px를 재는 데 쓴다).
 */
export function planFit(input: {
  box: Bounds;
  size: { width: number; height: number };
  pad: number;
  inset: Inset;
  current: { zoom: number; bounds: Bounds };
  /** 정수 단계만 되는 공급자(네이버) */
  integerZoom: boolean;
}): { center: LatLng; zoom: number } | null {
  const { box, size, pad, inset, current } = input;
  const { width: w, height: h } = size;
  const curLatSpan = current.bounds.ne.lat - current.bounds.sw.lat;
  if (w <= 0 || h <= 0 || curLatSpan <= 0) return null;
  const lat0 = (box.sw.lat + box.ne.lat) / 2;
  const kx = mPerDegLng(lat0);
  const boxW = (box.ne.lng - box.sw.lng) * kx;
  const boxH = (box.ne.lat - box.sw.lat) * M_PER_DEG_LAT;
  const visW = Math.max(40, w - pad * 2);
  const visH = Math.max(40, h - inset.top - inset.bottom - pad * 2);
  const want = Math.max(boxW / visW, boxH / visH, MIN_M_PER_PX);
  const mppNow = (curLatSpan * M_PER_DEG_LAT) / h;
  const zoomFor = (mpp: number) => current.zoom + Math.log2(mppNow / mpp);
  const zMax = zoomFor(MIN_M_PER_PX);
  const zf = zoomFor(want);
  const zoom = input.integerZoom
    ? Math.min(Math.round(zf), Math.floor(zMax + 1e-9))
    : zf;
  const mpp = mppNow * 2 ** (current.zoom - zoom);
  // 지도 가운데(h/2)가 보이는 칸 가운데보다 몇 px 아래인가. 그만큼 남쪽으로
  const visTop = Math.min(inset.top, h - 40);
  const visBottom = Math.max(visTop + 40, h - inset.bottom);
  const dyPx = h / 2 - (visTop + visBottom) / 2;
  return {
    center: {
      lat: lat0 - (dyPx * mpp) / M_PER_DEG_LAT,
      lng: (box.sw.lng + box.ne.lng) / 2,
    },
    zoom,
  };
}

/** 이보다 더 확대하지 않는다(가까이 붙은 묶음을 펼칠 때) */
const MIN_M_PER_PX = 0.2;

/**
 * 고른 식당이 보이는 칸 가운데에 오게 하는 지도 가운데. 지금 영역(bounds)과 칸 높이로 px당 위도를 잰다.
 */
export function centerForFocus(
  target: LatLng,
  bounds: Bounds,
  height: number,
  inset: Inset,
): LatLng {
  if (height <= 0) return target;
  const degPerPx = (bounds.ne.lat - bounds.sw.lat) / height;
  const dyPx = (inset.bottom - inset.top) / 2;
  return { lat: target.lat - dyPx * degPerPx, lng: target.lng };
}
