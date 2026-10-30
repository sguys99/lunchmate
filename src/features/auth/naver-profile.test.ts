import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanAvatarUrl,
  cleanNickname,
  fetchNaverProfile,
  NAVER_PROFILE_URL,
} from "./naver-profile";

const TOKEN = "naver-access-token-SECRET-123";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

afterEach(() => vi.restoreAllMocks());

describe("fetchNaverProfile (T4.7)", () => {
  it("성공: 닉네임과 사진만 돌려준다 (다른 필드는 읽지 않음)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        resultcode: "00",
        message: "success",
        response: {
          id: "abc",
          nickname: "  점심요정  ",
          profile_image: "http://phinf.pstatic.net/contact/x.png",
          email: "a@naver.com",
          name: "홍길동",
        },
      }),
    );
    const patch = await fetchNaverProfile(TOKEN, fetchImpl);
    expect(patch).toEqual({
      nickname: "점심요정",
      avatar_url: "https://phinf.pstatic.net/contact/x.png",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(NAVER_PROFILE_URL);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("허용 CDN이 아닌 사진은 버리고 닉네임만", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        resultcode: "00",
        response: {
          nickname: "a",
          profile_image: "https://evil.example/p.png",
        },
      }),
    );
    expect(await fetchNaverProfile(TOKEN, fetchImpl)).toEqual({
      nickname: "a",
    });
  });

  it.each([
    ["HTTP 오류", async () => jsonResponse({}, false)],
    [
      "resultcode 실패",
      async () =>
        jsonResponse({ resultcode: "024", message: "Authentication failed" }),
    ],
    ["응답 모양이 다름", async () => jsonResponse({ resultcode: "00" })],
    [
      "빈 값뿐",
      async () =>
        jsonResponse({ resultcode: "00", response: { nickname: "   " } }),
    ],
    [
      "JSON 오류",
      async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad");
        },
      }),
    ],
    [
      "네트워크 오류",
      async () => {
        throw new TypeError(`fetch failed ${TOKEN}`);
      },
    ],
  ])("%s → null, throw 안 함", async (_name, impl) => {
    const fetchImpl = vi.fn(impl);
    await expect(fetchNaverProfile(TOKEN, fetchImpl)).resolves.toBeNull();
  });

  it("토큰이 비면 호출하지 않는다", async () => {
    const fetchImpl = vi.fn();
    expect(await fetchNaverProfile("", fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("어떤 경우에도 토큰을 콘솔에 남기지 않는다", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    await fetchNaverProfile(
      TOKEN,
      vi.fn(async () => {
        throw new Error(TOKEN);
      }),
    );
    await fetchNaverProfile(
      TOKEN,
      vi.fn(async () => jsonResponse({}, false)),
    );
    await fetchNaverProfile(
      TOKEN,
      vi.fn(async () =>
        jsonResponse({ resultcode: "00", response: { nickname: "x" } }),
      ),
    );
    for (const spy of spies) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(TOKEN);
      }
    }
  });
});

describe("값 정리 (DB 제약과 같은 규칙)", () => {
  it("닉네임: 공백 제거, 20자, 비면 없음", () => {
    expect(cleanNickname(" a ")).toBe("a");
    expect(cleanNickname("가".repeat(25))).toBe("가".repeat(20));
    expect(cleanNickname(`${"가".repeat(19)} 나`)).toBe("가".repeat(19));
    expect(cleanNickname("")).toBeUndefined();
    expect(cleanNickname(3)).toBeUndefined();
  });
  it("사진: 허용 CDN의 https만", () => {
    expect(cleanAvatarUrl("https://k.kakaocdn.net/a.jpg")).toBe(
      "https://k.kakaocdn.net/a.jpg",
    );
    expect(cleanAvatarUrl("https://lh3.googleusercontent.com/a")).toBe(
      "https://lh3.googleusercontent.com/a",
    );
    expect(cleanAvatarUrl("https://pstatic.net.evil.com/a")).toBeUndefined();
    expect(cleanAvatarUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      cleanAvatarUrl(`https://a.pstatic.net/${"a".repeat(1100)}`),
    ).toBeUndefined();
  });
});
