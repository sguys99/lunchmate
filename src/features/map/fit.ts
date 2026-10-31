// 지도 맞춤 계산 (T5.26, MAP-01). 순수 함수.
// MapInstance.fitBounds는 네 방향 같은 여백만 받는다. 모바일은 위(칩 줄)와 아래(시트)가 지도를 가리므로,
// 보이는 칸 비율로 넓힌 영역을 만들어 넘긴다(축척 = 영역 ÷ 보이는 칸, 가운데 = 보이는 칸 가운데).
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
 * box가 위아래 겹침(inset)을 뺀 보이는 칸에 다 들어오게 하는 영역. 결과를 fitBounds(결과, pad)로 넘긴다.
 * 칸 크기를 모르면 box를 그대로 돌려준다.
 */
export function fitWithInset(
  box: Bounds,
  size: { width: number; height: number },
  pad: number,
  inset: Inset,
): Bounds {
  const { width: w, height: h } = size;
  if (w <= 0 || h <= 0) return box;
  const lat0 = (box.sw.lat + box.ne.lat) / 2;
  const kx = mPerDegLng(lat0);
  const boxW = (box.ne.lng - box.sw.lng) * kx;
  const boxH = (box.ne.lat - box.sw.lat) * M_PER_DEG_LAT;
  const visW = Math.max(40, w - pad * 2);
  const visH = Math.max(40, h - inset.top - inset.bottom - pad * 2);
  const mpp = Math.max(boxW / visW, boxH / visH, 0.2);
  // 지도 가운데(h/2)가 보이는 칸 가운데보다 몇 px 아래인가
  const dyPx = h / 2 - (inset.top + pad + visH / 2);
  const cLat = lat0 - (dyPx * mpp) / M_PER_DEG_LAT;
  const cLng = (box.sw.lng + box.ne.lng) / 2;
  const halfW = (mpp * (w - pad * 2)) / 2 / kx;
  const halfH = (mpp * (h - pad * 2)) / 2 / M_PER_DEG_LAT;
  return {
    sw: { lat: cLat - halfH, lng: cLng - halfW },
    ne: { lat: cLat + halfH, lng: cLng + halfW },
  };
}

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
