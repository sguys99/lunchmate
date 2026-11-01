// 투표 묶음 레이아웃 (T7.11). 투표 탭, 회식 모드(/poll/party), 투표방(/poll/<code>)에서 openPollCreate로 여는
// 투표 만들기 시트 자리를 한 번만 둔다. 자리와 시트 본체는 모두 비동기로 받는다(host-slot.tsx, host.tsx).
import type { ReactNode } from "react";
import { PollCreateHostSlot } from "@/features/poll/create/host-slot";

export default function PollLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PollCreateHostSlot />
    </>
  );
}
