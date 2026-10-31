// 나 탭 시안 쿼리 (T6.2): /design-lab/me/<a|b|c>?...
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약). empty는 첫 방문(기록 0건)
//   auth=off        로그인 꺼짐 둘러보기(AUTH-07). 기록 대신 로그인 안내 + 화면 설정
//   names=fail      카카오 이름 해석이 모두 실패한 경우(T5.12a 3단계). 기본 ready에도 미해결 줄이 1~2개 섞여 있다
//   view=...        하위 화면. A: history(기본)|places|reviews|settings, B: main(기본)|favorites|blocklist|reviews,
//                   C: main(기본)|history|favorites|blocklist|reviews
//   more=on         긴 목록의 "더 보기"를 누른 상태
//   day=1~31        B 달력에서 고른 날(기본 가장 최근 기록일)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const ME_VIEWS = [
  "main",
  "history",
  "places",
  "favorites",
  "blocklist",
  "reviews",
  "settings",
] as const;

export type MeView = (typeof ME_VIEWS)[number];

export type MeParams = {
  state: DesignState;
  authOff: boolean;
  namesFail: boolean;
  view: MeView;
  more: boolean;
  day: number | null;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function isView(value: string | undefined): value is MeView {
  return (ME_VIEWS as readonly string[]).includes(value ?? "");
}

export function parseMeParams(raw: Raw): MeParams {
  const view = first(raw, "view");
  const day = Number(first(raw, "day"));
  return {
    state: parseDesignState(raw),
    authOff: first(raw, "auth") === "off",
    namesFail: first(raw, "names") === "fail",
    view: isView(view) ? view : "main",
    more: first(raw, "more") === "on",
    day: Number.isInteger(day) && day >= 1 && day <= 31 ? day : null,
  };
}
