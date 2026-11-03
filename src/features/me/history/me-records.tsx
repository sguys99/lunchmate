"use client";
// 나 탭 첫 화면 /me (T6.13, HIS-01~03, D-12 A 기록 일지 + C 이번 달 숫자, DESIGN.md 5장 "나 탭").
// - 머리: caption 인사 + 제목 "나"(세리프), 오른쪽 톱니 아이콘 버튼(이름 "설정") → /me/settings.
//   인사 앞 작은 얼굴(24px, T9.10): 프로필 사진, 없거나 받는 중이거나 실패하면 이니셜. 닉네임이 바로 읽히므로 alt="".
// - 세 탭 기록 / 장소 / 후기. tablist, 좌우 화살표로 이동, 활성 탭만 tabIndex 0. 밑줄 막대는 transform으로 base.
//   고른 탭은 주소 ?tab=에 남겨 뒤로 가기로 돌아와도 같은 탭이다(replaceState라 기록은 쌓지 않는다).
// - 데스크톱 우측 지도(@map/me)에 기본 사무실과 보이는 줄의 핀을 넘긴다(me-map-store).
// - 베타 기간(betaFeedback 플래그)에는 머리 아래 "베타 의견 보내기" 줄(T9.4, D-23). 시트는 누른 뒤에 받는다.
// - 오프라인이면 받아 둔 기록을 그대로 두고 위 안내 한 줄, 쓰기 버튼은 aria-disabled + 누르면 토스트.
import { Settings } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { focusRing } from "@/components/ui/interaction";
import { historyCopy as copy } from "@/copy/history";
import { BetaFeedbackEntry } from "@/features/beta-feedback/entry";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { DetailEntryProvider, type OfficeAnchor } from "./detail-entry";
import { HistoryPanel } from "./history-panel";
import { useMeMap } from "./me-map-store";
import { ME_TABS, type MeTab } from "./model";
import { btn } from "./parts";
import { PlacesPanel } from "./places-panel";
import { ReviewsPanel } from "./reviews-panel";

export function MeRecords({
  nickname,
  avatarUrl = null,
  office,
  budget,
  nowIso,
  initialTab,
  betaFeedback = false,
  placeMemo = false,
}: {
  nickname: string | null;
  /** 본인 프로필 사진(허용 CDN만, T9.10) */
  avatarUrl?: string | null;
  office: OfficeAnchor | null;
  budget: { lunch: number; dinner: number };
  /** 서버가 본 지금(ISO). 주 묶음과 14일 판정 기준을 서버 HTML과 맞춘다 */
  nowIso: string;
  initialTab: MeTab;
  /** 베타 의견 보내기 줄(T9.4, betaFeedback 플래그, 서버 판정) */
  betaFeedback?: boolean;
  /** 식당 메모(T10.15, userPlaceMemo 플래그, 서버 판정): 즐겨찾기 이름표와 상세 이름표 */
  placeMemo?: boolean;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const online = useOnlineStatus();
  const offline = !online;

  const setBase = useMeMap((s) => s.setBase);
  const setPins = useMeMap((s) => s.setPins);
  const setActive = useMeMap((s) => s.setActive);
  useEffect(() => {
    setBase(office?.position ?? null);
    return () => {
      setPins([]);
      setActive(null);
    };
  }, [office, setBase, setPins, setActive]);

  return (
    <DetailEntryProvider office={office} budget={budget} placeMemo={placeMemo}>
      <header className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {nickname ? (
            <p className="flex min-w-0 items-center gap-2 type-caption text-muted-foreground">
              <Avatar size="sm" aria-hidden>
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback>{Array.from(nickname)[0]}</AvatarFallback>
              </Avatar>
              <span className="truncate">{copy.greeting(nickname)}</span>
            </p>
          ) : null}
          <h1 className="type-title break-keep text-foreground">
            {copy.title}
          </h1>
        </div>
        <Link
          href="/me/settings"
          aria-label={copy.header.settings}
          className={cn(btn.ghostIcon, "-mr-2.5")}
        >
          <Settings aria-hidden className="size-[1.375rem]" strokeWidth={1.5} />
        </Link>
      </header>
      {betaFeedback ? <BetaFeedbackEntry /> : null}
      <Tabs
        initial={initialTab}
        render={(tab) =>
          tab === "history" ? (
            <HistoryPanel now={now} office={office} offline={offline} />
          ) : tab === "places" ? (
            <PlacesPanel
              office={office}
              offline={offline}
              placeMemo={placeMemo}
            />
          ) : (
            <ReviewsPanel office={office} offline={offline} />
          )
        }
      />
    </DetailEntryProvider>
  );
}

const LABELS: Record<MeTab, string> = {
  history: copy.tabs.history,
  places: copy.tabs.places,
  reviews: copy.tabs.reviews,
};

function Tabs({
  initial,
  render,
}: {
  initial: MeTab;
  render: (tab: MeTab) => ReactNode;
}) {
  const [tab, setTab] = useState<MeTab>(initial);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = ME_TABS.indexOf(tab);

  const choose = (next: MeTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "history") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + ME_TABS.length) % ME_TABS.length;
    choose(ME_TABS[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div
        role="tablist"
        aria-label={copy.tabs.label}
        // 안쪽 탭 줄은 탭 스와이프(T9.14)를 받지 않는다(안쪽 탭과 헷갈리지 않게)
        data-swipe-ignore
        className="relative grid grid-cols-3 border-b border-border"
      >
        {ME_TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t}`}
            aria-selected={t === tab}
            aria-controls={`${baseId}-panel`}
            tabIndex={t === tab ? 0 : -1}
            onClick={() => choose(t)}
            onKeyDown={onKey}
            className={cn(
              "h-12 type-label transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              t === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground active:text-foreground",
              focusRing,
            )}
          >
            {LABELS[t]}
          </button>
        ))}
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-px w-1/3 bg-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
      </div>
      <div
        key={tab}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="flex flex-1 animate-in flex-col pt-6 duration-(--lm-duration-base) ease-enter fade-in motion-reduce:animate-none"
      >
        {render(tab)}
      </div>
    </div>
  );
}
