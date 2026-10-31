"use client";
// 오늘(홈) "상세" 바텀시트 (T5.20 REC-08, D-10 안건 1). today-screen이 "상세"를 처음 누를 때 React.lazy로 받는다.
// 시트 진입점(place-detail-sheet)과 상세 문구, 빈 집계(EMPTY_PLACE_STATS)가 홈 첫 로드에 들어가지 않게 한 겹 감싼다.
// 시트 본체(Drawer)는 PlaceDetailSheet가 다시 지연 로딩한다. "상세" 버튼에 손이나 포커스가 닿으면 preload()로 미리 받는다.
// 카드 값(이름, 주소, 전화, 좌표)은 세션 메모리(카카오 검색 결과) 그대로다. 저장하지 않는다(CLAUDE.md 7장).
import { useMemo } from "react";
import { EMPTY_PLACE_STATS } from "@/features/place/detail-model";
import {
  PlaceDetailSheet,
  preloadPlaceDetailSheet,
  type PlaceDetailSheetContent,
} from "@/features/place/detail/place-detail-sheet";
import { walkMinutesFromMeters } from "@/lib/format/number";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import type { DirectionsOrigin } from "@/lib/naver/directions";
import type { Meal } from "@/lib/time";
import type { TodayCard } from "./card-model";

export type TodayDetailProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: TodayCard;
  /** 같은 곳의 카카오 검색 값(주소, 전화). 묶음이 바뀌어 없으면 빈 값 */
  place: KakaoRestaurant | undefined;
  meal: Meal;
  budgetKRW: number;
  origin: DirectionsOrigin | null;
};

export function detailContent(
  p: Omit<TodayDetailProps, "open" | "onOpenChange">,
): PlaceDetailSheetContent {
  const { card, place } = p;
  return {
    kind: "ready",
    place: {
      id: card.id,
      placeUrl: card.placeUrl,
      category: card.category,
      name: card.name,
      address: place?.address ?? null,
      phone: place?.phone ?? null,
      position: card.position,
      walkMinutes: walkMinutesFromMeters(card.pick.candidate.distanceM),
      reason: card.pick.reason,
    },
    stats: EMPTY_PLACE_STATS,
    meal: p.meal,
    budgetKRW: p.budgetKRW,
    source: "rec",
    origin: p.origin,
    headingLevel: "h2",
  };
}

export function preload(): void {
  preloadPlaceDetailSheet();
}

export default function TodayDetail({
  open,
  onOpenChange,
  card,
  place,
  meal,
  budgetKRW,
  origin,
}: TodayDetailProps) {
  const content = useMemo(
    () => detailContent({ card, place, meal, budgetKRW, origin }),
    [card, place, meal, budgetKRW, origin],
  );
  return (
    <PlaceDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      content={content}
      fallbackUrl={card.placeUrl}
    />
  );
}
