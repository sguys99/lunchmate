"use client";
// 오늘(홈) 화면 (T5.15~T5.25, G3 D1, DESIGN.md 5장 "오늘(홈) 화면", PRD REC-01~12, 12장).
//
// 흐름: 서버가 넘긴 사용자 값(사무실 핀, 예산, 도보 분, 못 먹는 음식, 다시 안 갈 곳) → 기준 위치 → 카카오 FD6 반경 검색
//   (세션 메모리, src/lib/kakao/queries.ts) → 후보 변환(candidates.ts) → 추천 엔진(브라우저, 시드 고정) → 카드.
// 구성: 머리(기준 위치 칩, 끼니 토글, 날짜, 제목) → [어제 피드백 띠 자리, T6.8] → 큰 카드 → 대안 두 장 → 하단 고정 행동 줄.
// 상태: 로딩(같은 자리 스켈레톤), 0곳(넓히기, 예산 풀기), 1~2곳(있는 만큼 + 안내), 카카오 오류(다시 시도 + 네이버 지도),
//   오프라인(받은 묶음이 있으면 그대로, 없으면 안내), 위치 없음(로그인 유도 또는 사무실 추가), 저장 값 읽기 실패.
// 모션: CSS만(today.css). 첫 화면 페이드 하나, 다시 뽑기 셔플, 대안 교환. 축소 모드면 바로 바꾼다.
// 데이터 규칙: 카카오 값과 현위치 좌표는 메모리(TanStack Query, today-store)에만 둔다. 서버, 분석 이벤트로 보내지 않는다.
// 카드 행동(T5.20, REC-08): 길찾기는 하단 줄과 그냥 골라줘 결과(상세와 같은 흐름, 방문 후보 저장), "상세"는 바텀시트,
//   즐겨찾기, 다시 안 갈래요, 투표에 추가(플래그)는 큰 카드 "상세" 옆 더 보기. 모두 누른 뒤에 받는 묶음이다(홈 첫 로드 예산).
// 다시 안 갈래요: 그 카드만 빼고(세션 다시 안 갈 곳 + 하드 필터) 같은 자리를 다음 후보로 채운다(refillDeck). 되돌리기는 원래 묶음.
// 분석 이벤트(T5.39): recommendation_shown(같은 묶음 한 번), recommendation_reshuffled, card_swiped(대안을 큰 카드로),
//   just_pick_clicked. directions_clicked와 favorite_added는 상세와 같은 흐름이 보낸다.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { focusRing } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import {
  notifyLoginSoon,
  useLoginOpen,
} from "@/features/auth/login-prompt/gate";
import { currentPathForNext } from "@/features/auth/login-prompt/triggers";
import { locateOnce } from "@/features/onboarding/geolocation";
import { isCategorySlug } from "@/features/place/categories";
import { searchRadiusFromWalkMinutes } from "@/lib/format/number";
import {
  prefetchKakaoSearch,
  restaurantsInRadiusQuery,
} from "@/lib/kakao/queries";
import { DEFAULT_MAP_CENTER } from "@/lib/map/constants";
import type { DirectionsOrigin } from "@/lib/naver/directions";
import { useOnlineStatus } from "@/lib/network";
import type { RecoHistory, RecoSettings } from "@/lib/reco/types";
import { getMeal, type Meal } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  afterLocate,
  resolveBase,
  sortOffices,
  type BaseChoice,
  type HereState,
} from "./base-location";
import { preloadArt } from "./card-bits";
import type { TodayCard } from "./card-model";
import { CardMore } from "./card-more";
import {
  cardSwiped,
  firstShow,
  justPickClicked,
  recommendationReshuffled,
  recommendationShown,
  todayEvent,
} from "./events";
import { deckKey, JustPickLayer, useJustPick } from "./just-pick";
import type { TodayData } from "./load-today";
import {
  ActionBarSkeleton,
  AltTile,
  spotOf,
  TodayActionBar,
  TodayHero,
  TodayPicksSkeleton,
} from "./today-cards";
import { noticeText, TodayHeader } from "./today-header";
import { ShortNote } from "./today-states-light";
import { RELAXED_BUDGET_KRW, useTodaySession } from "./today-store";
import { preloadDirections, useCardDirections } from "./use-card-directions";
import { useReducedMotion } from "./use-reduced-motion";
import "./today.css";

