// 마커 클러스터 묶기 (T5.27, MAP-02, D-09 안건 8). 순수 함수, 새 의존성 없이 직접 구현한다.
//
// 기준: 화면에서 알약 마커 한 개 크기(약 40px) 안에 겹치는 마커를 하나로 묶는다.
// 알약은 가로로 길어서(최소 44, "12분"이면 약 56) 가로 52px, 세로 36px 상자 안이면 겹친 것으로 본다.
// - 지도 영역(getBounds)과 칸 크기로 위경도를 화면 px로 옮긴 뒤 묶는다. 확대가 바뀌면(onIdle) 다시 묶는다.
// - 가까운 순으로 앞선 마커가 씨앗이 되어 그 상자 안의 나머지를 모은다(탐욕, 결정적).
// - keep에 든 id(고른 마커, 사용자가 펼친 묶음)는 묶지 않는다. 고른 마커가 묶음 속에 숨지 않게.
import type { Bounds, LatLng } from "@/lib/map/types";

export const CLUSTER_GAP_X_PX = 52;
export const CLUSTER_GAP_Y_PX = 36;

export type ClusterInput = { readonly id: string; readonly position: LatLng };

export type MarkerGroup =
  | { readonly kind: "single"; readonly id: string }
  | {
      readonly kind: "cluster";
      readonly ids: readonly string[];
      /**
       * 묶음 표시 위치: 씨앗(가장 가까운 구성원) 좌표. 씨앗끼리는 상자 밖이라 묶음 알약이 서로 겹치지 않는다
       * (예전 평균 자리는 묶음들이 가운데로 끌려 겹쳤다, 2026-10-31 실기기 확인)
       */
      readonly position: LatLng;
    };

/** 위경도 → 칸 왼쪽 위 기준 px. 좁은 영역(수 km)이라 메르카토르 왜곡은 무시한다 */
export function toScreenPx(
  p: LatLng,
  bounds: Bounds,
  size: { width: number; height: number },
): { x: number; y: number } {
  const lngSpan = bounds.ne.lng - bounds.sw.lng || 1e-9;
  const latSpan = bounds.ne.lat - bounds.sw.lat || 1e-9;
  return {
    x: ((p.lng - bounds.sw.lng) / lngSpan) * size.width,
    y: ((bounds.ne.lat - p.lat) / latSpan) * size.height,
  };
}

export function groupMarkers(
  items: readonly ClusterInput[],
  view: { bounds: Bounds; size: { width: number; height: number } } | null,
  keep: ReadonlySet<string> = new Set(),
  gap: { x: number; y: number } = { x: CLUSTER_GAP_X_PX, y: CLUSTER_GAP_Y_PX },
): MarkerGroup[] {
  // 화면 크기를 아직 모르면 묶지 않는다
  if (!view || view.size.width <= 0 || view.size.height <= 0) {
    return items.map((i) => ({ kind: "single", id: i.id }));
  }
  const px = items.map((i) => toScreenPx(i.position, view.bounds, view.size));
  const used = new Array<boolean>(items.length).fill(false);
  const out: MarkerGroup[] = [];
  items.forEach((seed, i) => {
    if (used[i]) return;
    used[i] = true;
    if (keep.has(seed.id)) {
      out.push({ kind: "single", id: seed.id });
      return;
    }
    const a = px[i];
    const members = [i];
    items.forEach((other, j) => {
      if (used[j] || keep.has(other.id)) return;
      const b = px[j];
      if (!a || !b) return;
      if (Math.abs(a.x - b.x) < gap.x && Math.abs(a.y - b.y) < gap.y) {
        used[j] = true;
        members.push(j);
      }
    });
    if (members.length === 1) {
      out.push({ kind: "single", id: seed.id });
      return;
    }
    out.push({
      kind: "cluster",
      ids: members.map((m) => items[m]!.id),
      position: seed.position,
    });
  });
  return out;
}

/** 묶음 구성원을 감싸는 영역. 묶음을 누르면 이 영역으로 다가간다 */
export function boundsOf(points: readonly LatLng[]): Bounds {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
}
