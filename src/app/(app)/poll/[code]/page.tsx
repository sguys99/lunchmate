// 투표방 /poll/<code> (T7.15~T7.19, T7.22, POLL-05~13). 비로그인은 미리보기, 참여자는 투표방, 같은 주소(D-14).
// 첫 렌더에 poll_preview(득표 없음)를 서버에서 읽고, 참여와 투표방은 브라우저가 이어 받는다(poll-entry.tsx).
// 플래그: 투표 진입점(flags.pollEntry)이 켜질 때(T7.35) 열린다. 그 전에는 디자인 랩이 켜진 환경(개발)에서만 보인다.
// 링크 미리보기 메타(OG)는 식당 이름 없이 제목, 후보 수, 마감 시각(POLL-04, T7.14, share/metadata.ts).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadPollPage } from "@/features/poll/room/load";
import { RoomColumn, RoomSkeleton } from "@/features/poll/room/parts";
import { PollEntry } from "@/features/poll/room/poll-entry";
import { pollInviteMetadata } from "@/features/poll/share/metadata";
import { isEnabled } from "@/lib/flags";

type Params = Promise<{ code: string }>;

export const generateMetadata = ({ params }: { params: Params }) =>
  params.then((p) => pollInviteMetadata(p.code));

async function Room({ params }: { params: Params }) {
  const { code } = await params;
  const data = await loadPollPage(code);
  return <PollEntry code={code} data={data} />;
}

export default function PollRoomPage({ params }: { params: Params }) {
  if (!isEnabled("pollEntry") && !isEnabled("designLab")) notFound();
  return (
    <Suspense
      fallback={
        <RoomColumn>
          <RoomSkeleton />
        </RoomColumn>
      }
    >
      <Room params={params} />
    </Suspense>
  );
}
