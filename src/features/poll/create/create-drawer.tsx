"use client";
// 투표 만들기 시트 본체 (T7.11~T7.13, D-15 C 먼저 만들고 고치기 + B 마감 큰 칸 + A 미리보기 고지, DESIGN.md 5장 "투표 만들기").
// host.tsx가 openPollCreate 뒤에 동적 import한다(홈 첫 로드 밖). Base UI Drawer, 데스크톱은 가운데 대화상자(최대 448).
//
// 흐름
// - 열리면 바로 기본값(진입점이 준 후보, "○요일 점심", 30분 뒤, 한 곳만, 방장 사무실 핀)으로 방을 만든다(POLL-02 원탭).
//   intent.confirm이면(로그인을 거쳐 돌아옴, 안건 15) 만들지 않고 "투표 만들기" 버튼이 있는 같은 시트.
// - 만들면 성공 원 + "투표방을 만들었어요" + 항목 줄 4개(제목, 마감, 후보, 방식) + 기준 + 미리보기 + 보내기.
//   줄을 고치면 이미 만든 방에 바로 반영한다(update_poll, add/remove_poll_candidate).
// - "만들기 취소"는 보내기 전이면 방을 지우고 하루 한도를 돌려준다(안건 2). 보낸 뒤에는 투표방에서 방장 취소.
// - 보내기는 P3 shareInvite(카카오톡, Web Share, 링크 복사, poll_link_shared 이벤트). 처음 보내면 mark_poll_shared.
// - 실패: 만들기 실패(자동 재시도 1회 뒤 "다시 만들기"), 하루 한도, 오프라인, 공유 실패는 시트 안 안내 덩어리(토스트만으로 알리지 않음).
// 장소 이름, 카테고리, 좌표는 세션 메모리 값이라 화면과 반경 계산에만 쓰고 서버로 보내지 않는다(CLAUDE.md 7장).
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Link2,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "@/components/ui/lazy-toaster";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { anchorPickerCopy } from "@/copy/anchor-picker";
import { pollCreateCopy as copy } from "@/copy/poll-create";
import { AnchorPickerLazy } from "@/features/map/anchor-picker-lazy";
import type { UserPinnedLatLng } from "@/features/onboarding/pin";
import { isCategorySlug } from "@/features/place/categories";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import { pollRoomHref, pollTabHref } from "@/features/poll/routes";
import type { InviteChannel, ShareOutcome } from "@/features/poll/share/types";
import { track } from "@/lib/analytics/track";
import { absoluteUrl } from "@/lib/env/site";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import {
  addPollCandidateAction,
  cancelUnsentPollAction,
  createPollAction,
  markPollSharedAction,
  myOfficesAction,
  myPollLimitAction,
  myPollsAction,
  removePollCandidateAction,
  updatePollAction,
  updatePollAnchorAction,
  type CreatePollResult,
  type MyOffice,
  type MyPollRow,
} from "./actions";
import { clampRadius, distanceM } from "./anchor";
import {
  CandidatePicker,
  type PickedPlace,
  type PickGroup,
} from "./candidate-picker";
import {
  defaultDeadline,
  deadlineMinutes,
  deadlineOptions,
  fixedMinutes,
  fixedSwapped,
  kstWeekdayName,
  nowMinutes,
  parseDateTimeInput,
  parseTimeInput,
  partyInputRange,
  toClosesAt,
  toDateTimeInput,
  clockOf,
  customDefault,
  type DeadlineChoice,
  type DeadlineId,
} from "./deadline";
import type { PollWriteError } from "./errors";
import { myPollsKey } from "./keys";
import type { CandidateSource, PollCreateIntent, PollKind } from "./intent";
import {
  buttonClass,
  CandidateNote,
  CandidateRow,
  CANDIDATE_MAX,
  CANDIDATE_MIN,
  deadlineSentence,
  deadlineValue,
  DeadlineTiles,
  InvitePreview,
  ModeField,
  placeName,
  Row,
  RowsSkeleton,
  SHEET_PAD,
  SheetNotice,
  SuccessMark,
  TextButton,
  TitleInput,
  type SheetPlace,
} from "./parts";

export type CreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: PollCreateIntent;
};

type Phase =
  /** 상세, 지도에서 열고 진행 중인 내 방이 있는지 보는 중 */
  | "checking"
  /** "○○ 투표에 넣기" / "새 투표 만들기" 고르기 (D-15 안건 9) */
  | "choose"
  | "confirm"
  | "creating"
  | "created"
  | "saveError"
  | "limit"
  | "offline"
  | "noOffice"
  | "signedOut";

type Field = "title" | "deadline" | "candidates" | "mode";

type Candidate = SheetPlace & {
  candidateId?: string;
  /** 시트 묶음에서 넣은 곳의 출처(poll_candidate_added.source). 진입점이 넘긴 곳은 없음 */
  source?: CandidateSource;
};

