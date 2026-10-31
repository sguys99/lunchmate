"use client";
// 나 탭에서 식당 상세와 후기 시트를 여는 입구 (T6.13, D-12 안건 4, 11, FB-07).
// - 기록, 장소, 후기 줄의 이름(과 그림)을 누르면 D-10 상세 시트(홈 "상세"와 같은 끝까지 연 시트)를 연다.
//   데스크톱은 같은 시트가 좌 칸을 덮고, 우측 지도에서 그 핀을 강조한다(me-map-store).
// - 시트 코드는 처음 누를 때 받는다(usePlaceDetailSheet). 이름에 손이나 포커스가 닿으면 미리 받는다.
// - 상세 값(이름, 주소, 전화, 좌표)은 카카오 세션 메모리 그대로다. 저장하지 않는다(CLAUDE.md 7장).
// - "후기 수정"(FB-07)은 식후 피드백 시트(D-11, useReviewSheet, edit 모드)를 바로 연다. 시트 코드도 누른 뒤 받는다.
//   가격 힌트는 카테고리 추정가(이름을 모르면 한식 기준), 저장과 삭제 뒤 무효화는 시트가 한다(내 후기, 집계).
// - 상세 집계(stats)는 넘기지 않는다. 넘기지 않아야 상세가 집계, 후기, 내 방문을 직접 불러온다(T6.14).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useReviewSheet } from "@/features/feedback/review-sheet";
import { usePlaceDetailSheet } from "@/features/place/detail";
import { CATEGORY_PRICE_ESTIMATE } from "@/features/place/price-estimate";
import { straightDistanceM } from "@/features/rec/candidates";
import { walkMinutesFromMeters } from "@/lib/format/number";
import type { LatLng } from "@/lib/map/types";
import { getMeal } from "@/lib/time";
import type { MyReview } from "@/features/feedback/my-records";
import { useMeMap } from "./me-map-store";
import type { RowPlace } from "./parts";

export type DetailEntry = {
  openPlace: (place: RowPlace) => void;
  openReviewEditor: (review: MyReview, place: RowPlace) => void;
  /** 상세 시트 미리 받기(이름에 손, 포커스) */
  preload: () => void;
  /** 후기 시트 미리 받기("수정"에 손) */
  preloadReview: () => void;
};

const Ctx = createContext<DetailEntry | null>(null);

export function useDetailEntry(): DetailEntry {
  const v = useContext(Ctx);
  if (!v) throw new Error("DetailEntryProvider가 없습니다");
  return v;
}

export type OfficeAnchor = { readonly name: string; readonly position: LatLng };

export function DetailEntryProvider({
  office,
  budget,
  children,
}: {
  /** 기본 사무실(이름과 사용자가 놓은 핀). 도보 분과 길찾기 출발지 */
  office: OfficeAnchor | null;
  budget: { lunch: number; dinner: number };
  children: ReactNode;
}) {
  const detail = usePlaceDetailSheet();
  const setActive = useMeMap((s) => s.setActive);
  const { open } = detail;

  const openPlace = useCallback(
    (place: RowPlace) => {
      const k = place.kakao;
      const meal = getMeal(new Date());
      const walk =
        office && k?.position
          ? walkMinutesFromMeters(
              straightDistanceM(office.position, k.position),
            )
          : null;
      setActive(place.placeId);
      open({
        kind: "ready",
        place: {
          id: place.placeId,
          placeUrl: place.link,
          // 이름을 모르는 곳은 상세가 "카카오맵에서 보기"를 주 버튼으로 둔다. 그림은 기본(한식)
          category: place.category ?? "hansik",
          name: place.name,
          address: k?.address ?? null,
          phone: k?.phone ?? null,
          position: k?.position ?? null,
          walkMinutes: walk,
        },
        meal,
        budgetKRW: meal === "lunch" ? budget.lunch : budget.dinner,
        // 나 탭 출처가 따로 없어 지도와 같은 값(directions_clicked, 방문 후보 source)
        source: "map",
        origin: office ? { ...office, kind: "office" } : null,
        headingLevel: "h2",
      });
    },
    [office, budget.lunch, budget.dinner, open, setActive],
  );

  const review = useReviewSheet();
  const openSheet = review.open;
  const openReviewEditor = useCallback(
    (r: MyReview, place: RowPlace) => {
      openSheet({
        mode: { kind: "edit", reviewId: r.id, review: r },
        placeId: r.placeId,
        category: place.category,
        name: place.name,
        price: {
          value: CATEGORY_PRICE_ESTIMATE[place.category ?? "hansik"][r.meal],
          kind: "estimate",
        },
        from: "detail",
      });
    },
    [openSheet],
  );

  const value = useMemo(
    () => ({
      openPlace,
      openReviewEditor,
      preload: detail.preload,
      preloadReview: review.preload,
    }),
    [openPlace, openReviewEditor, detail.preload, review.preload],
  );

  return (
    <Ctx value={value}>
      {children}
      {detail.sheet}
      {review.sheet}
    </Ctx>
  );
}