const copy = homeCopy.today;
/** 퇴장 애니메이션 끝 이벤트가 오지 않을 때(탭 숨김 등) 바꿔 끼우는 안전 시간. exit fast(180ms)보다 넉넉하게 */
const EXIT_FALLBACK_MS = 400;

type Shuffle = "idle" | "leaving" | "entering";
type Engine = typeof import("./engine");
const loadEngine = () => import("./engine");
/** 빈 상태, 오류, 오프라인, 위치 없음 카드. 처음 필요할 때 받는다(공통 상태 컴포넌트와 Base UI 버튼이 홈 첫 로드 밖) */
const states = () => import("./today-states");
const EmptyDeck = lazy(() => states().then((m) => ({ default: m.EmptyDeck })));
const KakaoErrorCard = lazy(() =>
  states().then((m) => ({ default: m.KakaoErrorCard })),
);
const LoadFailedCard = lazy(() =>
  states().then((m) => ({ default: m.LoadFailedCard })),
);
const NeedLocationCard = lazy(() =>
  states().then((m) => ({ default: m.NeedLocationCard })),
);
const OfflineCard = lazy(() =>
  states().then((m) => ({ default: m.OfflineCard })),
);
/** 로그인 유도 시트(T4.13). 감싸개와 로그인 문구까지 누른 뒤에 받는다(홈 첫 로드 예산) */
const LoginPromptSheet = lazy(() =>
  import("@/features/auth/login-prompt/use-login-prompt").then((m) => ({
    default: m.LoginPromptSheet,
  })),
);
/** "상세" 바텀시트(T5.20). 처음 누를 때 받는다(시트 진입점, 상세 문구, 빈 집계가 홈 첫 로드 밖) */
const loadDetail = () => import("./today-detail");
const TodayDetail = lazy(loadDetail);
const preloadDetail = () => {
  void loadDetail().then(
    (m) => m.preload(),
    () => undefined,
  );
};
type Swap = { phase: "out"; slot: number } | { phase: "in" } | null;

export type TodayScreenProps = {
  data: TodayData;
  /** 친구랑 정하기, 회식 모드 진입점(REC-10, flags.pollEntry). 서버가 판정해 넘긴다 */
  showEntries: boolean;
  /** 투표에 추가(7단계, flags.pollEntry). 없으면 더 보기에 보이지 않는다 */
  onAddToPoll?: (card: TodayCard) => void;
};

/** 묶음 안 번호 순서. 묶음이 바뀌어 길이가 달라도 0..n-1의 순열이 되게 맞춘다 */
function normalizeOrder(order: readonly number[], n: number): number[] {
  const kept = order.filter((i) => i < n);
  for (let i = 0; i < n; i++) if (!kept.includes(i)) kept.push(i);
  return kept.slice(0, n);
}

