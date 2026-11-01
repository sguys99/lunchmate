"use client";
// 결과 화면 하단 행동 (T7.19, T7.20 진입점, POLL-09, POLL-09S, D-14 안건 11, D-17 안건 10).
// - 길찾기(올리브 면 하나): 확정 식당 이름과 좌표(세션 값)로 네이버 지도. 이름을 못 맞췄으면 카카오맵 링크.
//   방문 후보는 확정 함수가 참여자 전원에게 이미 만들었다(AC-POLL-5). 길찾기의 저장 요청은 같은 날 같은 곳이라 겹치지 않는다.
// - 결과 공유(테두리): 공유 시트(P3 ResultShareSheet, 누른 뒤 지연 로딩). 시트 안에서만 카카오톡이 올리브.
import { ExternalLink, Share2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { pollCopy as copy } from "@/copy/poll";
import type { CategorySlug } from "@/features/place/categories";
import { startDirections } from "@/features/place/directions-flow";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { PollRoom } from "./model";
import { StickyActions, buttonClass } from "./parts";
import type { CandidatePlace } from "./use-candidate-places";

const ResultShareSheet = lazy(() =>
  import("@/features/poll/share/result-share-sheet").then((m) => ({
    default: m.ResultShareSheet,
  })),
);

export function ResultActions({
  room,
  place,
  winnerVotes,
  category,
}: {
  room: PollRoom;
  place: CandidatePlace;
  winnerVotes: number;
  category: CategorySlug | null;
}) {
  const online = useOnlineStatus();
  const [share, setShare] = useState<{ open: boolean } | null>(null);
  const [opening, setOpening] = useState(false);
  const meal = room.poll.kind === "lunch" ? "lunch" : "dinner";

  return (
    <StickyActions>
      <div className="flex gap-2">
        {place.status === "resolved" ? (
          <button
            type="button"
            aria-disabled={opening || undefined}
            onClick={() => {
              if (opening) return;
              setOpening(true);
              void startDirections({
                placeId: place.placeId,
                placeUrl: place.placeUrl,
                name: place.name,
                position: place.position,
                origin: null,
                meal,
                source: "poll",
                signedIn: true,
                online,
              }).finally(() => setOpening(false));
            }}
            className={cn(buttonClass("primary"), "flex-1")}
          >
            {copy.actions.directions}
          </button>
        ) : (
          <a
            href={place.placeUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonClass("primary"), "flex-1")}
          >
            {copy.candidate.kakaoMap}
            <ExternalLink aria-hidden strokeWidth={1.5} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setShare({ open: true })}
          aria-haspopup="dialog"
          className={buttonClass("secondary")}
        >
          <Share2 aria-hidden strokeWidth={1.5} />
          {copy.actions.shareResult}
        </button>
      </div>
      {share ? (
        <Suspense fallback={null}>
          <ResultShareSheet
            open={share.open}
            onOpenChange={(open) => setShare({ open })}
            code={room.poll.code}
            title={room.poll.title}
            kind={room.poll.kind}
            placeId={room.poll.winnerPlaceId ?? place.placeId}
            placeName={place.status === "resolved" ? place.name : null}
            category={category}
            votes={winnerVotes}
            voters={room.members.length}
          />
        </Suspense>
      ) : null}
    </StickyActions>
  );
}
