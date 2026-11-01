"use client";
// 투표방 주소 /poll/<code> 입구 (T7.15, T7.22, POLL-05, POLL-11, AC-POLL-3, D-14 안건 4).
// - 참여자: 투표방 화면.
// - 비로그인: 미리보기(제목, 후보 이름, 카운트다운, 참여 인원만. 득표 숨김) + "로그인하고 투표하기"(로그인 뒤 이 주소로 돌아옴).
// - 로그인했지만 아직 참여 전: 진행 중이면 바로 참여(join_poll)하고 투표방으로. 링크를 연 것이 참여 의사다.
//   마감, 취소, 만료, 30명이면 못 들어가는 방 안내.
// - poll_invite_opened(in_app_browser, logged_in)는 참여자가 아닌 사람이 링크를 열 때 한 번.
import { XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, StateGlyph } from "@/components/states";
import { pollCopy as copy } from "@/copy/poll";
import {
  notifyLoginSoon,
  useLoginOpen,
} from "@/features/auth/login-prompt/gate";
import { loginUrl } from "@/features/auth/routes";
import { track } from "@/lib/analytics";
import { detectInApp } from "@/lib/inapp";
import { MotionProvider } from "@/lib/motion";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { pollRoomHref } from "../routes";
import { joinPollAction } from "./actions";
import type { PollPageData } from "./load";
import type { PollPreview } from "./model";
import {
  CandidateArt,
  CandidateName,
  HeadCaption,
  OfflineLine,
  PollCountdown,
  RoomColumn,
  RoomSkeleton,
  StickyActions,
  buttonClass,
  useDeadlineText,
} from "./parts";
import { PollRoomScreen, RoomNotice } from "./poll-room-screen";
import { useCandidatePlaces } from "./use-candidate-places";

type OpenPreview = Exclude<PollPreview, { status: "expired" }>;

export function PollEntry({
  code,
  data,
}: {
  code: string;
  data: PollPageData;
}) {
  const { preview, signedIn, failed } = data;
  const [pollId, setPollId] = useState<string | null>(
    preview && preview.status !== "expired" && preview.isMember
      ? preview.pollId
      : null,
  );
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || !preview || pollId) return;
    opened.current = true;
    track({
      name: "poll_invite_opened",
      properties: {
        in_app_browser: detectInApp(navigator.userAgent) !== null,
        logged_in: signedIn,
      },
    });
  }, [preview, pollId, signedIn]);

  if (pollId) return <PollRoomScreen pollId={pollId} />;
  if (failed) return <LoadFailed />;
  if (!preview)
    return (
      <Frame>
        <RoomNotice kind="notFound" />
      </Frame>
    );
  if (preview.status === "expired")
    return (
      <Frame>
        <RoomNotice kind="expired" />
      </Frame>
    );
  if (preview.status === "canceled")
    return (
      <Frame>
        <RoomNotice kind="canceled" />
      </Frame>
    );
  if (preview.status !== "open")
    return (
      <Frame>
        <RoomNotice kind="closed" />
      </Frame>
    );
  if (!signedIn) return <GuestPreview code={code} preview={preview} />;
  if (preview.memberCount >= preview.memberLimit)
    return (
      <Frame>
        <RoomNotice kind="full" />
      </Frame>
    );
  return <AutoJoin code={code} onJoined={setPollId} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return <RoomColumn>{children}</RoomColumn>;
}

function LoadFailed() {
  const router = useRouter();
  return (
    <Frame>
      <div className="flex flex-1 flex-col justify-center py-10">
        <ErrorState
          title={copy.states.error.title}
          body={copy.states.error.body}
          action={{
            label: copy.actions.retry,
            onClick: () => router.refresh(),
          }}
          headingLevel="h1"
        />
      </div>
    </Frame>
  );
}

