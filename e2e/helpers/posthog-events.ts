// PostHog로 가는 이벤트를 가로채 읽는다(E2E에서 분석 이벤트 속성 확인용). 실제 PostHog에는 보내지 않는다.
// posthog-js는 묶어서(batch) 보내고 gzip-js 압축을 쓸 수 있어 압축을 풀어 본다. 형식을 모르면 건너뛴다.
import { gunzipSync } from "node:zlib";
import type { BrowserContext } from "@playwright/test";

export type CapturedEvent = {
  event: string;
  properties: Record<string, unknown>;
};

function parseBody(buf: Buffer | null): CapturedEvent[] {
  if (!buf || buf.length === 0) return [];
  const texts: string[] = [];
  try {
    texts.push(gunzipSync(buf).toString("utf8"));
  } catch {
    const raw = buf.toString("utf8");
    texts.push(raw);
    // data=<base64> 폼 형식
    const m = /(?:^|&)data=([^&]+)/.exec(raw);
    if (m) {
      try {
        texts.push(Buffer.from(decodeURIComponent(m[1]!), "base64").toString("utf8"));
      } catch {
        // 형식을 모르면 건너뛴다
      }
    }
  }
  for (const text of texts) {
    try {
      const json: unknown = JSON.parse(text);
      const list = Array.isArray(json)
        ? json
        : json && typeof json === "object" && "batch" in json
          ? (json as { batch: unknown[] }).batch
          : [json];
      return list.filter(
        (e): e is CapturedEvent =>
          !!e && typeof e === "object" && "event" in e && "properties" in e,
      );
    } catch {
      // 다음 형식으로
    }
  }
  return [];
}

/** context의 PostHog 요청을 가로채 이벤트를 모은다. 돌려준 배열에 계속 쌓인다 */
export async function capturePostHog(
  context: BrowserContext,
): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  // posthog-js는 navigator.webdriver(자동화 브라우저)와 HeadlessChrome 사용자 에이전트를 봇으로 보고 이벤트를 버린다.
  // 사용자 에이전트는 스펙의 test.use로 바꾸고, 여기서는 webdriver 표시를 끈다.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await context.route(/posthog\.com/, async (route) => {
    const req = route.request();
    if (req.method() === "POST") events.push(...parseBody(req.postDataBuffer()));
    // 설정 요청(/flags, /decide)은 빈 값으로, 이벤트는 받은 것처럼
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  return events;
}
