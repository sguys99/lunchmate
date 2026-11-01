// "투표에 추가"와 "친구랑 정하기" 진입점이 부르는 작은 도우미 (T7.11, T7.12, D-15 안건 9, 16).
// 시트는 openPollCreate로 열리고(host.tsx가 지연 로딩), 진행 중인 내 방이 있으면 시트가 먼저 고르게 한다(create-drawer).
// 이름, 카테고리, 좌표는 세션 메모리 값이다. 서버로는 place_id, place_url만 간다(CLAUDE.md 7장).
import { useTodaySession } from "@/features/rec/today-store";
import { getMeal, type Meal } from "@/lib/time";
import type { CategorySlug } from "@/features/place/categories";
import type { TodayCard } from "@/features/rec/card-model";
import type { LatLng } from "@/lib/map/types";
import { anchorFor } from "./anchor";
import { openPollCreate, type PollKind } from "./intent";

const kakaoUrl = (id: string) => `https://place.map.kakao.com/${id}`;

export function kindOfMeal(meal: Meal): PollKind {
  return meal === "dinner" ? "dinner" : "lunch";
}

export type EntryPlace = {
  placeId: string;
  placeUrl: string;
  name: string | null;
  category: CategorySlug | null;
  position?: LatLng | null;
};

/** 오늘(홈) "친구랑 정하기": 오늘 카드 3장 + 사무실 핀 기준(현위치 금지) */
export function startQuickPoll(input: {
  meal: Meal;
  places: readonly EntryPlace[];
  office: LatLng | null;
  confirm?: boolean;
}): void {
  const anchor = input.office
    ? anchorFor(
        input.office,
        input.places.map((p) => p.position),
      )
    : undefined;
  openPollCreate({
    entry: "home",
    kind: kindOfMeal(input.meal),
    places: input.places.slice(0, 3).map((p) => ({
      placeId: p.placeId,
      placeUrl: p.placeUrl,
      ...(p.name ? { name: p.name } : {}),
      ...(p.category ? { category: p.category } : {}),
    })),
    ...(anchor
      ? {
          anchor: { lat: anchor.lat, lng: anchor.lng, radiusM: anchor.radiusM },
        }
      : {}),
    ...(input.confirm ? { confirm: true } : {}),
  });
}

/**
 * 상세, 지도 "투표에 추가": 그 식당 + 이번 세션 오늘 추천 두 곳(D-15 조합 5). 추천이 없으면 한 곳으로 열고
 * 시트가 한 곳 더 고르게 한다(확인 모드). 기준점은 서버가 방장 기본 사무실 핀으로 정한다.
 */
export function addPlaceToPoll(
  place: EntryPlace,
  entry: "detail" | "map" = "detail",
  meal: Meal = getMeal(new Date()),
  /** 홈 카드 더 보기에서 넣으면 "rec"(PRD 10.2 추천 수락률) */
  source?: "rec",
): void {
  const pins = useTodaySession.getState().map.pins;
  const extra = pins
    .filter((p) => p.id !== place.placeId)
    .slice(0, 2)
    .map((p) => ({ placeId: p.id, placeUrl: kakaoUrl(p.id), name: p.name }));
  const places = [
    {
      placeId: place.placeId,
      placeUrl: place.placeUrl,
      ...(place.name ? { name: place.name } : {}),
      ...(place.category ? { category: place.category } : {}),
    },
    ...extra,
  ];
  openPollCreate({
    entry,
    kind: kindOfMeal(meal),
    places,
    ...(source ? { source } : {}),
    ...(places.length < 2 ? { confirm: true } : {}),
  });
}

/** 오늘(홈) 화면이 넘기는 값. 계산은 여기서 한다(홈 첫 로드 밖) */
export type HomePollInput = {
  meal: Meal;
  cards: readonly TodayCard[];
  offices: readonly {
    id: string;
    isDefault: boolean;
    position: LatLng | null;
  }[];
  choice: { kind: string; id?: string } | null | undefined;
};

const entryOf = (c: TodayCard): EntryPlace => ({
  placeId: c.id,
  placeUrl: c.placeUrl,
  name: c.name,
  category: c.category,
  position: c.position,
});

/** 투표 기준점: 고른 사무실 핀(현위치를 고른 중이면 기본 사무실). 현위치는 쓰지 않는다(T7.6) */
function homeOffice(input: HomePollInput): LatLng | null {
  const c = input.choice;
  const o =
    c?.kind === "office" ? input.offices.find((x) => x.id === c.id) : undefined;
  return (
    (o ?? input.offices.find((x) => x.isDefault) ?? input.offices[0])
      ?.position ?? null
  );
}

/** 홈 "친구랑 정하기"와 로그인 뒤 복귀(confirm) */
export function startHomePoll(input: HomePollInput, confirm = false): void {
  startQuickPoll({
    meal: input.meal,
    places: input.cards.map(entryOf),
    office: homeOffice(input),
    ...(confirm ? { confirm } : {}),
  });
}

/** 홈 카드 더 보기 "투표에 추가": source rec(PRD 10.2 추천 수락률) */
export function addHomeCard(card: TodayCard, meal: Meal): void {
  addPlaceToPoll(entryOf(card), "detail", meal, "rec");
}
