"use client";
// 식당 상세 실제 구현 확인 화면 (T5.33~T5.38): /design-lab/place/live?...
//   view=sheet|inline   sheet: 홈 위 바텀시트(지연 로딩 Drawer, 열린 채 시작), inline: 지도 시트 안처럼 컨테이너 없이
//   state=ready|loading|error   data=full|sparse|empty   name=fail(이름 해석 실패)
// 오프라인은 브라우저를 오프라인으로 두고 본다(useOnlineStatus). 데이터는 목업이고 서버 액션(즐겨찾기 상태)은 실제로 부른다.
import { useEffect, useRef } from "react";
import { AppShell, MapPane, TabBarView } from "@/components/app-shell";
import { LazyToaster } from "@/components/ui/lazy-toaster";
import {
  EMPTY_PLACE_STATS,
  type PlaceDetailPlace,
  type PlaceDetailStats,
} from "@/features/place/detail-model";
import {
  PlaceDetail,
  PlaceDetailError,
  PlaceDetailSkeleton,
  usePlaceDetailSheet,
  type PlaceDetailSheetContent,
} from "@/features/place/detail";
import { buttonClass } from "@/components/ui/button-classes";
import { QueryProvider } from "@/lib/query";
import type { DirectionsOrigin } from "@/lib/naver/directions";

export type LiveParams = {
  view: "sheet" | "inline";
  state: "ready" | "loading" | "error";
  data: "full" | "sparse" | "empty";
  nameFail: boolean;
};

const PLACE: PlaceDetailPlace = {
  id: "10000001",
  placeUrl: "https://place.map.kakao.com/10000001",
  category: "gukbap",
  name: "정담 순대국",
  address: "서울 강남구 테헤란로 123",
  phone: "02-555-0101",
  position: { lat: 37.5006, lng: 127.0364 },
  walkMinutes: 4,
  reason: "도보 약 4분, 지난주 👍한 국밥, 예산 안",
};

const ORIGIN: DirectionsOrigin = {
  kind: "office",
  name: "사무실",
  position: { lat: 37.4989, lng: 127.0331 },
};

const FULL: PlaceDetailStats = {
  priceReports: [8000, 8500, 9000, 9000, 9000, 9500, 11000, 12000],
  thumbs: { up: 20, down: 3 },
  tags: [
    { label: "혼밥 OK", count: 14 },
    { label: "15분 컷", count: 11 },
    { label: "가성비", count: 9 },
    { label: "양 많음", count: 6 },
    { label: "웨이팅 적음", count: 3 },
  ],
  reviews: [
    {
      id: "r1",
      nickname: "점심탐험가",
      visitMonth: 10,
      thumb: "up",
      text: "국물이 진하고 회전이 빨라서 12시 10분에 가도 금방 앉았어요.",
    },
    {
      id: "r2",
      nickname: "보리차",
      visitMonth: 10,
      thumb: "up",
      text: "순대 양이 넉넉합니다. 다대기는 따로 달라고 하면 줍니다.",
    },
    {
      id: "r3",
      nickname: "구일팔",
      visitMonth: 9,
      thumb: "down",
      text: "점심 피크에는 자리가 좁아서 넷이 가기엔 불편했어요.",
    },
  ],
  reviewTotal: 23,
  waiting: { level: "short", minutesAgo: 12 },
  deal: { title: "점심 세트 1천 원 할인", daysAgo: 3, untilLabel: "11월 5일" },
  myVisit: { dateLabel: "10월 24일", rating: "up" },
};

const SPARSE: PlaceDetailStats = {
  ...EMPTY_PLACE_STATS,
  priceReports: [12000, 14000],
  thumbs: { up: 1, down: 0 },
  tags: [{ label: "조용함", count: 1 }],
  reviews: [
    {
      id: "s1",
      nickname: "쌀국수러버",
      visitMonth: 10,
      thumb: "up",
      text: "국물이 깔끔했어요.",
    },
  ],
  reviewTotal: 1,
};

function liveContent(p: LiveParams): PlaceDetailSheetContent {
  if (p.state === "loading") return { kind: "loading" };
  if (p.state === "error")
    return { kind: "error", onRetry: () => undefined, searchName: PLACE.name };
  const stats =
    p.data === "full" ? FULL : p.data === "sparse" ? SPARSE : EMPTY_PLACE_STATS;
  const place: PlaceDetailPlace = p.nameFail
    ? {
        id: PLACE.id,
        placeUrl: PLACE.placeUrl,
        category: PLACE.category,
        name: null,
        walkMinutes: null,
      }
    : PLACE;
  return {
    kind: "ready",
    place,
    stats,
    meal: "lunch",
    budgetKRW: 10_000,
    source: "rec",
    origin: ORIGIN,
  };
}

function SheetView({ content }: { content: PlaceDetailSheetContent }) {
  const detail = usePlaceDetailSheet();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    detail.open(content);
  }, [detail, content]);
  return (
    <div className="flex flex-col gap-4 pt-10">
      <button
        type="button"
        onClick={() => detail.open(content)}
        onPointerEnter={detail.preload}
        className={buttonClass("secondary")}
      >
        상세
      </button>
      {detail.sheet}
    </div>
  );
}

function InlineView({ content }: { content: PlaceDetailSheetContent }) {
  if (content.kind === "loading") return <PlaceDetailSkeleton />;
  if (content.kind === "error")
    return (
      <PlaceDetailError
        onRetry={content.onRetry}
        searchName={content.searchName}
      />
    );
  return (
    <PlaceDetail
      {...content}
      headingLevel="h1"
      footerClassName="-mx-(--lm-layout-gutter) bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] bg-background px-(--lm-layout-gutter) desktop:mx-0 desktop:px-0"
    />
  );
}

export function PlaceLive({ params }: { params: LiveParams }) {
  const content = liveContent(params);
  return (
    <QueryProvider>
      <AppShell
        tabBar={
          <TabBarView
            activeId={params.view === "inline" ? "map" : "today"}
            preview
          />
        }
        map={<MapPane />}
      >
        <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-4 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-10">
          {params.view === "sheet" ? (
            <SheetView content={content} />
          ) : (
            <InlineView content={content} />
          )}
        </div>
      </AppShell>
      <LazyToaster />
    </QueryProvider>
  );
}