/** 넣기 목록 묶음 → poll_candidate_added.source (PRD 10.2) */
const GROUP_SOURCE: Record<PickGroup, CandidateSource> = {
  today: "rec",
  favorite: "favorite",
  history: "history",
};

type Anchor = {
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
};

/** 제목 기본값 "수요일 점심" (POLL-01). 회식은 저녁 고정(PARTY-02) */
export function defaultTitle(kind: PollKind, now: Date): string {
  return `${kstWeekdayName(now)} ${copy.title.suffix[kind]}`;
}

function toCandidate(p: PollCreateIntent["places"][number]): Candidate {
  const c = p.category ?? null;
  return {
    placeId: p.placeId,
    placeUrl: p.placeUrl,
    name: p.name ?? null,
    category: c === null ? null : isCategorySlug(c) ? c : kakaoCategorySlug(c),
  };
}

/** 진입점이 넘긴 후보의 poll_candidate_added.source (PRD 10.2). 시트 묶음에서 넣은 곳은 Candidate.source */
function sourceOf(intent: PollCreateIntent, index: number): CandidateSource {
  if (intent.entry === "party") return "party";
  if (index === 0 && intent.source) return intent.source;
  if (intent.entry === "map") return index === 0 ? "map" : "rec";
  if (intent.entry === "detail") return index === 0 ? "detail" : "rec";
  return "rec";
}

/** 자동 재시도 1회 (PRD 12장) */
async function withRetry(fn: () => Promise<CreatePollResult>) {
  const first = await fn();
  if (first.ok || first.error !== "save") return first;
  return fn();
}

