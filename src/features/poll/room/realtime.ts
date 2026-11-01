// 투표방 실시간 득표 구독 (T7.16, AC-POLL-1, D-14 안건 10). 투표방 화면이 동적 import로만 받는다(홈 번들 밖).
// - 서버 쓰기 함수가 realtime.send로 비공개 채널 'poll:<id>'에 집계(poll_state)만 보낸다. 개별 표 행은 내보내지 않는다(무기명).
// - 받는 권한은 realtime.messages의 select 정책(참여자만)이 정한다. 그래서 private: true 채널 + 세션 토큰(setAuth)으로 구독한다.
// - 출처 (2026-11-01 확인): https://supabase.com/docs/guides/realtime/broadcast ("Broadcast from the database"),
//   https://supabase.com/docs/guides/realtime/authorization (private 채널, setAuth)
// - 세션은 @supabase/ssr 쿠키(httpOnly 아님)를 브라우저 클라이언트가 읽는다. publishable 키만 쓴다.
import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/lib/supabase/types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let client: BrowserClient | null = null;

function browserClient(): BrowserClient | null {
  if (client) return client;
  const env = clientEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return null;
  client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}

export type LiveState = "connecting" | "live" | "lost";

export type PollSubscription = {
  /** 끊긴 채널을 닫고 다시 구독한다("다시 연결") */
  reconnect: () => void;
  close: () => void;
};

/**
 * 'poll:<pollId>' 비공개 채널을 구독한다. 끊기면 onLive("lost")를 부르고 3초, 6초, 12초 간격(최대 30초)으로 다시 붙는다.
 * 연결이 없으면(키 없음) 바로 lost로 알린다. 화면은 lost 동안 get_poll을 짧은 간격으로 다시 읽는다.
 */
export function subscribePoll(
  pollId: string,
  handlers: {
    onState: (payload: unknown) => void;
    onLive: (s: LiveState) => void;
  },
): PollSubscription {
  const supabase = browserClient();
  if (!supabase) {
    handlers.onLive("lost");
    return { reconnect: () => undefined, close: () => undefined };
  }
  let closed = false;
  let channel: ReturnType<BrowserClient["channel"]> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const scheduleRetry = () => {
    if (closed || retryTimer) return;
    const delay = Math.min(30_000, 3_000 * 2 ** attempt);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void open();
    }, delay);
  };

  const open = async () => {
    if (closed) return;
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    handlers.onLive("connecting");
    try {
      await supabase.realtime.setAuth();
    } catch {
      // 토큰을 못 읽으면 구독이 거절되어 아래 상태 콜백이 lost로 알린다
    }
    if (closed) return;
    const ch = supabase
      .channel(`poll:${pollId}`, { config: { private: true } })
      .on("broadcast", { event: "poll_state" }, (msg) =>
        handlers.onState(msg.payload),
      );
    channel = ch;
    ch.subscribe((status) => {
      if (closed || channel !== ch) return;
      if (status === "SUBSCRIBED") {
        attempt = 0;
        handlers.onLive("live");
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        handlers.onLive("lost");
        scheduleRetry();
      }
    });
  };

  void open();

  return {
    reconnect: () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      attempt = 0;
      void open();
    },
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    },
  };
}
