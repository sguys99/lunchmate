"use client";
// 지도 탭의 식당 상세(본문, 하단 행동 줄, 목록 보기 전체 상세)를 지연 로딩한다 (T8.10).
// - 상세 본문 모듈은 더보기 메뉴(Base UI Menu, floating-ui), 제보, 후기 의존이 커서 지도 탭 첫 로드에서 뺀다
//   (Lighthouse 모바일 /map, docs/design/g8-lighthouse.md).
// - 식당 목록이 뜬 뒤 브라우저가 한가할 때 미리 받는다(preloadPlaceDetail). 보통 마커를 누를 때는 이미 받아져 있어 화면이 같다.
//   그 전에 누르면 받는 동안 상세 스켈레톤(같은 자리, 같은 높이 틀)을 보인다.
import { lazy, Suspense } from "react";
import type { PlaceDetailProps } from "@/features/place/detail/place-detail";
import { PlaceDetailSkeleton } from "@/features/place/detail/place-detail-skeleton";

let loading:
  Promise<typeof import("@/features/place/detail/place-detail")> | undefined;

/** 상세 본문 모듈을 한 번만 받는다. 실패하면 다음 호출에서 다시 시도한다 */
export function loadPlaceDetail() {
  loading ??= import("@/features/place/detail/place-detail").catch((e) => {
    loading = undefined;
    throw e;
  });
  return loading;
}

/** 유휴 시점에 미리 받는다. 서버에서는 아무 일도 하지 않는다 */
export function preloadPlaceDetail(): void {
  if (typeof window === "undefined" || loading) return;
  const run = () => void loadPlaceDetail().catch(() => {});
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 200);
  }
}

const LazyDetail = lazy(() =>
  loadPlaceDetail().then((m) => ({ default: m.PlaceDetail })),
);
const LazyBody = lazy(() =>
  loadPlaceDetail().then((m) => ({ default: m.PlaceDetailBody })),
);
const LazyActions = lazy(() =>
  loadPlaceDetail().then((m) => ({ default: m.PlaceDetailActions })),
);

type DetailProps = PlaceDetailProps & { footerClassName?: string };

export function MapPlaceDetail(props: DetailProps) {
  return (
    <Suspense fallback={<PlaceDetailSkeleton />}>
      <LazyDetail {...props} />
    </Suspense>
  );
}

export function MapPlaceDetailBody(props: PlaceDetailProps) {
  return (
    <Suspense fallback={<PlaceDetailSkeleton />}>
      <LazyBody {...props} />
    </Suspense>
  );
}

export function MapPlaceDetailActions(props: PlaceDetailProps) {
  return (
    <Suspense fallback={null}>
      <LazyActions {...props} />
    </Suspense>
  );
}