export default function CreateDrawer({
  open,
  onOpenChange,
  intent,
}: CreateDrawerProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ids = useId();
  const queryClient = useQueryClient();
  const refreshList = () =>
    void queryClient.invalidateQueries({ queryKey: myPollsKey });
  const online = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());
  const nowMin = nowMinutes(now);
  const kind = intent.kind;

  const [title, setTitle] = useState(() => defaultTitle(kind, now));
  const [savedTitle, setSavedTitle] = useState(title);
  const [deadline, setDeadline] = useState<DeadlineChoice>(() => ({
    id: defaultDeadline(kind, nowMinutes(now)),
    custom: null,
  }));
  /** 만든 뒤에는 마감 순간을 고정한다(1분마다 "30분 뒤"가 밀리지 않게) */
  const [closesAtFixed, setClosesAtFixed] = useState<number | null>(null);
  const [multi, setMulti] = useState(false);
  const [places, setPlaces] = useState<Candidate[]>(() =>
    intent.places.slice(0, CANDIDATE_MAX).map(toCandidate),
  );
  const fromPlace = intent.entry === "detail" || intent.entry === "map";
  const [phase, setPhase] = useState<Phase>(() =>
    fromPlace ? "checking" : intent.confirm ? "confirm" : "creating",
  );
  const [openPolls, setOpenPolls] = useState<MyPollRow[]>([]);
  const [poll, setPoll] = useState<{ pollId: string; code: string } | null>(
    null,
  );
  const [shared, setShared] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(() =>
    intent.anchor
      ? { ...intent.anchor, label: copy.anchor.officeFallback }
      : null,
  );
  const [outside, setOutside] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const started = useRef(false);

  // 1분마다 시각을 다시 본다(마감 칸, "11:30이 지나" 판정)
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const closesAt = closesAtFixed ?? deadlineMinutes(kind, deadline, nowMin);

  const create = async () => {
    if (!online) {
      setPhase("offline");
      return;
    }
    const at = deadlineMinutes(kind, deadline, nowMinutes(new Date()));
    if (at === null || places.length < CANDIDATE_MIN) {
      setPhase("saveError");
      return;
    }
    setPhase("creating");
    const startNow = new Date();
    const result = await withRetry(() =>
      createPollAction({
        kind,
        title: title.trim(),
        closesAt: toClosesAt(startNow, at).toISOString(),
        multi,
        places: places.map((p) => ({
          placeId: p.placeId,
          placeUrl: p.placeUrl,
        })),
        ...(anchor
          ? {
              anchor: {
                lat: anchor.lat,
                lng: anchor.lng,
                radiusM: anchor.radiusM,
              },
            }
          : {}),
      }),
    );
    if (!result.ok) {
      setPhase(phaseOf(result.error));
      return;
    }
    setPoll({ pollId: result.pollId, code: result.code });
    setClosesAtFixed(at);
    setSavedTitle(title.trim());
    setPlaces((list) =>
      list.map((p) => ({
        ...p,
        candidateId: result.candidates.find((c) => c.placeId === p.placeId)?.id,
      })),
    );
    setPhase("created");
    refreshList();
    track({
      name: "poll_created",
      properties: {
        kind,
        candidate_count: places.length,
        // 홈 진입점에서 만든 방은 고쳐도 quick (D-15 안건 17)
        quick: intent.entry === "home",
      },
    });
    places.forEach((p, i) =>
      track({
        name: "poll_candidate_added",
        properties: {
          place_id: p.placeId,
          source: p.source ?? sourceOf(intent, i),
        },
      }),
    );
    void myPollLimitAction().then(
      (r) => {
        if (r.signedIn) setRemaining(r.remaining);
      },
      () => undefined,
    );
  };

  // 열리면 바로 만든다(확인 모드가 아니면). 상세, 지도에서 열었으면 진행 중인 내 방부터 본다(D-15 안건 9).
  // StrictMode 두 번 실행을 막는다
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!fromPlace) {
      // 서버 요청의 콜백에서 상태를 바꾼다(효과 안에서 곧바로 setState하지 않게)
      if (!intent.confirm) void Promise.resolve().then(create);
      return;
    }
    myPollsAction().then(
      (r) => {
        const mine = r.signedIn
          ? r.polls.filter((p) => p.isHost && p.status === "open")
          : [];
        if (mine.length > 0) {
          setOpenPolls(mine);
          setPhase("choose");
        } else if (intent.confirm) setPhase("confirm");
        else void create();
      },
      () => {
        if (intent.confirm) setPhase("confirm");
        else void create();
      },
    );
    // 첫 마운트에서 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [adding, setAdding] = useState<string | null>(null);
  const addToExisting = async (p: MyPollRow) => {
    const first = places[0];
    if (!first || adding) return;
    setAdding(p.pollId);
    const r = await addPollCandidateAction({
      pollId: p.pollId,
      place: { placeId: first.placeId, placeUrl: first.placeUrl },
    });
    setAdding(null);
    if (!r.ok) {
      const msg =
        r.error === "exists"
          ? copy.entries.alreadyIn
          : copy.editErrors[r.error];
      setRowError(msg);
      setAnnouncement(msg);
      return;
    }
    refreshList();
    track({
      name: "poll_candidate_added",
      properties: { place_id: first.placeId, source: sourceOf(intent, 0) },
    });
    onOpenChange(false);
    toast(copy.entries.added(p.title));
  };

  // 기준점: 진입점이 주지 않았으면 서버가 기본 사무실 핀을 쓴다. 이름 표시와 바꾸기 목록은 내 사무실 핀에서
  const [offices, setOffices] = useState<MyOffice[] | null>(null);
  useEffect(() => {
    let alive = true;
    myOfficesAction().then(
      (r) => {
        if (!alive || !r.signedIn) return;
        setOffices(r.offices);
        setAnchor((a) => {
          const d = r.offices.find((o) => o.isDefault) ?? r.offices[0];
          if (!d) return a;
          if (a) {
            const same = r.offices.find(
              (o) =>
                Math.abs(o.lat - a.lat) < 1e-6 &&
                Math.abs(o.lng - a.lng) < 1e-6,
            );
            return same ? { ...a, label: copy.anchor.office(same.name) } : a;
          }
          return {
            lat: d.lat,
            lng: d.lng,
            radiusM: clampRadius(1000),
            label: copy.anchor.office(d.name),
          };
        });
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  const fail = (e: PollWriteError) => {
    setRowError(copy.editErrors[e]);
    setAnnouncement(copy.editErrors[e]);
  };
  const saved = () => {
    setRowError(null);
    setAnnouncement(copy.instant.saved);
  };

  /* ---------- 고치기 ---------- */

  const commitTitle = async () => {
    const next = title.trim();
    if (next === "") return false;
    setTitleError(null);
    if (!poll || next === savedTitle) return true;
    const r = await updatePollAction({ pollId: poll.pollId, title: next });
    if (!r.ok) {
      if (r.error === "banned") setTitleError(copy.title.banned);
      else fail(r.error);
      return false;
    }
    setSavedTitle(next);
    saved();
    return true;
  };

  const chooseDeadline = async (choice: DeadlineChoice) => {
    setDeadline(choice);
    const at = deadlineMinutes(kind, choice, nowMinutes(new Date()));
    if (!poll || at === null) return;
    const prev = closesAtFixed;
    setClosesAtFixed(at);
    const r = await updatePollAction({
      pollId: poll.pollId,
      closesAt: toClosesAt(new Date(), at).toISOString(),
    });
    if (!r.ok) {
      setClosesAtFixed(prev);
      fail(r.error);
    } else saved();
  };

  const chooseMulti = async (next: boolean) => {
    const prev = multi;
    setMulti(next);
    if (!poll) return;
    const r = await updatePollAction({ pollId: poll.pollId, multi: next });
    if (!r.ok) {
      setMulti(prev);
      fail(r.error);
    } else saved();
  };

  const removePlace = async (p: Candidate, index: number) => {
    if (places.length <= CANDIDATE_MIN) {
      fail("min");
      return;
    }
    const prev = places;
    setPlaces((list) => list.filter((x) => x.placeId !== p.placeId));
    if (poll && p.candidateId) {
      const r = await removePollCandidateAction({ candidateId: p.candidateId });
      if (!r.ok) {
        setPlaces(prev);
        fail(r.error);
        return;
      }
    }
    setRowError(null);
    setAnnouncement(copy.candidates.removed(placeName(p, index)));
  };

  const addPlace = async (p: PickedPlace, group: PickGroup) => {
    if (places.some((x) => x.placeId === p.placeId)) {
      const i = places.findIndex((x) => x.placeId === p.placeId);
      const hit = places[i];
      if (hit) await removePlace(hit, i);
      return;
    }
    if (places.length >= CANDIDATE_MAX) {
      fail("full");
      return;
    }
    const next: Candidate = {
      placeId: p.placeId,
      placeUrl: p.placeUrl,
      name: p.name,
      category: p.category,
      source: GROUP_SOURCE[group],
    };
    setPlaces((list) => [...list, next]);
    if (anchor && distanceM(anchor, p.position) > anchor.radiusM)
      setOutside(true);
    if (poll) {
      const r = await addPollCandidateAction({
        pollId: poll.pollId,
        place: { placeId: p.placeId, placeUrl: p.placeUrl },
      });
      if (!r.ok) {
        setPlaces((list) => list.filter((x) => x.placeId !== p.placeId));
        fail(r.error);
        return;
      }
      setPlaces((list) =>
        list.map((x) =>
          x.placeId === p.placeId ? { ...x, candidateId: r.candidateId } : x,
        ),
      );
      track({
        name: "poll_candidate_added",
        properties: { place_id: p.placeId, source: GROUP_SOURCE[group] },
      });
    }
    setRowError(null);
    setAnnouncement(copy.candidates.added(p.name));
  };

  /**
   * 기준 바꾸기. 반경은 옛 기준의 원을 다 덮게 넓힌다(후보 좌표를 저장하지 않으므로).
   * 새 기준은 저장된 사무실 핀(changeAnchor) 또는 사용자가 지도에 놓은 핀(pickAnchor)뿐이다. 현위치는 오지 않는다.
   */
  const applyAnchor = async (
    point: { lat: number; lng: number },
    label: string,
  ) => {
    if (!anchor) return;
    const moved = distanceM(anchor, point);
    const next: Anchor = {
      lat: point.lat,
      lng: point.lng,
      radiusM: clampRadius(anchor.radiusM + moved),
      label,
    };
    const prev = anchor;
    setAnchor(next);
    setOutside(false);
    if (!poll) return;
    const r = await updatePollAnchorAction({
      pollId: poll.pollId,
      anchor: { lat: next.lat, lng: next.lng, radiusM: next.radiusM },
    });
    if (!r.ok) {
      setAnchor(prev);
      fail(r.error);
    } else setAnnouncement(copy.anchor.pickedNote);
  };
  const changeAnchor = (o: MyOffice) =>
    applyAnchor({ lat: o.lat, lng: o.lng }, copy.anchor.office(o.name));
  const pickAnchor = (pin: UserPinnedLatLng) =>
    applyAnchor(pin, copy.anchor.picked);

  /* ---------- 취소, 보내기 ---------- */

  const undo = async () => {
    if (!poll) {
      onOpenChange(false);
      return;
    }
    const r = await cancelUnsentPollAction({ pollId: poll.pollId });
    if (!r.ok) {
      fail(r.error === "shared" ? "shared" : r.error);
      return;
    }
    refreshList();
    track({
      name: "poll_closed",
      properties: { reason: "canceled", participant_count: 1 },
    });
    onOpenChange(false);
    toast(copy.instant.undone);
  };

  const [shareFailed, setShareFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const canWebShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const share = async (channel: InviteChannel) => {
    if (!poll) return;
    const at = closesAt;
    let outcome: ShareOutcome = "failed";
    try {
      const { shareInvite } =
        await import("@/features/poll/share/share-invite");
      outcome = await shareInvite({
        code: poll.code,
        title: savedTitle,
        closesAt: toClosesAt(now, at ?? nowMin + 30).toISOString(),
        candidateCount: places.length,
        kind,
        channel,
      });
    } catch {
      outcome = "failed";
    }
    if (outcome === "failed") {
      if (channel === "kakao") setShareFailed(true);
      return;
    }
    if (outcome === "cancelled") return;
    if (outcome === "copied") {
      setCopied(true);
      setAnnouncement(copy.share.copied);
    }
    if (!shared) {
      setShared(true);
      void markPollSharedAction({ pollId: poll.pollId });
    }
  };

  /* ---------- 그리기 ---------- */

  const created = phase === "created";
  const eyebrow = copy.sheet.eyebrow[intent.entry];
  const headTitle = created
    ? copy.instant.title
    : phase === "choose" || phase === "checking"
      ? copy.entries.menuLabel
      : phase === "confirm"
        ? copy.confirm.title
        : phase === "creating"
          ? copy.instant.creating
          : phase === "limit"
            ? copy.states.limit.title
            : copy.confirm.title;
  const lead =
    intent.entry === "detail"
      ? copy.instant.detailBody
      : intent.entry === "party"
        ? copy.instant.partyBody
        : copy.instant.body;

  const footer = created ? (
    <ShareFooter
      failed={shareFailed}
      copied={copied}
      canWebShare={canWebShare}
      onShare={share}
      roomHref={poll ? pollRoomHref(poll.code) : pollTabHref}
      onGoRoom={() => onOpenChange(false)}
    />
  ) : phase === "limit" ? (
    <Link
      href={pollTabHref}
      onClick={() => onOpenChange(false)}
      className={cn(buttonClass("secondary"), "w-full")}
    >
      {copy.states.limit.goList}
    </Link>
  ) : phase === "signedOut" ||
    phase === "noOffice" ||
    phase === "choose" ||
    phase === "checking" ? null : (
    <button
      type="button"
      aria-disabled={
        phase === "creating" ||
        !online ||
        places.length < CANDIDATE_MIN ||
        title.trim() === "" ||
        closesAt === null ||
        undefined
      }
      onClick={() => {
        if (phase === "creating" || !online) return;
        void create();
      }}
      className={cn(buttonClass("primary"), "w-full")}
    >
      {phase === "saveError"
        ? copy.states.saveError.retry
        : copy.confirm.submit}
    </button>
  );

  const editable = created || phase === "confirm";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop forceRender className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            initialFocus={() => titleRef.current ?? true}
            className={cn(
              "flex max-h-[92dvh] flex-col border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:overflow-hidden min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <span
              aria-hidden
              className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border min-[64rem]:hidden"
            />
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            <div
              className={cn(
                "flex shrink-0 items-start gap-3 pt-4 pb-1 min-[64rem]:pt-6",
                SHEET_PAD,
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="type-caption text-muted-foreground">
                  {eyebrow}
                </span>
                <div className="flex items-center gap-2.5">
                  {created ? <SuccessMark /> : null}
                  <DrawerTitle
                    ref={titleRef}
                    tabIndex={-1}
                    className="min-w-0 type-heading break-keep outline-none"
                  >
                    {headTitle}
                  </DrawerTitle>
                </div>
                {created ? (
                  <div className="flex flex-col items-start gap-1">
                    <p className="type-body-sm break-keep text-muted-foreground">
                      {lead}
                    </p>
                    {!shared ? (
                      <TextButton onClick={() => void undo()}>
                        {copy.instant.undo}
                      </TextButton>
                    ) : null}
                  </div>
                ) : phase === "confirm" ? (
                  <p className="type-body-sm break-keep text-muted-foreground">
                    {copy.confirm.body}
                  </p>
                ) : null}
              </div>
              <DrawerClose
                aria-label={copy.sheet.close}
                className={cn(
                  "-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-7",
                SHEET_PAD,
              )}
            >
              <Notice
                phase={phase}
                online={online}
                onRetry={() => void create()}
              />
              {phase === "checking" ? (
                <RowsSkeleton />
              ) : phase === "choose" ? (
                <ChoosePoll
                  polls={openPolls}
                  adding={adding}
                  error={rowError}
                  onAdd={(p) => void addToExisting(p)}
                  onNew={() => {
                    setRowError(null);
                    if (intent.confirm || places.length < CANDIDATE_MIN)
                      setPhase("confirm");
                    else void create();
                  }}
                />
              ) : phase === "creating" ? (
                <RowsSkeleton />
              ) : phase === "limit" ||
                phase === "signedOut" ||
                phase === "noOffice" ? null : (
                <div className="flex flex-col">
                  <ul className="flex flex-col border-y border-border">
                    <Row
                      label={copy.instant.rows.title}
                      value={created ? savedTitle : title}
                      open={editing === "title"}
                      readOnly={!editable}
                      onToggle={() =>
                        setEditing(editing === "title" ? null : "title")
                      }
                    >
                      <TitleInput
                        value={title}
                        onChange={(v) => {
                          setTitle(v);
                          setTitleError(null);
                        }}
                        error={titleError}
                      />
                      <DoneButton
                        onClick={async () => {
                          if (await commitTitle()) setEditing(null);
                        }}
                      />
                    </Row>
                    <Row
                      label={copy.instant.rows.deadline}
                      value={
                        <span
                          className={cn(
                            "tabular-nums",
                            closesAt === null && "text-destructive",
                          )}
                        >
                          {deadlineValue(deadline.id, closesAt, kind)}
                        </span>
                      }
                      open={editing === "deadline"}
                      readOnly={!editable}
                      onToggle={() =>
                        setEditing(editing === "deadline" ? null : "deadline")
                      }
                    >
                      <DeadlineEditor
                        kind={kind}
                        now={now}
                        choice={deadline}
                        closesAt={closesAt}
                        onChoose={(c) => void chooseDeadline(c)}
                      />
                      <DoneButton onClick={() => setEditing(null)} />
                    </Row>
                    <Row
                      label={copy.instant.rows.candidates}
                      value={
                        <span className="flex min-w-0 flex-col">
                          <span className="tabular-nums">
                            {copy.candidates.count(places.length)}
                          </span>
                          <span className="truncate type-caption text-muted-foreground">
                            {places.map((p, i) => placeName(p, i)).join(", ")}
                          </span>
                        </span>
                      }
                      open={editing === "candidates"}
                      readOnly={!editable}
                      onToggle={() =>
                        setEditing(
                          editing === "candidates" ? null : "candidates",
                        )
                      }
                    >
                      <ul className="flex flex-col">
                        {places.map((p, i) => (
                          <CandidateRow
                            key={p.placeId}
                            place={p}
                            index={i}
                            removeDisabled={places.length <= CANDIDATE_MIN}
                            onRemove={() => void removePlace(p, i)}
                          />
                        ))}
                      </ul>
                      <CandidateNote count={places.length} />
                      <CandidatePicker
                        picked={places.map((p) => p.placeId)}
                        anchor={anchor}
                        onToggle={(p, group) => void addPlace(p, group)}
                        onMap={() => onOpenChange(false)}
                      />
                      <DoneButton onClick={() => setEditing(null)} />
                    </Row>
                    <Row
                      label={copy.instant.rows.mode}
                      value={multi ? copy.mode.multi : copy.mode.single}
                      open={editing === "mode"}
                      readOnly={!editable}
                      onToggle={() =>
                        setEditing(editing === "mode" ? null : "mode")
                      }
                    >
                      <ModeField
                        multi={multi}
                        onChange={(m) => void chooseMulti(m)}
                      />
                      <DoneButton onClick={() => setEditing(null)} />
                    </Row>
                  </ul>
                  {rowError ? (
                    <p
                      role="status"
                      className="pt-2 type-caption break-keep text-destructive"
                    >
                      {rowError}
                    </p>
                  ) : null}
                  <AnchorLine
                    id={`${ids}-anchor`}
                    anchor={anchor}
                    outside={outside}
                    offices={offices}
                    locked={shared}
                    onPick={(o) => void changeAnchor(o)}
                    onPickMap={(pin) => void pickAnchor(pin)}
                  />
                </div>
              )}

              {created && poll ? (
                <div className="flex flex-col gap-2">
                  <InvitePreview
                    kind={kind}
                    title={savedTitle}
                    candidateCount={places.length}
                    closesAt={closesAt}
                    url={absoluteUrl(pollRoomHref(poll.code))}
                  />
                  {remaining !== null && remaining <= 2 ? (
                    <p className="type-caption text-muted-foreground tabular-nums">
                      {copy.share.limitLeft(remaining)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {footer ? (
              <div
                className={cn(
                  "shrink-0 border-t border-border bg-popover pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] min-[64rem]:pb-5",
                  SHEET_PAD,
                )}
              >
                {footer}
              </div>
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

/** 진행 중인 내 방에 넣기 / 새 투표 만들기 (D-15 안건 9). 5곳이 찬 방은 꺼진다 */
function ChoosePoll({
  polls,
  adding,
  error,
  onAdd,
  onNew,
}: {
  polls: readonly MyPollRow[];
  adding: string | null;
  error: string | null;
  onAdd: (p: MyPollRow) => void;
  onNew: () => void;
}) {
  const row = cn(
    "flex min-h-14 w-full items-center gap-3 rounded-md py-2 text-left type-label aria-disabled:opacity-50",
    focusRing,
    rowPress,
  );
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col border-y border-border">
        {polls.map((p) => {
          const full = p.candidateCount >= CANDIDATE_MAX;
          return (
            <li
              key={p.pollId}
              className="border-b border-border last:border-b-0"
            >
              <button
                type="button"
                aria-disabled={full || adding !== null || undefined}
                onClick={full ? undefined : () => onAdd(p)}
                className={row}
              >
                <span className="min-w-0 flex-1 break-keep">
                  {full
                    ? copy.entries.addToFull(p.title)
                    : copy.entries.addTo(p.title)}
                </span>
                <span className="type-caption text-muted-foreground tabular-nums">
                  {copy.candidates.count(p.candidateCount)}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onNew} className={row}>
            {copy.entries.newPoll}
          </button>
        </li>
      </ul>
      {error ? (
        <p role="status" className="type-caption break-keep text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function phaseOf(e: PollWriteError): Phase {
  if (e === "limit") return "limit";
  if (e === "unauthenticated") return "signedOut";
  if (e === "no_office") return "noOffice";
  return "saveError";
}

function Notice({
  phase,
  online,
  onRetry,
}: {
  phase: Phase;
  online: boolean;
  onRetry: () => void;
}) {
  if (!online && phase !== "created")
    return (
      <SheetNotice
        tone="offline"
        title={copy.states.offline.title}
        body={copy.states.offline.body}
      />
    );
  switch (phase) {
    case "saveError":
      return (
        <SheetNotice
          tone="danger"
          title={copy.states.saveError.title}
          body={copy.states.saveError.body}
          action={
            <TextButton onClick={onRetry}>
              {copy.states.saveError.retry}
            </TextButton>
          }
        />
      );
    case "limit":
      return (
        <SheetNotice
          tone="neutral"
          title={copy.states.limit.title}
          body={copy.states.limit.body}
        />
      );
    case "offline":
      return (
        <SheetNotice
          tone="offline"
          title={copy.states.offline.title}
          body={copy.states.offline.body}
        />
      );
    case "signedOut":
      return (
        <SheetNotice
          tone="neutral"
          title={copy.states.signedOut.title}
          body={copy.states.signedOut.body}
        />
      );
    case "noOffice":
      return (
        <SheetNotice
          tone="neutral"
          title={copy.editErrors.no_office}
          action={
            <Link
              href="/me/settings"
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm type-label underline decoration-border underline-offset-4 hover:decoration-foreground active:decoration-foreground",
                focusRing,
              )}
            >
              {copy.anchor.change}
            </Link>
          }
        />
      );
    default:
      return null;
  }
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        type="button"
        onClick={onClick}
        className={buttonClass("secondary", "sm")}
      >
        {copy.instant.done}
      </button>
    </div>
  );
}

/** 마감 고치기: 큰 칸 2 x 2 + 직접 입력 + 아래 한 줄(aria-live) */
function DeadlineEditor({
  kind,
  now,
  choice,
  closesAt,
  onChoose,
}: {
  kind: PollKind;
  now: Date;
  choice: DeadlineChoice;
  closesAt: number | null;
  onChoose: (c: DeadlineChoice) => void;
}) {
  const id = useId();
  const n = nowMinutes(now);
  const options = deadlineOptions(kind, n);
  const swapped = fixedSwapped(kind, n);
  const select = (next: DeadlineId) =>
    onChoose({
      id: next,
      custom:
        next === "custom" ? (choice.custom ?? customDefault(n)) : choice.custom,
    });
  const range = kind === "party" ? partyInputRange(now) : null;
  return (
    <div className="flex flex-col gap-3">
      <span id={`${id}-h`} className="sr-only">
        {copy.deadline.title}
      </span>
      <DeadlineTiles
        labelledBy={`${id}-h`}
        options={options}
        kind={kind}
        value={choice.id}
        customAt={choice.custom}
        onSelect={select}
      />
      {choice.id === "custom" ? (
        <label className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-4 py-2">
          <span className="type-label">{copy.deadline.customLabel}</span>
          {range ? (
            <input
              type="datetime-local"
              step={300}
              min={range.min}
              max={range.max}
              value={
                choice.custom === null
                  ? ""
                  : toDateTimeInput(now, choice.custom)
              }
              onChange={(e) =>
                onChoose({
                  id: "custom",
                  custom: parseDateTimeInput(e.target.value, now),
                })
              }
              className={cn(
                "min-h-11 min-w-0 rounded-sm bg-transparent text-right type-body tabular-nums",
                focusRing,
              )}
            />
          ) : (
            <input
              type="time"
              step={300}
              value={choice.custom === null ? "" : clockOf(choice.custom).hhmm}
              onChange={(e) =>
                onChoose({
                  id: "custom",
                  custom: parseTimeInput(e.target.value),
                })
              }
              className={cn(
                "min-h-11 rounded-sm bg-transparent text-right type-numeric-md tabular-nums",
                focusRing,
              )}
            />
          )}
        </label>
      ) : null}
      <p
        aria-live="polite"
        className={cn(
          "type-caption break-keep tabular-nums",
          closesAt === null ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {deadlineSentence(closesAt, kind)}
        {swapped
          ? ` ${copy.deadline.lateNote(clockOf(fixedMinutes(kind)).hhmm)}`
          : ""}
      </p>
    </div>
  );
}

/**
 * 후보 이름 기준(T7.6 기준점) + 기준 바꾸기(내 사무실 핀 목록, 지도에서 찍기). 현위치는 쓰지 않는다.
 * 지도에서 찍기는 이 줄 아래에 지도 칸을 펼친다(시트 안, 지도 SDK는 그때 받음). 시트 위에 시트를 겹치지 않는다.
 */
function AnchorLine({
  id,
  anchor,
  outside,
  offices,
  locked,
  onPick,
  onPickMap,
}: {
  id: string;
  anchor: Anchor | null;
  outside: boolean;
  offices: MyOffice[] | null;
  locked: boolean;
  onPick: (o: MyOffice) => void;
  onPickMap: (pin: UserPinnedLatLng) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const changeRef = useRef<HTMLSpanElement>(null);
  const backToChange = () =>
    changeRef.current?.querySelector("button")?.focus();
  const start = anchor ?? offices?.find((o) => o.isDefault) ?? offices?.[0];
  const others = useMemo(
    () =>
      (offices ?? []).filter(
        (o) =>
          !anchor ||
          Math.abs(o.lat - anchor.lat) > 1e-6 ||
          Math.abs(o.lng - anchor.lng) > 1e-6,
      ),
    [offices, anchor],
  );
  return (
    <div className="flex flex-col gap-1.5 pt-4">
      <div className="flex items-center gap-2">
        <MapPin
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            outside ? "text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.5}
        />
        <span className="type-caption text-muted-foreground">
          {copy.anchor.label}
        </span>
        <span className="min-w-0 flex-1 truncate type-caption text-foreground">
          {anchor?.label ?? copy.anchor.officeFallback}
        </span>
        {!locked && !picking && start ? (
          <span ref={changeRef} className="contents">
            <TextButton
              onClick={() => setOpen((v) => !v)}
              aria-describedby={outside ? `${id}-out` : undefined}
              className={
                outside ? "text-foreground decoration-foreground" : undefined
              }
            >
              {copy.anchor.change}
            </TextButton>
          </span>
        ) : null}
      </div>
      {outside ? (
        <p id={`${id}-out`} className="type-caption break-keep text-foreground">
          {copy.anchor.outside}
        </p>
      ) : null}
      {open ? (
        <ul className="flex flex-col rounded-card border border-border bg-card px-4">
          {others.map((o) => (
            <li key={o.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(o);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2 rounded-md text-left type-label",
                  focusRing,
                  rowPress,
                )}
              >
                <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
                {copy.anchor.office(o.name)}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPicking(true);
              }}
              className={cn(
                "flex min-h-12 w-full items-center gap-2 rounded-md text-left type-label",
                focusRing,
                rowPress,
              )}
            >
              <MapIcon aria-hidden className="size-4" strokeWidth={1.5} />
              {anchorPickerCopy.open}
            </button>
          </li>
        </ul>
      ) : null}
      {picking && start ? (
        <AnchorPickerLazy
          className="pt-2"
          initialCenter={{ lat: start.lat, lng: start.lng }}
          onCancel={() => {
            setPicking(false);
            requestAnimationFrame(backToChange);
          }}
          onConfirm={(pin) => {
            setPicking(false);
            onPickMap(pin);
            requestAnimationFrame(backToChange);
          }}
        />
      ) : null}
    </div>
  );
}

/** 바닥: 카카오톡(primary, 화면에 하나) + 다른 앱으로(Web Share 지원 때만) / 링크 복사 + 투표방으로 가기 */
function ShareFooter({
  failed,
  copied,
  canWebShare,
  onShare,
  roomHref,
  onGoRoom,
}: {
  failed: boolean;
  copied: boolean;
  canWebShare: boolean;
  onShare: (channel: InviteChannel) => Promise<void>;
  roomHref: string;
  onGoRoom: () => void;
}) {
  const copyButton = (primary: boolean): ReactNode => (
    <button
      type="button"
      onClick={() => void onShare("copy")}
      className={cn(buttonClass(primary ? "primary" : "secondary"), "w-full")}
    >
      {copied ? (
        <Check aria-hidden className="size-4" strokeWidth={2} />
      ) : (
        <Link2 aria-hidden className="size-4" strokeWidth={1.5} />
      )}
      {copied ? copy.share.copiedShort : copy.share.copy}
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      {failed ? (
        <>
          <SheetNotice
            tone="danger"
            title={copy.share.failed.title}
            body={copy.share.failed.body}
          />
          {copyButton(true)}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void onShare("kakao")}
            className={cn(buttonClass("primary"), "w-full")}
          >
            <MessageCircle aria-hidden strokeWidth={1.5} />
            {copy.share.kakao}
          </button>
          <div className={cn("grid gap-2", canWebShare && "grid-cols-2")}>
            {canWebShare ? (
              <button
                type="button"
                onClick={() => void onShare("share")}
                className={cn(buttonClass("secondary"), "w-full")}
              >
                <Share2 aria-hidden className="size-4" strokeWidth={1.5} />
                {copy.share.webShare}
              </button>
            ) : null}
            {copyButton(false)}
          </div>
        </>
      )}
      <Link
        href={roomHref}
        onClick={onGoRoom}
        className={cn(
          "mx-auto inline-flex min-h-11 items-center rounded-sm type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground",
          focusRing,
        )}
      >
        {copy.share.goRoom}
      </Link>
    </div>
  );
}
