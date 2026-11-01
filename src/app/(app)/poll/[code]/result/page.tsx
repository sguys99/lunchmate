// 결과 공유 링크 /poll/<code>/result (T7.19, T7.20, POLL-09S, D-17 안건 7). 카카오 스크랩 캐시 때문에 초대 주소와 나눴다.
// - 참여자는 투표방(결과 화면)으로 보낸다. 그 밖에는 식당 이름 없이 결과 안내와 득표 수만(T0.16-4).
// - 링크 미리보기 메타도 결과용(share/metadata.ts pollResultMetadata).
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { loadPollPage } from "@/features/poll/room/load";
import { RoomColumn, RoomSkeleton } from "@/features/poll/room/parts";
import { PublicResult } from "@/features/poll/room/public-result";
import { pollRoomHref } from "@/features/poll/routes";
import { pollResultMetadata } from "@/features/poll/share/metadata";
import { loadPollOg } from "@/features/poll/share/og-data";
import { isEnabled } from "@/lib/flags";

type Params = Promise<{ code: string }>;

export const generateMetadata = ({ params }: { params: Params }) =>
  params.then((p) => pollResultMetadata(p.code));

async function Result({ params }: { params: Params }) {
  const { code } = await params;
  const [data, og] = await Promise.all([loadPollPage(code), loadPollOg(code)]);
  const p = data.preview;
  if (p && p.status !== "expired" && p.isMember) redirect(pollRoomHref(code));
  return <PublicResult code={code} data={data} og={og} />;
}

export default function PollResultPage({ params }: { params: Params }) {
  if (!isEnabled("pollEntry") && !isEnabled("designLab")) notFound();
  return (
    <Suspense
      fallback={
        <RoomColumn>
          <RoomSkeleton />
        </RoomColumn>
      }
    >
      <Result params={params} />
    </Suspense>
  );
}
