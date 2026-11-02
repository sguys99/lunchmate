// 초대 공유 (T7.13, POLL-03, POLL-04, AC-POLL-4). 투표방(P1)과 만들기 시트(P2)의 보내기 버튼이 지연 import로 부른다.
// - kakao: 카카오톡 피드 공유. 이미지는 서버 OG(A, /api/og/poll/<code>?img=invite)이고 식당 이름이 없다(T0.16-4).
//   메시지 제목과 설명도 메타와 같은 말(copy-guide 4.13). 링크 도메인은 카카오 콘솔 "웹 도메인"에 등록돼 있어야 한다.
//   SDK를 미리 받아 두었으면(preloadKakaoShare) await 없이 sendDefault를 불러 탭 안에서 카카오톡을 연다(T9.10).
//   실패하면 오류 이름과 메시지만 Sentry에 남기고, Web Share가 있으면 OS 공유 창(카카오톡 포함)으로 대신 보낸다.
//   그래도 못 보내면 failed만 돌려준다. 안내는 부르는 쪽이 한 번만 한다(만들기 시트의 안쪽 알림, 토스트와 겹치지 않게).
// - share: Web Share API(text + url). 사용자가 창을 닫으면 cancelled(오류 아님, 안내 없음).
// - copy: 링크 복사 + 토스트.
// 성공하면(cancelled 제외) poll_link_shared를 보낸다. 방장이 처음 보낸 시각 기록(mark_poll_shared)은 부르는 쪽이 결과를 보고 한다.
import { toast } from "@/components/ui/lazy-toaster";
import { shareCopy } from "@/copy/share";
import { pollRoomHref } from "@/features/poll/routes";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/env/site";
import { reportHandledError } from "@/lib/errors/report-handled";
import {
  loadKakaoShare,
  peekKakaoShare,
  type KakaoFeedTemplate,
} from "@/lib/kakao/share-sdk";
import { OG_ART_VERSION, pollOgImagePath, shortHash } from "./og-url";
import type { InviteChannel, ShareInviteInput, ShareOutcome } from "./types";

export { preloadKakaoShare } from "@/lib/kakao/share-sdk";

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

function inviteTemplate(
  input: ShareInviteInput,
  url: string,
  deadline: string,
): KakaoFeedTemplate {
  const link = { mobileWebUrl: url, webUrl: url };
  return {
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
  };
}

/** Web Share. 안내(토스트)는 하지 않고 결과만 돌려준다. 닫으면 cancelled */
async function webShare(
  input: ShareInviteInput,
  url: string,
  deadline: string,
): Promise<ShareOutcome> {
  try {
    await navigator.share({
      title: shareCopy.meta.inviteTitle(input.title),
      text: t.shareText(input.title, deadline),
      url,
    });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError")
      return "cancelled";
    reportHandledError("share.invite.webshare", e);
    return "failed";
  }
}

/** 카카오톡으로 보낸다. 미리 받아 둔 SDK면 첫 await 전에(탭 안에서) sendDefault를 부른다 */
async function kakaoShare(
  input: ShareInviteInput,
  url: string,
  deadline: string,
): Promise<{ outcome: ShareOutcome; channel: InviteChannel }> {
  try {
    const template = inviteTemplate(input, url, deadline);
    const kakao = peekKakaoShare() ?? (await loadKakaoShare());
    kakao.sendDefault(template);
    return { outcome: "shared", channel: "kakao" };
  } catch (e) {
    reportHandledError("share.invite.kakao", e);
  }
  if (typeof navigator.share === "function")
    return { outcome: await webShare(input, url, deadline), channel: "share" };
  return { outcome: "failed", channel: "kakao" };
}

/**
 * 초대 링크를 보낸다. copy와 share 실패는 여기서 토스트로 알리고,
 * kakao 실패(대체 공유까지 실패)는 안내 없이 failed만 돌려준다(부르는 쪽이 한 번 알린다).
 */
export async function shareInvite(
  input: ShareInviteInput,
): Promise<ShareOutcome> {
  const url = absoluteUrl(pollRoomHref(input.code));
  const deadline = inviteDeadline(input.closesAt);
  let outcome: ShareOutcome;
  let channel: InviteChannel = input.channel;

  if (input.channel === "copy") {
    outcome = await copyLink(url);
  } else if (input.channel === "share") {
    if (typeof navigator.share !== "function") {
      // 지원하지 않으면 부르는 쪽이 버튼을 숨긴다(D-15 안건 12). 여기까지 오면 복사로 대신한다
      outcome = await copyLink(url);
    } else {
      outcome = await webShare(input, url, deadline);
      if (outcome === "failed") void toast.error(t.shareFailed);
    }
  } else {
    ({ outcome, channel } = await kakaoShare(input, url, deadline));
  }

  if (outcome === "shared" || outcome === "copied") {
    track({ name: "poll_link_shared", properties: { channel } });
  }
  return outcome;
}