/** 로그인한 사람이 처음 연 진행 중 투표: 바로 참여 */
function AutoJoin({
  code,
  onJoined,
}: {
  code: string;
  onJoined: (id: string) => void;
}) {
  const online = useOnlineStatus();
  const [error, setError] = useState<
    null | "full" | "closed" | "expired" | "notFound" | "save"
  >(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // join_poll은 이미 참여자면 그 방 id를 돌려준다(여러 번 불러도 안전, 개발 모드 효과 두 번 실행 포함)
    if (!online) return;
    let cancelled = false;
    void joinPollAction(code).then((r) => {
      if (cancelled) return;
      if (r.ok) return onJoined(r.pollId);
      setError(
        r.error === "full"
          ? "full"
          : r.error === "closed"
            ? "closed"
            : r.error === "expired"
              ? "expired"
              : r.error === "not_found"
                ? "notFound"
                : "save",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [code, online, attempt, onJoined]);

  if (error && error !== "save")
    return (
      <Frame>
        <RoomNotice kind={error} />
      </Frame>
    );
  if (error === "save") {
    return (
      <Frame>
        <div className="flex flex-1 flex-col justify-center py-10">
          <ErrorState
            title={copy.states.error.title}
            body={copy.errors.joinFailed}
            action={{
              label: copy.actions.retry,
              onClick: () => {
                setError(null);
                setAttempt((n) => n + 1);
              },
            }}
            headingLevel="h1"
          />
        </div>
      </Frame>
    );
  }
  if (!online) {
    return (
      <Frame>
        <div className="flex flex-1 flex-col justify-center py-10">
          <EmptyState
            title={copy.states.offline.title}
            body={copy.states.offline.guestBody}
            visual={<StateGlyph icon={XCircle} />}
            headingLevel="h1"
          />
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      <RoomSkeleton label={copy.guest.joining} />
    </Frame>
  );
}

/** 비로그인 미리보기 (POLL-05, D-14 안건 4). 득표는 참여한 뒤에 보인다 */
function GuestPreview({
  code,
  preview,
}: {
  code: string;
  preview: OpenPreview;
}) {
  const online = useOnlineStatus();
  const loginOpen = useLoginOpen();
  const refs = useMemo(
    () =>
      preview.candidates.map((c) => ({
        placeId: c.placeId,
        placeUrl: c.placeUrl,
      })),
    [preview.candidates],
  );
  // 비참여자 기준점은 약 150m 격자, 반경은 그만큼 넓다(G7). 이름 매칭은 그대로 된다
  const places = useCandidatePlaces(refs, preview.anchor, preview.radiusM, {
    meal: preview.kind === "lunch" ? "lunch" : "dinner",
    withStats: false,
  });
  const deadline = useDeadlineText(preview.closesAt);

  return (
    <MotionProvider>
      <RoomColumn>
        <div className="-mx-2 flex h-14 items-center" />
        <header className="flex flex-col pt-1">
          <HeadCaption
            kindLabel={copy.kind[preview.kind]}
            deadline={deadline}
          />
          <h1 className="mt-2 type-title text-balance break-keep">
            {copy.head.question(preview.title)}
          </h1>
          <div className="mt-6 flex items-end justify-between gap-4 border-b border-border pb-4">
            <p className="type-body-sm text-muted-foreground">
              {copy.head.participantsOf(
                preview.memberCount,
                preview.memberLimit,
              )}
              <span
                aria-hidden
                className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
              />
              {preview.multi ? copy.head.multi : copy.head.single}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="type-caption text-muted-foreground">
                {copy.head.untilDeadline}
              </span>
              <PollCountdown deadline={preview.closesAt} />
            </div>
          </div>
        </header>
        {!online ? (
          <OfflineLine className="mt-6" body={copy.states.offline.guestBody} />
        ) : null}

        <ul
          aria-label={copy.candidate.listLabel(preview.title)}
          className="mt-2 flex flex-col"
        >
          {preview.candidates.map((c, i) => {
            const place = places.get(c.placeId);
            return (
              <li
                key={c.placeId}
                className="flex items-center gap-4 border-b border-border py-4"
              >
                <div className="min-w-0 flex-1">
                  <CandidateName
                    place={place}
                    order={i + 1}
                    className="type-heading"
                  />
                </div>
                <CandidateArt place={place} size={44} />
              </li>
            );
          })}
        </ul>
        <p className="mt-6 type-body-sm text-muted-foreground">
          {copy.guest.hiddenTally}
        </p>
        <div className="h-8" />
        <StickyActions>
          {loginOpen ? (
            <Link
              href={loginUrl(pollRoomHref(code))}
              className={cn(buttonClass("primary"), "w-full")}
            >
              {copy.actions.loginToVote}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => notifyLoginSoon()}
              className={cn(buttonClass("primary"), "w-full")}
            >
              {copy.actions.loginToVote}
            </button>
          )}
          <p className="mt-2 text-center type-caption text-muted-foreground">
            {copy.guest.body}
          </p>
        </StickyActions>
      </RoomColumn>
    </MotionProvider>
  );
}
