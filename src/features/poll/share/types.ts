// 투표 공유 모듈 계약 (P3, T7.13, T7.20). 투표방(P1)과 만들기 시트(P2)는 이 타입으로 지연 import해 부른다.
import type { CategorySlug } from "@/features/place/categories";

export type PollKind = "lunch" | "dinner" | "party";

/** 초대 공유 채널. PRD 10.2 poll_link_shared.channel 과 같다 */
export type InviteChannel = "kakao" | "share" | "copy";

export type ShareInviteInput = {
  /** 초대 코드(투표방 주소 /poll/[code]) */
  code: string;
  title: string;
  /** 마감 시각 ISO(UTC). 문구는 KST로 만든다 */
  closesAt: string;
  candidateCount: number;
  kind: PollKind;
  channel: InviteChannel;
};

/** 공유 결과. cancelled는 사용자가 OS 공유 창을 닫은 경우(오류 아님) */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type ResultShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  title: string;
  kind: PollKind;
  /** 확정 식당. 이름은 세션의 실시간 이름(T5.12a)이고 저장하지 않는다. 못 찾으면 null */
  placeId: string;
  placeName: string | null;
  category: CategorySlug | null;
  /** 1위 득표 수 */
  votes: number;
  /** 참여 인원 */
  voters: number;
};

/** 서버 OG 종류: 초대 링크 / 결과 공유 링크 */
export type OgImageKind = "invite" | "result";
