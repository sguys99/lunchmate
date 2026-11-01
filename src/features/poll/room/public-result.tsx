// 공개 결과 안내 (T7.19, POLL-09S, D-17 안건 7). 식당 이름 없이 "○○, 정해졌어요"와 참여 수, 1위 표 수만.
// 참여자는 페이지가 투표방으로 보낸다. 아직 진행 중이면 투표방으로 가는 주 버튼, 끝났으면 투표 탭으로.
import Link from "next/link";
import { EmptyState, StateGlyph } from "@/components/states";
import { pollCopy as copy } from "@/copy/poll";
import { shareCopy } from "@/copy/share";
import type { PollOg } from "@/features/poll/share/og-data";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { pollRoomHref, pollTabHref } from "../routes";
import type { PollPageData } from "./load";
import { buttonClass } from "@/components/ui/button-classes";
import { RoomColumn } from "./parts";
import { RoomNotice } from "./poll-room-screen";

export function PublicResult({
  code,
  data,
  og,
}: {
  code: string;
  data: PollPageData;
  og: PollOg;
}) {
  const p = data.preview;
  if (!p)
    return (
      <RoomColumn>
        <RoomNotice kind="notFound" />
      </RoomColumn>
    );
  if (p.status === "expired")
    return (
      <RoomColumn>
        <RoomNotice kind="expired" />
      </RoomColumn>
    );
  if (p.status === "canceled")
    return (
      <RoomColumn>
        <RoomNotice kind="canceled" />
      </RoomColumn>
    );

  if (p.status === "open" || p.status === "tie") {
    return (
      <RoomColumn>
        <div className="flex flex-1 flex-col justify-center py-10">
          <EmptyState
            title={copy.publicResult.stillOpen(p.title)}
            body={copy.publicResult.stillOpenBody}
            visual={<StateGlyph icon={CheckCircle2} />}
            action={{
              label: copy.actions.openRoom,
              href: pollRoomHref(code),
              variant: "primary",
            }}
            headingLevel="h1"
          />
        </div>
      </RoomColumn>
    );
  }

  const counts =
    og.state === "closed" && og.voters !== null && og.topVotes !== null
      ? shareCopy.meta.resultDescription(og.voters, og.topVotes)
      : null;
  return (
    <RoomColumn>
      <div className="flex flex-1 flex-col justify-center gap-6 py-14">
        <p className="type-caption text-muted-foreground">
          {copy.kind[p.kind]}
        </p>
        <h1 className="type-display text-balance break-keep">
          {copy.publicResult.decided(p.title)}
        </h1>
        {counts ? <p className="type-body text-foreground">{counts}</p> : null}
        <p className="type-body-sm text-muted-foreground">
          {copy.publicResult.openBody}
        </p>
        <div>
          <Link href={pollTabHref} className={cn(buttonClass("primary"))}>
            {copy.actions.toPollTab}
          </Link>
        </div>
      </div>
    </RoomColumn>
  );
}
