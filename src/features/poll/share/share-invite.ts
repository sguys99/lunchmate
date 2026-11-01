// 초대 공유 (T7.13, POLL-03, POLL-04, AC-POLL-4). 투표방(P1)과 만들기 시트(P2)의 보내기 버튼이 지연 import로 부른다.
// - kakao: 카카오톡 피드 공유. 이미지는 서버 OG(A, /api/og/poll/<code>?img=invite)이고 식당 이름이 없다(T0.16-4).
//   메시지 제목과 설명도 메타와 같은 말(copy-guide 4.13). 링크 도메인은 카카오 콘솔 "웹 도메인"에 등록돼 있어야 한다.
// - share: Web Share API(text + url). 사용자가 창을 닫으면 cancelled(오류 아님, 안내 없음).
// - copy: 링크 복사 + 토스트.
// 성공하면(cancelled 제외) poll_link_shared를 보낸다. 방장이 처음 보낸 시각 기록(mark_poll_shared)은 부르는 쪽이 결과를 보고 한다.
import { toast } from "@/components/ui/lazy-toaster";
import { shareCopy } from "@/copy/share";
import { pollRoomHref } from "@/features/poll/routes";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/env/site";
import { OG_ART_VERSION, pollOgImagePath, shortHash } from "./og-url";
import type { ShareInviteInput, ShareOutcome } from "./types";

const t = shareCopy.invite;

/** 문구에 쓰는 마감 표기(오늘이면 시각만). 서버 og-data.formatDeadline과 같은 규칙을 브라우저 시간대와 무관하게 KST로 */
export function inviteDeadline(closesAtIso: string, now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = (d: Date) =>
    Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const at = parts(new Date(closesAtIso));
  const today = parts(now);
  const clock = `${at.hour}:${at.minute}`;
  const sameDay =
    at.year === today.year && at.month === today.month && at.day === today.day;
  return sameDay
    ? clock
    : `${shareCopy.og.deadlineDay(Number(at.month), Number(at.day))} ${clock}`;
}

async function copyLink(url: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(url);
    void toast.success(t.copied);
    return "copied";
  } catch {
    void toast.error(t.copyFailed);
    return "failed";
  }
}

export async function shareInvite(
  input: ShareInviteInput,
): Promise<ShareOutcome> {
  const url = absoluteUrl(pollRoomHref(input.code));
  const deadline = inviteDeadline(input.closesAt);
  let outcome: ShareOutcome;

  if (input.channel === "copy") {
    outcome = await copyLink(url);
  } else if (input.channel === "share") {
    if (typeof navigator.share !== "function") {
      // 지원하지 않으면 부르는 쪽이 버튼을 숨긴다(D-15 안건 12). 여기까지 오면 복사로 대신한다
      outcome = await copyLink(url);
    } else {
      try {
        await navigator.share({
          title: shareCopy.meta.inviteTitle(input.title),
          text: t.shareText(input.title, deadline),
          url,
        });
        outcome = "shared";
      } catch (e) {
        outcome =
          e instanceof DOMException && e.name === "AbortError"
            ? "cancelled"
            : "failed";
        if (outcome === "failed") void toast.error(t.shareFailed);
      }
    }
  } else {
    try {
      const { loadKakaoShare } = await import("@/lib/kakao/share-sdk");
      const kakao = await loadKakaoShare();
      const link = { mobileWebUrl: url, webUrl: url };
      kakao.sendDefault({
        objectType: "feed",
        content: {
          title: shareCopy.meta.inviteTitle(input.title),
          description: shareCopy.meta.inviteDescription(
            input.candidateCount,
            deadline,
          ),
          imageUrl: absoluteUrl(
            pollOgImagePath(
              input.code,
              "invite",
              shortHash(
                [
                  OG_ART_VERSION,
                  input.kind,
                  input.title,
                  input.closesAt,
                  input.candidateCount,
                ].join("|"),
              ),
            ),
          ),
          imageWidth: 1200,
          imageHeight: 600,
          link,
        },
        buttons: [{ title: shareCopy.kakao.inviteButton, link }],
      });
      outcome = "shared";
    } catch {
      void toast.error(t.kakaoFailed);
      outcome = "failed";
    }
  }

  if (outcome === "shared" || outcome === "copied") {
    track({ name: "poll_link_shared", properties: { channel: input.channel } });
  }
  return outcome;
}
