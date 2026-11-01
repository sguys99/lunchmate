// PostHog 지연 초기화. 이 파일은 posthog-js를 정적으로 import하지 않는다.
// 초기화 때만 import("posthog-js")로 청크(약 104KB gzip)를 받으므로 홈 초기 번들 증가는 0이다(tasks 2.4절).
// 이벤트 전송은 track.ts의 track()만 쓴다. 초기화 전에 들어온 이벤트는 작은 큐에 모았다가 초기화 후 보낸다(T2.20).
// 초기화 옵션과 전송 직전 필터(posthog-config.ts)도 posthog-js와 함께 그때 받는다. 홈 첫 로드에는 큐만 남는다(T8.11).
import type { Properties } from "posthog-js";

type PostHogClient = typeof import("posthog-js").default;

let loading: Promise<PostHogClient | null> | undefined;
let client: PostHogClient | undefined;

type QueuedCapture = { event: string; properties: Properties };
/** 초기화 전 이벤트 큐 상한. 키가 없어 초기화가 영영 안 되는 환경에서 메모리가 늘지 않게 막는다. */
export const MAX_QUEUED_EVENTS = 50;
const queue: QueuedCapture[] = [];

/** 초기화됐으면 바로 보내고, 아니면 큐에 넣는다. 속성 정리는 호출자(track)가 끝낸 상태여야 한다. */
export function captureOrQueue(event: string, properties: Properties): void {
  if (client) {
    client.capture(event, properties);
    return;
  }
  if (queue.length >= MAX_QUEUED_EVENTS) queue.shift();
  queue.push({ event, properties });
}

function flushQueue(posthog: PostHogClient): void {
  for (const item of queue.splice(0)) {
    posthog.capture(item.event, item.properties);
  }
}

/** 테스트 전용. 모듈 상태를 처음으로 되돌린다. */
export function resetPostHogForTest(): void {
  loading = undefined;
  client = undefined;
  queue.length = 0;
}

/** 키가 없으면 null을 돌려주고 아무것도 로드하지 않는다. 여러 번 불러도 한 번만 초기화한다. */
export function initPostHog(
  key: string | undefined,
  host: string | undefined,
): Promise<PostHogClient | null> {
  if (!key) return Promise.resolve(null);
  loading ??= Promise.all([
    import("posthog-js"),
    import("./posthog-config"),
  ]).then(([{ default: posthog }, { posthogConfig }]) => {
    posthog.init(key, posthogConfig(host));
    client = posthog;
    flushQueue(posthog);
    return posthog;
  });
  return loading;
}
