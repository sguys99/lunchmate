// 탭 스와이프 시안 쿼리 (T9.14): /design-lab/swipe/<a|b|c>?...
//   tab=today|map|poll|me            처음 보이는 탭. 기본 today
//   state=ready|loading|empty|error|offline   지금 탭 본문의 4상태(pnpm shots --states 규약). 옆 탭으로 옮겨도 같은 상태
//   demo=drag|armed|end              캡처용 멈춘 제스처(정지 화면으로 제스처를 보이기 위해서다). 손을 대면 풀린다
//     drag   다음 탭 쪽으로 기준선의 절반쯤 민 상태(아직 놓으면 제자리)
//     armed  기준선을 넘긴 상태(놓으면 옮김)
//     end    마지막 탭(나)에서 더 밀어 버티는 상태. tab을 무시하고 me로 시작한다
import { APP_TAB_IDS, type AppTabId } from "@/components/app-shell/tabs";
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const SWIPE_DEMOS = ["none", "drag", "armed", "end"] as const;
export type SwipeDemo = (typeof SWIPE_DEMOS)[number];

export type SwipeParams = {
  state: DesignState;
  tab: AppTabId;
  demo: SwipeDemo;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parseSwipeParams(raw: Raw): SwipeParams {
  const tab = first(raw, "tab");
  const demo = first(raw, "demo");
  const parsedDemo: SwipeDemo = (SWIPE_DEMOS as readonly string[]).includes(
    demo ?? "",
  )
    ? (demo as SwipeDemo)
    : "none";
  return {
    state: parseDesignState(raw),
    tab:
      parsedDemo === "end"
        ? "me"
        : (APP_TAB_IDS as readonly string[]).includes(tab ?? "")
          ? (tab as AppTabId)
          : "today",
    demo: parsedDemo,
  };
}
