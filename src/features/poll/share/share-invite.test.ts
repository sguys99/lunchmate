import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
const toastMock = Object.assign(vi.fn(), {
  success: vi.fn(),
  error: vi.fn(),
});
vi.mock("@/lib/analytics", () => ({ track: trackMock }));
vi.mock("@/components/ui/lazy-toaster", () => ({ toast: toastMock }));
const sendDefault = vi.fn();
const api = { sendDefault, uploadImage: vi.fn() };
const loadKakaoShare = vi.fn(async () => api);
const peekKakaoShare = vi.fn((): typeof api | undefined => undefined);
vi.mock("@/lib/kakao/share-sdk", () => ({
  loadKakaoShare,
  peekKakaoShare,
  preloadKakaoShare: vi.fn(),
}));
const reportHandledError = vi.fn();
vi.mock("@/lib/errors/report-handled", () => ({ reportHandledError }));

const { inviteDeadline, shareInvite } = await import("./share-invite");

const input = {
  code: "4vdvm3887pr7",
  title: "목요일 점심",
  closesAt: "2026-11-05T03:30:00Z",
  candidateCount: 3,
  kind: "lunch" as const,
};

describe("inviteDeadline", () => {
  it("KST 기준 오늘이면 시각만, 아니면 날짜를 붙인다", () => {
    const now = new Date("2026-11-05T02:00:00Z");
    expect(inviteDeadline("2026-11-05T03:30:00Z", now)).toBe("12:30");
    expect(inviteDeadline("2026-11-06T09:00:00Z", now)).toBe("11월 6일 18:00");
  });
});

describe("shareInvite (T7.13, POLL-03)", () => {
  beforeEach(() => {
    trackMock.mockClear();
    sendDefault.mockReset();
    loadKakaoShare.mockClear();
    peekKakaoShare.mockReset();
    reportHandledError.mockClear();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("링크 복사: 투표방 절대 주소, 토스트, poll_link_shared copy", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareInvite({ ...input, channel: "copy" })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/poll\/4vdvm3887pr7$/),
    );
    expect(trackMock).toHaveBeenCalledWith({
      name: "poll_link_shared",
      properties: { channel: "copy" },
    });
  });

  it("Web Share를 닫으면 cancelled, 이벤트 없음", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw new DOMException("x", "AbortError");
      }),
    });
    expect(await shareInvite({ ...input, channel: "share" })).toBe("cancelled");
    expect(trackMock).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("카카오톡: 피드 템플릿, 식당 이름 없는 OG 이미지, 버튼 투표하러 가기", async () => {
    expect(await shareInvite({ ...input, channel: "kakao" })).toBe("shared");
    const tpl = sendDefault.mock.calls[0]![0];
    expect(tpl.objectType).toBe("feed");
    expect(tpl.content.title).toBe("목요일 점심 투표");
    expect(tpl.content.imageUrl).toMatch(
      /\/api\/og\/poll\/4vdvm3887pr7\?img=invite&v=/,
    );
    expect(tpl.buttons[0].title).toBe("투표하러 가기");
    expect(trackMock).toHaveBeenCalledWith({
      name: "poll_link_shared",
      properties: { channel: "kakao" },
    });
  });

  it("SDK를 미리 받아 두었으면 await 없이(탭 안에서) sendDefault를 부른다 (T9.10)", async () => {
    peekKakaoShare.mockReturnValue(api);
    const p = shareInvite({ ...input, channel: "kakao" });
    // 첫 마이크로태스크 전에 이미 불렸어야 한다
    expect(sendDefault).toHaveBeenCalledTimes(1);
    expect(loadKakaoShare).not.toHaveBeenCalled();
    expect(await p).toBe("shared");
  });

  it("카카오가 실패하면 Sentry에 남기고 Web Share로 대신 보낸다, 토스트 없음 (T9.10)", async () => {
    sendDefault.mockImplementation(() => {
      throw new KakaoLikeError("bad template https://x.test/poll/abc");
    });
    const share = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { share });
    expect(await shareInvite({ ...input, channel: "kakao" })).toBe("shared");
    expect(reportHandledError).toHaveBeenCalledWith(
      "share.invite.kakao",
      expect.any(KakaoLikeError),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/\/poll\/4vdvm3887pr7$/),
      }),
    );
    expect(trackMock).toHaveBeenCalledWith({
      name: "poll_link_shared",
      properties: { channel: "share" },
    });
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("SDK 로딩이 실패하고 Web Share도 없으면 failed만 돌려준다(안내는 부르는 쪽이 한 번)", async () => {
    loadKakaoShare.mockRejectedValueOnce(new Error("load"));
    vi.stubGlobal("navigator", {});
    expect(await shareInvite({ ...input, channel: "kakao" })).toBe("failed");
    expect(reportHandledError).toHaveBeenCalledTimes(1);
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("대체 공유도 막히면 failed, 둘 다 Sentry에 남고 토스트는 없다", async () => {
    sendDefault.mockImplementation(() => {
      throw new Error("x");
    });
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw new DOMException("no activation", "NotAllowedError");
      }),
    });
    expect(await shareInvite({ ...input, channel: "kakao" })).toBe("failed");
    expect(reportHandledError).toHaveBeenCalledTimes(2);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("대체 공유 창을 닫으면 cancelled, 오류 안내 없음", async () => {
    sendDefault.mockImplementation(() => {
      throw new Error("x");
    });
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw new DOMException("x", "AbortError");
      }),
    });
    expect(await shareInvite({ ...input, channel: "kakao" })).toBe("cancelled");
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});

class KakaoLikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KAKAO_TEMPLATE";
  }
}
