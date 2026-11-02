"use client";
// 홈 한 화면 맞춤 시안 공용 (T9.10 G9 시안, docs/design/g9-comparison-home-compact.md).
// 실제 앱 셸(AppShell + 고정 하단 탭)과 실제 홈 부품(LocationChip, MealToggle, CardArt, NumberGrid, AltTile,
// TodayActionBar, 상태 카드)을 목업 데이터로 다시 조합한다. 세 시안이 같은 머리와 같은 데이터를 써서 카드 구조만 비교된다.
// 쿼리: ?name=long|short(큰 카드 가게 이름, 기본 long), ?state=loading|empty|error|offline
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { EmojiText } from "@/components/a11y/emoji-text";
import { AppShell, TabBarView } from "@/components/app-shell";
import { LoadingRegion, SkeletonLine } from "@/components/states/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { homeCompactLabCopy } from "@/copy/design-lab-home-compact";
import type { DesignState } from "@/features/design-lab/mock/design-state";
import type { OfficeOption } from "@/features/rec/base-location";
import type { TodayCard } from "@/features/rec/card-model";
import type { JustPick } from "@/features/rec/just-pick";
import {
  LocationChip,
  MealToggle,
  dateLine,
} from "@/features/rec/today-header";
import { ActionBarSkeleton } from "@/features/rec/today-cards";
import {
  EmptyDeck,
  KakaoErrorCard,
  OfflineCard,
} from "@/features/rec/today-states";
import type { RecoPick } from "@/lib/reco/types";
import type { Meal } from "@/lib/time";
import { cn } from "@/lib/utils";

const copy = homeCopy.today;

/* ---------- 목업 ---------- */

const NAMES = {
  long: "이광진식겁라면 떡볶이 앤 김밥 도곡점 본점",
  short: "소담",
} as const;

export type NameMode = keyof typeof NAMES;

function card(
  id: string,
  name: string,
  category: TodayCard["category"],
  reason: string,
  walk: string,
  price: [string, string],
  thumbs: string | null,
): TodayCard {
  return {
    id,
    name,
    category,
    placeUrl: `https://place.map.kakao.com/${id}`,
    position: { lat: 37.4875, lng: 127.0465 },
    reason,
    walk: { value: walk, unit: copy.numbers.walkUnit },
    price: {
      value: price[0],
      unit: price[1],
      estimate: true,
      priceKRW: 9000,
    },
    thumbs: { value: thumbs, unit: copy.numbers.thumbsUnit },
    badges: [],
    score: 1,
    pick: {} as RecoPick,
  };
}

export function mockCards(mode: NameMode): TodayCard[] {
  return [
    card(
      "9100001",
      NAMES[mode],
      "bunsik",
      "새로 찾은 곳, 이번 주 아직 안 먹은 분식",
      "1",
      ["8천", "원대"],
      null,
    ),
    card(
      "9100002",
      "파리바게뜨 양재역점",
      "cafe",
      "가볍게",
      "1",
      ["7천", "원대"],
      null,
    ),
    card(
      "9100003",
      "곰작골나주곰탕",
      "gukbap",
      "국물",
      "2",
      ["1.1만", "원대"],
      "86",
    ),
  ];
}

export const MOCK_WHY = [
  "아직 안 가 본 곳이라 새로 골랐습니다.",
  "이번 주에 분식을 먹은 기록이 없습니다.",
];

const OFFICE: OfficeOption = {
  id: "office-1",
  name: "회사",
  isDefault: true,
  position: { lat: 37.4875, lng: 127.0465 },
};

/** 시안에서는 연출을 돌리지 않는다(누르면 아무 일 없음) */
export const IDLE_PICK: JustPick = {
  run: null,
  cursor: null,
  landed: false,
  rolling: false,
  begin: () => {},
  skip: () => {},
  again: () => {},
  close: () => {},
  prefetch: () => {},
};

/** 2026-11-02 18:30 KST(저녁) 고정 */
export const MOCK_NOW = new Date("2026-11-02T09:30:00.000Z");

/* ---------- 틀 ---------- */

/**
 * 실제 앱과 같은 셸: 모바일 고정 하단 탭 + 빈 자리, 데스크톱 2단. tabBarHeight를 주면 탭 높이 토큰만 덮는다(시안 C).
 */
export function CompactShell({
  children,
  tabBarHeight,
}: {
  children: ReactNode;
  tabBarHeight?: string;
}) {
  const style = tabBarHeight
    ? ({ "--lm-layout-tab-bar-height": tabBarHeight } as CSSProperties)
    : undefined;
  return (
    <div style={style} className="flex flex-1 flex-col">
      <AppShell tabBar={<TabBarView activeId="today" preview dock />}>
        {children}
      </AppShell>
    </div>
  );
}

