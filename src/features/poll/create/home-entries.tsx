"use client";
// 오늘(홈) "친구랑 정하기", "회식 모드" 진입 줄과 만들기 시트 자리 (REC-10, T5.23, T7.11, T7.12, D-15 안건 15, 16).
// 홈 첫 로드 JS 예산(200KB) 때문에 줄 전체를 이 모듈로 떼어 today-screen이 지연 로딩한다.
// flags.pollEntry가 켜질 때(T7.35)만 마운트된다. 로그인 시트는 홈이 가진 것을 onNeedLogin으로 연다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { partyHref } from "@/features/poll/routes";
import { cn } from "@/lib/utils";
import { startHomePoll, type HomePollInput } from "./add-to-poll";
import PollCreateHost from "./host";

const copy = homeCopy.today.actions;

const linkBase =
  "items-center rounded-sm text-muted-foreground underline decoration-border hover:text-foreground active:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60";
/** 따로 한 줄(대안이 없을 때) */
const link = cn(
  linkBase,
  "inline-flex min-h-11 type-label underline-offset-4",
  focusRing,
);
/** 대안 제목 줄 오른쪽 작은 글자(D-25). 글자 높이 24, 터치 영역 44 */
const linkInline = cn(
  linkBase,
  "inline-flex h-6 type-caption underline-offset-3",
  hitArea44,
  focusRing,
);

export default function HomePollEntries({
  homePoll,
  signedIn,
  disabled,
  onNeedLogin,
  inline,
}: {
  homePoll: HomePollInput;
  signedIn: boolean;
  /** 오프라인이거나 추천이 두 곳 미만이면 만들 수 없다 */
  disabled: boolean;
  /** 비로그인: 로그인 유도 시트를 열고 돌아올 경로 */
  onNeedLogin: (next: string) => void;
  /** 대안 제목 줄 오른쪽에 붙는 작은 글자 모양(D-25) */
  inline?: boolean;
}) {
  const a = inline ? linkInline : link;
  const router = useRouter();

  /** 친구랑 정하기: 오늘 카드 3장으로 바로 만든다(POLL-02, 2탭). 비로그인은 로그인 뒤 확인 한 번(안건 15) */
  const startFriends = () => {
    if (!signedIn) {
      onNeedLogin("/today?poll=friends");
      return;
    }
    startHomePoll(homePoll);
  };

  // 로그인 유도 시트를 거쳐 돌아오면(?poll=friends) 자동으로 만들지 않고 확인 시트를 연다(D-15 안건 15)
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !signedIn || homePoll.cards.length < 2) return;
    if (new URLSearchParams(window.location.search).get("poll") !== "friends")
      return;
    resumed.current = true;
    router.replace("/today", { scroll: false });
    startHomePoll(homePoll, true);
  });

  return (
    <>
      <nav
        aria-label={copy.entriesLabel}
        className={
          inline ? "flex items-center gap-4" : "mt-4 flex items-center gap-5"
        }
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : startFriends}
          className={a}
        >
          {copy.pollWithFriends}
        </button>
        <Link href={partyHref} className={a}>
          {copy.party}
        </Link>
      </nav>
      <PollCreateHost />
    </>
  );
}