export function TodayScreen({
  data,
  showEntries,
  onAddToPoll,
}: TodayScreenProps) {
  const router = useRouter();
  const session = useTodaySession();
  const { patch, redraw, setMap } = session;
  const reduced = useReducedMotion();
  const online = useOnlineStatus();
  const [login, setLogin] = useState<{ open: boolean; next: string } | null>(
    null,
  );
  // 로그인이 닫힌 환경(프로덕션, flags.auth)에서는 시트 대신 "곧 열립니다" 토스트(gate.tsx)
  const loginOpen = useLoginOpen();
  const promptSave = () => {
    if (!loginOpen) {
      notifyLoginSoon();
      return;
    }
    setLogin({ open: true, next: currentPathForNext(window.location) });
  };
  const [announcement, setAnnouncement] = useState("");
  const [shuffle, setShuffle] = useState<Shuffle>("idle");
  const [swap, setSwap] = useState<Swap>(null);
  const pending = useRef<(() => void) | null>(null);
  const fallback = useRef<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  /* ---------- 시각과 끼니 (T5.15, REC-01) ---------- */

  const [now, setNow] = useState(() => new Date(data.nowIso));
  const lastAuto = useRef(getMeal(new Date(data.nowIso)));
  // 1분마다 시각을 새로 보고, 15:00(KST)을 넘기면 저녁으로 자동 전환한다(수동으로 고른 적이 없을 때)
  useEffect(() => {
    const t = window.setInterval(() => {
      const next = new Date();
      setNow(next);
      const m = getMeal(next);
      if (m === lastAuto.current) return;
      lastAuto.current = m;
      const store = useTodaySession.getState();
      if (store.mealOverride !== null) return;
      store.redraw();
      setAnnouncement(copy.meal.changed(copy.meal[m]));
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);
  const autoMeal = getMeal(now);
  const meal: Meal = session.mealOverride ?? autoMeal;

  /* ---------- 기준 위치 (T5.16, REC-02) ---------- */

  const offices = useMemo(() => sortOffices(data.offices), [data.offices]);
  const base = resolveBase(session.choice, offices, session.here);
  const center = base.center;
  const walk = session.walkOverride ?? data.prefs.walk;
  const radiusM = searchRadiusFromWalkMinutes(walk);

  const locate = useCallback(async () => {
    patch({ here: { status: "locating" } });
    const r = await locateOnce();
    const here: HereState = r.ok
      ? { status: "ok", position: { lat: r.target.lat, lng: r.target.lng } }
      : { status: r.reason };
    const next = afterLocate(here, data.offices);
    patch({ here, choice: next.choice, notice: next.notice, order: [0, 1, 2] });
  }, [patch, data.offices]);

  // 카카오 검색 모듈과 SDK를 측위와 나란히 미리 받는다(T5.41, AC-REC-4). 검색 자체는 기준점이 정해진 뒤 쿼리가 한다
  useEffect(() => {
    prefetchKakaoSearch();
  }, []);

  // 처음 현위치가 기준이면(사무실 없음) 한 번 찾는다
  const needsFirstLocate = base.kind === "here" && base.state.status === "idle";
  useEffect(() => {
    if (needsFirstLocate) void locate();
  }, [needsFirstLocate, locate]);

  // 첫 시드(묶음 재현용). 세션에 이미 있으면 그대로 쓴다(탭을 오가도 같은 묶음)
  const seedMissing = session.draw.seed === null;
  useEffect(() => {
    if (seedMissing) redraw();
  }, [seedMissing, redraw]);

  /* ---------- 후보와 묶음 (REC-03, REC-05) ---------- */

  // 계산 묶음은 카카오 검색과 나란히 받는다(첫 로드 번들 밖). 받지 못하면(오프라인 청크 실패) 오류 안내와 다시 시도
  const [engine, setEngine] = useState<Engine | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [engineAttempt, setEngineAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    preloadArt();
    loadEngine().then(
      (m) => {
        if (alive) setEngine(m);
      },
      () => {
        if (alive) setEngineFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [engineAttempt]);

  const query = useQuery({
    ...restaurantsInRadiusQuery(center ?? DEFAULT_MAP_CENTER, radiusM),
    enabled: center !== null && online && !data.loadFailed,
  });
  const places = query.data?.places;

  const placesById = useMemo(
    () => new Map((places ?? []).map((p) => [p.id, p])),
    [places],
  );
  const candidates = useMemo(
    () =>
      engine && places && center ? engine.toCandidates(places, center) : null,
    [engine, places, center],
  );
  const budgetKRW = session.budgetRelaxed
    ? RELAXED_BUDGET_KRW
    : meal === "lunch"
      ? data.prefs.lunch
      : data.prefs.dinner;
  const settings = useMemo<RecoSettings>(
    () => ({
      meal,
      budgetKRW,
      walkMinutes: walk,
      avoid: data.avoid,
      craving: {
        categories: data.craving.categories.filter(isCategorySlug),
        until: data.craving.until ? new Date(data.craving.until) : null,
      },
    }),
    [meal, budgetKRW, walk, data.avoid, data.craving],
  );
  const sessionBlocked = session.blocked;
  const history = useMemo<RecoHistory>(
    // 방문, 피드백 기록은 6단계(콜드 스타트). 다시 안 갈 곳(서버 목록 + 이번 세션에 누른 곳)만 하드 필터에 넣는다
    () => ({
      visits: [],
      blocked: new Set([...data.blocked, ...sessionBlocked]),
    }),
    [data.blocked, sessionBlocked],
  );
  const { seed, at, seen, fallback: fallbackSeen } = session.draw;
  // 다시 안 갈래요로 한 자리를 비운 묶음. 같은 시드인 동안만 쓴다(다시 뽑기, 끼니, 기준 위치를 바꾸면 새 묶음)
  const held =
    session.held && session.held.seed === seed ? session.held.slots : null;
  const deck = useMemo(() => {
    if (!engine || !candidates || seed === null) return null;
    const input = { candidates, settings, history, seen, now: new Date(at) };
    return held
      ? engine.refillDeck(input, seed, held)
      : engine.drawDeck(input, seed, fallbackSeen);
  }, [
    engine,
    candidates,
    settings,
    history,
    seen,
    at,
    seed,
    fallbackSeen,
    held,
  ]);
  const drawnAt = useMemo(() => new Date(at), [at]);
  const cards = useMemo(
    () =>
      engine && deck
        ? engine.toCards(deck.result.picks, placesById, meal, drawnAt)
        : [],
    [engine, deck, placesById, meal, drawnAt],
  );
  const order = normalizeOrder(session.order, cards.length);
  const heroIndex = order[0] ?? 0;
  const hero = cards[heroIndex];
  const key = deckKey(cards);
  const shortage = engine && deck ? engine.shortageOf(deck.result, walk) : null;

  /* ---------- 지도 동기화(데스크톱 우측, @map 슬롯) ---------- */

  const activeId = hero?.id ?? null;
  useEffect(() => {
    setMap({
      base: center ? { kind: base.kind, center, radiusM } : null,
      pins: cards.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
      })),
      activeId,
    });
    // cards는 key가 같으면 같은 곳들이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMap, center, base.kind, radiusM, key, activeId]);

  /* ---------- 분석 이벤트 (T5.39, PRD 10.2) ---------- */

  const round = session.draw.round;
  useEffect(() => {
    if (!deck || cards.length === 0) return;
    // 같은 묶음은 탭을 오가 다시 그려져도 한 번만
    if (!firstShow(`${round}:${key}`)) return;
    todayEvent(
      recommendationShown({
        meal,
        baseKind: base.kind,
        algoVersion: deck.result.algoVersion,
        placeIds: cards.map((c) => c.id),
      }),
    );
    // 같은 묶음에서는 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, key]);

  /* ---------- 카드 행동 (T5.20, REC-08) ---------- */

  const origin = useMemo<DirectionsOrigin | null>(() => {
    if (base.kind === "office") {
      return { kind: "office", name: base.office.name, position: base.center };
    }
    return base.center
      ? {
          kind: "current",
          name: copy.location.options.here,
          position: base.center,
        }
      : null;
    // base는 렌더마다 새 객체다. 기준 위치가 같으면 같은 출발지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.kind, base.kind === "office" ? base.office.name : null, center]);
  const directions = useCardDirections({
    meal,
    origin,
    signedIn: data.signedIn,
    online,
  });
  // 카드가 보이면 길찾기 흐름을 받아 둔다(누르는 순간 탭 안에서 동기로 앱, 새 탭을 열게)
  const hasCards = cards.length > 0;
  useEffect(() => {
    if (hasCards) void preloadDirections().catch(() => undefined);
  }, [hasCards]);

  const [detail, setDetail] = useState<{
    open: boolean;
    card: TodayCard;
  } | null>(null);
  const openDetail = (card: TodayCard) => setDetail({ open: true, card });

  // 다시 안 갈래요: 뺀 곳의 원래 묶음(되돌리기용). 장소 id만 담긴 메모리 값
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  const beforeBlock = useRef(
    new Map<string, { seed: number; slots: readonly string[] }>(),
  );
  // 두 함수는 스토어(getState)와 ref만 읽어, 카드가 바뀐 뒤 토스트의 되돌리기에서 불러도 맞게 동작한다
  function blockCard(placeId: string) {
    const s = useTodaySession.getState();
    const ids = cardsRef.current.map((c) => c.id);
    const blocked = new Set([...s.blocked, placeId]);
    if (s.draw.seed !== null && ids.includes(placeId)) {
      beforeBlock.current.set(placeId, { seed: s.draw.seed, slots: ids });
      s.patch({
        blocked,
        held: {
          seed: s.draw.seed,
          slots: ids.map((id) => (id === placeId ? null : id)),
        },
      });
    } else {
      s.patch({ blocked });
    }
    setDetail(null);
    setAnnouncement(copy.blockedReplaced);
    // 누른 메뉴와 큰 카드가 바뀌므로 포커스를 새 큰 카드로
    requestAnimationFrame(() =>
      heroRef.current?.focus({ preventScroll: true }),
    );
  }
  function restoreCard(placeId: string) {
    const s = useTodaySession.getState();
    const blocked = new Set(s.blocked);
    blocked.delete(placeId);
    const before = beforeBlock.current.get(placeId);
    beforeBlock.current.delete(placeId);
    s.patch(
      before && before.seed === s.draw.seed
        ? { blocked, held: { seed: before.seed, slots: before.slots } }
        : { blocked },
    );
    setAnnouncement(copy.blockRestored);
  }

  /* ---------- 셔플 (T5.18, REC-05) ---------- */

  const finishShuffle = useCallback(() => {
    if (fallback.current !== null) window.clearTimeout(fallback.current);
    fallback.current = null;
    const apply = pending.current;
    pending.current = null;
    if (!apply) return;
    apply();
    setShuffle("entering");
  }, []);

  useEffect(
    () => () => {
      if (fallback.current !== null) window.clearTimeout(fallback.current);
    },
    [],
  );

  /** 지금 묶음을 흐리게 내보낸 뒤 apply로 바꾸고 새 블록을 순서대로 보인다. 축소 모드면 바로 */
  function shuffleThen(apply: () => void, message: string) {
    setAnnouncement(message);
    if (reduced || cards.length === 0 || shuffle === "leaving") {
      apply();
      return;
    }
    pending.current = apply;
    setShuffle("leaving");
    fallback.current = window.setTimeout(finishShuffle, EXIT_FALLBACK_MS);
  }

  function onDeckAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (shuffle === "leaving" && e.animationName === "lm-today-fade-out") {
      finishShuffle();
    }
  }

  function reroll() {
    const count = session.rerolls + 1;
    shuffleThen(() => {
      redraw(cards.map((c) => c.id));
      patch({ rerolls: count });
      todayEvent(recommendationReshuffled(count));
    }, copy.rerolled);
  }

  function changeMeal(next: Meal) {
    if (next === meal) return;
    shuffleThen(() => {
      patch({ mealOverride: next });
      redraw();
    }, copy.meal.changed(copy.meal[next]));
  }

  function chooseBase(choice: BaseChoice) {
    setShuffle("idle");
    if (choice.kind === "here") {
      patch({ choice, notice: null, order: [0, 1, 2] });
      void locate();
      return;
    }
    if (base.kind === "office" && base.office.id === choice.id) return;
    patch({ choice, notice: null, order: [0, 1, 2] });
    redraw();
    const office = offices.find((o) => o.id === choice.id);
    if (office) setAnnouncement(copy.location.changed(office.name));
  }

  function widen(to: number) {
    setShuffle("idle");
    patch({ walkOverride: to, order: [0, 1, 2] });
    setAnnouncement(copy.shortage.widened(to));
  }

  function relaxBudget() {
    patch({ budgetRelaxed: true, order: [0, 1, 2] });
    setAnnouncement(copy.shortage.budgetRelaxed);
  }

  /* ---------- 대안 교환 (REC-04) ---------- */

  function applySwap(slot: number) {
    const next = [...order];
    const a = next[0];
    const b = next[slot];
    if (a === undefined || b === undefined) return;
    next[0] = b;
    next[slot] = a;
    patch({ order: next });
    return cards[b];
  }

  function promote(slot: number) {
    if (pick.rolling || swap) return;
    const name = cards[order[slot] ?? -1]?.name ?? "";
    // D1에는 넘기기가 없다. 대안을 큰 카드로 올리는 것이 "다음 카드 보기"에 해당한다(position은 묶음 안 순서)
    todayEvent(cardSwiped(order[slot] ?? slot));
    if (reduced) {
      applySwap(slot);
      setAnnouncement(copy.single.swapped(name));
      // 누른 대안 버튼이 사라지므로 포커스를 새 큰 카드로 옮긴다(T5.25)
      requestAnimationFrame(() => heroRef.current?.focus());
      return;
    }
    swapDone.current = false;
    setSwap({ phase: "out", slot });
    swapTimer.current = window.setTimeout(
      () => finishSwap(slot, name),
      EXIT_FALLBACK_MS,
    );
  }

  const swapDone = useRef(false);
  const swapTimer = useRef<number | null>(null);
  function finishSwap(slot: number, name: string) {
    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    swapTimer.current = null;
    if (swapDone.current) return;
    swapDone.current = true;
    applySwap(slot);
    setSwap({ phase: "in" });
    setAnnouncement(copy.single.swapped(name));
    requestAnimationFrame(() =>
      heroRef.current?.focus({ preventScroll: true }),
    );
  }

  function onHeroAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (swap?.phase === "out" && e.animationName === "lm-today-fade-out") {
      const name = cards[order[swap.slot] ?? -1]?.name ?? "";
      finishSwap(swap.slot, name);
    } else if (swap?.phase === "in") {
      setSwap(null);
    }
  }
  // 교환 등장 끝 이벤트가 오지 않을 때를 대비
  useEffect(() => {
    if (swap?.phase !== "in") return;
    const t = window.setTimeout(() => setSwap(null), 600);
    return () => window.clearTimeout(t);
  }, [swap]);

  /* ---------- 그냥 골라줘 (T5.22, REC-12) ---------- */

  const pick = useJustPick({
    cards,
    reduced,
    onPicked: (card) => todayEvent(justPickClicked(meal, card.id)),
    onSettle: (index) => {
      // 결과가 대안이면 큰 카드로 올려 둔다(닫은 뒤 바로 그 카드, 지도 핀도 따라감)
      const slot = order.indexOf(index);
      if (slot > 0) applySwap(slot);
    },
  });

  /* ---------- 그리기 ---------- */

  const header = (
    <TodayHeader
      meal={meal}
      now={now}
      onMeal={changeMeal}
      base={base}
      offices={offices}
      signedIn={data.signedIn}
      onChoose={chooseBase}
      onSaveOffice={loginOpen ? promptSave : undefined}
      notice={noticeText(session.notice)}
    />
  );
  // 어제 피드백 띠(FB-01)는 T6.8에서 머리 바로 아래에 둔다. 오프라인에서는 숨긴다.

  const locating =
    base.kind === "here" &&
    (base.state.status === "locating" || base.state.status === "idle");
  const needLocation =
    base.kind === "here" &&
    (base.state.status === "denied" || base.state.status === "unavailable")
      ? base.state.status
      : null;

  let body: ReactNode;
  /** 카드나 스켈레톤이 하단 행동 줄을 쓰는가(아래 여백을 줄이 맡는다) */
  let docked = false;
  if (data.loadFailed) {
    body = <LoadFailedCard onRetry={() => router.refresh()} />;
  } else if (needLocation) {
    body = (
      <NeedLocationCard
        reason={needLocation}
        signedIn={data.signedIn}
        onRetry={() => void locate()}
        onSaveOffice={loginOpen ? promptSave : undefined}
      />
    );
  } else if (!online && !places) {
    body = <OfflineCard />;
  } else if (engineFailed) {
    body = (
      <LoadFailedCard
        onRetry={() => {
          setEngineFailed(false);
          setEngineAttempt((n) => n + 1);
        }}
      />
    );
  } else if (query.isError) {
    body = (
      <KakaoErrorCard
        center={base.kind === "office" ? base.center : null}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (locating || !deck || !shortage) {
    docked = true;
    body = (
      <>
        <TodayPicksSkeleton
          label={
            locating ? copy.location.locating : homeCopy.states.loading.label
          }
          className="mt-5 desktop:mt-4"
        />
        <ActionBarSkeleton />
      </>
    );
  } else if (shortage.kind === "empty" || !hero) {
    body = (
      <EmptyDeck
        shortage={
          shortage.kind === "empty"
            ? shortage
            : { kind: "empty", count: 0, widenTo: null, overBudget: 0 }
        }
        walk={walk}
        onWiden={widen}
        onRelaxBudget={relaxBudget}
        signedIn={data.signedIn}
      />
    );
  } else {
    docked = true;
    const alts = order.slice(1);
    const phase =
      shuffle === "leaving"
        ? "leaving"
        : shuffle === "entering"
          ? "entering"
          : "first";
    body = (
      <>
        <div
          key={`${session.draw.round}:${key}`}
          data-phase={phase}
          onAnimationEnd={onDeckAnimationEnd}
          className="lm-today-deck mt-5 flex flex-col pb-6 desktop:mt-4"
        >
          <div
            data-swap={swap?.phase}
            onAnimationEnd={onHeroAnimationEnd}
            className="lm-today-hero"
          >
            <TodayHero
              key={hero.id}
              card={hero}
              heroRef={heroRef}
              spot={spotOf(pick, heroIndex)}
              order={copy.single.order(1, cards.length)}
              why={engine?.whyLines(hero.pick, drawnAt) ?? []}
              onDetail={openDetail}
              onDetailIntent={preloadDetail}
              more={
                <CardMore
                  card={hero}
                  online={online}
                  signedIn={data.signedIn}
                  onBlocked={blockCard}
                  onRestored={restoreCard}
                  onLogin={promptSave}
                  onAddToPoll={onAddToPoll}
                />
              }
            />
          </div>

          {alts.length > 0 ? (
            <section aria-labelledby="today-alt" className="mt-5 desktop:mt-4">
              <h2 id="today-alt" className="type-caption text-muted-foreground">
                {alts.length > 1
                  ? copy.single.alternatives
                  : copy.single.alternativesOne}
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {alts.map((idx, i) => {
                  const card = cards[idx];
                  if (!card) return null;
                  return (
                    <li
                      key={card.id}
                      data-reveal
                      style={{ "--reveal": 5 + i } as CSSProperties}
                      className="flex min-w-0"
                    >
                      <AltTile
                        card={card}
                        spot={spotOf(pick, idx)}
                        order={copy.single.order(i + 2, cards.length)}
                        onPromote={() => promote(i + 1)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {shortage.kind === "short" ? (
            <ShortNote
              shortage={shortage}
              onWiden={widen}
              onRelaxBudget={relaxBudget}
              className="mt-5"
            />
          ) : null}

          {showEntries ? <Entries /> : null}
        </div>

        <TodayActionBar
          hero={hero}
          pick={pick}
          heroIndex={heroIndex}
          busy={shuffle === "leaving" || pick.rolling}
          opening={directions.opening}
          onDirections={directions.open}
          onReroll={reroll}
        />
        <JustPickLayer
          pick={pick}
          cards={cards}
          reduced={reduced}
          onDirections={directions.open}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-5 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8",
        docked ? "pb-0" : "pb-8 desktop:pb-12",
      )}
    >
      {header}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p aria-live="polite" className="sr-only">
        {deck?.recycled ? copy.recycled : ""}
      </p>
      <Suspense fallback={null}>{body}</Suspense>
      {detail ? (
        <Suspense fallback={null}>
          <TodayDetail
            open={detail.open}
            onOpenChange={(open) => setDetail((v) => (v ? { ...v, open } : v))}
            card={detail.card}
            place={placesById.get(detail.card.id)}
            meal={meal}
            budgetKRW={budgetKRW}
            origin={origin}
          />
        </Suspense>
      ) : null}
      {login ? (
        <Suspense fallback={null}>
          <LoginPromptSheet
            open={login.open}
            trigger="save"
            next={login.next}
            onOpenChange={(open) => setLogin((v) => (v ? { ...v, open } : v))}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

/** 친구랑 정하기, 회식 모드 (REC-10, T5.23). flags.pollEntry가 켜질 때(T7.35)만 보인다 */
function Entries() {
  const link = cn(
    "inline-flex min-h-11 items-center rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
    focusRing,
  );
  return (
    <nav
      aria-label={copy.actions.entriesLabel}
      className="mt-4 flex items-center gap-5"
    >
      <Link href="/poll?start=friends" className={link}>
        {copy.actions.pollWithFriends}
      </Link>
      <Link href="/poll?start=party" className={link}>
        {copy.actions.party}
      </Link>
    </nav>
  );
}