/** 리스트 칸 본문. 실제 홈과 같은 폭, 위 여백만 줄였다(20 → 12) */
export function CompactColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-3 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8">
      {children}
    </div>
  );
}

/**
 * 머리 두 줄: 기준 위치 칩 + 끼니 / 제목(heading 크기) + 날짜. 지금 홈은 세 줄(칩, 날짜, 30px 제목)로 약 150px이다.
 */
export function CompactHeader() {
  const [meal, setMeal] = useState<Meal>("dinner");
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <LocationChip
          base={{ kind: "office", office: OFFICE, center: OFFICE.position }}
          offices={[OFFICE]}
          signedIn
          onChoose={() => {}}
        />
        <MealToggle meal={meal} onChange={setMeal} className="-mr-2 shrink-0" />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="type-heading">{copy.title}</h1>
        <p className="type-caption text-muted-foreground">
          {dateLine(MOCK_NOW)} {copy.meal[meal]}
        </p>
      </div>
    </header>
  );
}

/* ---------- 카드 부품 ---------- */

export const textButton = cn(
  "inline-flex h-6 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground",
  hitArea44,
  focusRing,
);

/** "상세" 글자 버튼 + 더 보기 아이콘(시안에서는 열지 않음) */
export function DetailAndMore({ name }: { name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <button
        type="button"
        aria-label={copy.actions.detailOf(name)}
        className={textButton}
      >
        {copy.actions.detail}
      </button>
      <button
        type="button"
        aria-label={homeCompactLabCopy.more(name)}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground",
          hitArea44,
          focusRing,
        )}
      >
        <MoreHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/**
 * 이유 한 줄이 곧 "왜 추천했나요?" 펼치기다(지금 홈의 별도 줄을 없앤다). 접근성 이름은 이유 문장 + 펼침 상태.
 */
export function ReasonToggle({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "-mx-1 flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left",
          focusRing,
        )}
      >
        <span className="line-clamp-1 type-body text-foreground">
          <EmojiText text={reason} />
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
        <span className="sr-only">, {copy.actions.why}</span>
      </button>
      {open ? (
        <ul
          id={id}
          className="lm-today-why mt-1 mb-1 flex flex-col gap-1.5 border-l border-border pl-3"
        >
          {MOCK_WHY.map((line) => (
            <li
              key={line}
              className="type-body-sm break-keep text-muted-foreground"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <div id={id} hidden />
      )}
    </div>
  );
}

/** "또는 이 두 곳" 제목 줄 오른쪽에 같이 정하기 두 진입점(지금 홈의 별도 줄을 없앤다) */
export function AltHeading({ id }: { id: string }) {
  const link = cn(
    "inline-flex h-6 items-center rounded-sm type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
    hitArea44,
    focusRing,
  );
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="type-caption text-muted-foreground">
        {copy.single.alternatives}
      </h2>
      <nav aria-label={copy.actions.entriesLabel} className="flex gap-4">
        <button type="button" className={link}>
          {homeCopy.actions.pollWithFriends}
        </button>
        <button type="button" className={link}>
          {copy.actions.party}
        </button>
      </nav>
    </div>
  );
}

/* ---------- 4상태 ---------- */

/** 로딩, 빈, 오류, 오프라인은 실제 홈 상태 카드를 그대로 쓴다. 로딩은 시안마다 모양이 달라 skeleton을 받는다 */
export function CompactStates({
  state,
  skeleton,
  dock = true,
}: {
  state: Exclude<DesignState, "ready">;
  skeleton: ReactNode;
  /** 하단 행동 줄 자리(시안 C는 없음) */
  dock?: boolean;
}) {
  if (state === "loading")
    return (
      <>
        <LoadingRegion
          label={homeCopy.states.loading.label}
          className="mt-3 flex flex-col"
        >
          {skeleton}
        </LoadingRegion>
        {dock ? <ActionBarSkeleton /> : null}
      </>
    );
  if (state === "offline") return <OfflineCard />;
  if (state === "error")
    return <KakaoErrorCard center={OFFICE.position} onRetry={() => {}} />;
  return (
    <EmptyDeck
      shortage={{ kind: "empty", count: 0, widenTo: 15, overBudget: 0 }}
      walk={10}
      onWiden={() => {}}
      onRelaxBudget={() => {}}
      signedIn
    />
  );
}

export { Skeleton, SkeletonLine };
