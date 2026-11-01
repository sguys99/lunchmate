// 투표 만들기 시안 쿼리 (T7.2): /design-lab/poll-create/<a|b|c>?...
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약)
//     loading  시트를 열었고 후보(오늘 추천, 즐겨찾기) 이름을 불러오는 중
//     empty    넣을 후보가 없음(오늘 추천이 비었고 즐겨찾기, 최근 기록도 없음)
//     error    만들기 실패(fail=save, 고른 값은 남음) / 하루 10개 한도(fail=limit, MOD-05) / 카카오톡 공유 실패(fail=share)
//     offline  만들 수 없음(만들기 버튼 꺼짐, 고른 값은 화면에 남음)
//   flow=home|compose|pick|share|edit  캡처용 시작 단계
//     home     홈에 진입점만 보이는 상태(기본)
//     compose  만들기 시트를 연 상태(C는 만든 직후 시트)
//     pick     A: 후보 더 넣기 목록을 펼친 상태
//     share    만든 뒤 보내기 단계
//     edit     C: 항목 줄 하나를 펼쳐 고치는 중(field=deadline|title|candidates|mode)
//   step=1|2|3  B 단계(compose일 때). 1 후보, 2 마감과 방식, 3 보내기
//   entry=home|detail|party  어디서 열었나
//     home    홈 "친구랑 정하기"(빠른 투표, POLL-02: 오늘 카드 3장이 후보)
//     detail  식당 상세 더 보기 "투표에 추가"(그 한 곳이 후보, 1곳 더 넣어야 함)
//     party   회식 모드 "이 후보로 투표 만들기"(PARTY-05: 후보 5곳, 유형 회식, 저녁)
//   clock=noon|late  목업 현재 시각. noon 11:05(기본), late 11:45(점심 고정 시각 11:30이 지남)
//   field=deadline|title|candidates|mode  C의 edit 대상
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

const FLOWS = ["home", "compose", "pick", "share", "edit"] as const;
export type PollCreateFlow = (typeof FLOWS)[number];

export const ENTRIES = ["home", "detail", "party"] as const;
export type PollEntry = (typeof ENTRIES)[number];

const FIELDS = ["deadline", "title", "candidates", "mode"] as const;
export type PollField = (typeof FIELDS)[number];

export type PollCreateParams = {
  state: DesignState;
  fail: "save" | "limit" | "share";
  flow: PollCreateFlow;
  step: 1 | 2 | 3;
  entry: PollEntry;
  clock: "noon" | "late";
  field: PollField;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function oneOf<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value !== undefined && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parsePollCreateParams(raw: Raw): PollCreateParams {
  const step = Number(first(raw, "step"));
  const state = parseDesignState(raw);
  const flow = oneOf(FLOWS, first(raw, "flow"), "home");
  return {
    state,
    fail: oneOf(["save", "limit", "share"], first(raw, "fail"), "save"),
    // 4상태는 시트 안에서 보이므로 flow가 없으면 시트를 연 상태로 시작한다(공유 실패는 보내기 단계)
    flow:
      flow === "home" && state !== "ready"
        ? first(raw, "fail") === "share"
          ? "share"
          : "compose"
        : flow,
    step: step === 2 || step === 3 ? step : 1,
    entry: oneOf(ENTRIES, first(raw, "entry"), "home"),
    clock: first(raw, "clock") === "late" ? "late" : "noon",
    field: oneOf(FIELDS, first(raw, "field"), "deadline"),
  };
}
