// 이벤트 타입 맵이 PRD 10.2절 표와 이름, 속성 이름까지 같은지 (T6.29). PRD를 고치면 이 테스트가 코드와 어긋남을 알린다.
// 6단계 이벤트 7종은 실제 화면이 쓰는 속성 생성 함수를 거쳐 금지 키나 자유 글 없이 그대로 나가는지도 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { promptSource } from "@/features/feedback/band-model";
import { feedbackSubmittedProps } from "@/features/feedback/review-draft";
import { reportEventType, waitEventLevel } from "@/features/report/flow";
import {
  sanitizeEventProperties,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from "./events";

type Props<N extends AnalyticsEventName> = keyof AnalyticsEventMap[N] & string;

/** 타입 맵의 속성 이름(런타임 목록). 아래 타입 검사가 빠진 속성과 없는 속성을 모두 막는다 */
const EVENT_PROPS = {
  onboarding_step_completed: ["step", "skipped"],
  recommendation_shown: [
    "meal",
    "origin",
    "algo_version",
    "place_ids",
    "menu_cards",
  ],
  recommendation_reshuffled: ["count_in_session"],
  card_swiped: ["position"],
  directions_clicked: ["place_id", "source", "app_or_web"],
  feedback_submitted: [
    "rating",
    "stage",
    "has_price",
    "tag_count",
    "has_review",
  ],
  poll_created: ["kind", "candidate_count", "quick"],
  poll_link_shared: ["channel"],
  poll_invite_opened: ["in_app_browser", "logged_in"],
  poll_voted: ["is_first_vote"],
  poll_closed: ["reason", "participant_count"],
  party_searched: ["headcount", "budget", "room", "alcohol", "result_count"],
  report_submitted: ["type"],
  just_pick_clicked: ["meal", "picked_place_id"],
  wait_reported: ["place_id", "level"],
  deal_reported: ["place_id", "type"],
  deal_viewed: ["place_id", "source", "screen"],
  deal_checked: ["deal_id", "answer"],
  poll_result_shared: ["channel"],
  login_started: ["provider", "in_app_browser"],
  login_completed: ["provider", "in_app_browser"],
  feedback_prompt_shown: ["visit_source"],
  favorite_added: ["place_id", "source"],
  poll_candidate_added: ["place_id", "source"],
  place_names_resolved: ["screen", "total", "unresolved", "extra_calls"],
  menu_reported: ["place_id", "source", "picked"],
} as const satisfies { [N in AnalyticsEventName]: readonly Props<N>[] };

type Missing = {
  [N in AnalyticsEventName]: Exclude<Props<N>, (typeof EVENT_PROPS)[N][number]>;
}[AnalyticsEventName];

/** PRD 10.2절 표 → 이벤트 이름 → 속성 이름 목록(괄호 안 값 설명은 뺀다) */
function prdEvents(): Map<string, string[]> {
  const md = readFileSync(join(process.cwd(), "docs/prd.md"), "utf8");
  const start = md.indexOf("### 10.2 분석 이벤트");
  const end = md.indexOf("\n### ", start + 1);
  const section = md.slice(start, end === -1 ? undefined : end);
  const out = new Map<string, string[]>();
  for (const line of section.split("\n")) {
    if (!line.startsWith("| `")) continue;
    const [, nameCell = "", propCell = ""] = line.split("|");
    let props = propCell;
    // 괄호 설명(쉼표 포함)을 안쪽부터 지운다
    while (/\([^()]*\)/.test(props)) props = props.replace(/\([^()]*\)/g, "");
    const list = props
      .split(",")
      .map((p) => p.trim())
      .filter((p) => /^[a-z_]+$/.test(p));
    for (const m of nameCell.matchAll(/`([a-z_]+)`/g)) {
      if (m[1]) out.set(m[1], list);
    }
  }
  return out;
}

describe("분석 이벤트가 PRD 10.2절과 같다 (T6.29)", () => {
  it("타입 맵의 속성 목록이 빠짐없다", () => {
    expectTypeOf<Missing>().toEqualTypeOf<never>();
  });

  it("이벤트 이름과 속성 이름이 PRD 표와 같다", () => {
    const prd = prdEvents();
    expect([...prd.keys()].sort()).toEqual(Object.keys(EVENT_PROPS).sort());
    for (const [name, props] of Object.entries(EVENT_PROPS)) {
      expect({ name, props: [...props].sort() }).toEqual({
        name,
        props: [...(prd.get(name) ?? [])].sort(),
      });
    }
  });
});

describe("6단계 이벤트 7종의 실제 속성", () => {
  const passes = (props: Record<string, unknown>) => {
    const r = sanitizeEventProperties(props);
    expect(r.dropped).toEqual([]);
    expect(r.properties).toEqual(props);
  };

  it("feedback_prompt_shown: visit_source는 방문 출처 그대로", () => {
    for (const source of ["rec", "poll", "map", "detail"] as const) {
      const props: AnalyticsEventMap["feedback_prompt_shown"] = {
        visit_source: promptSource({ source } as Parameters<
          typeof promptSource
        >[0]),
      };
      expect(props.visit_source).toBe(source);
      passes(props);
    }
  });

  it("feedback_submitted: 글 내용 대신 여부와 개수만", () => {
    const tap = feedbackSubmittedProps("up", null);
    expect(tap).toEqual({
      rating: "up",
      stage: "tap",
      has_price: false,
      tag_count: 0,
      has_review: false,
    });
    passes(tap);
    const detail = feedbackSubmittedProps("down", {
      rating: "down",
      priceKrw: 9000,
      tags: ["solo_ok", "quiet"],
      body: "비공개로 쓴 글",
      isPublic: false,
    } as unknown as Parameters<typeof feedbackSubmittedProps>[1]);
    expect(detail).toEqual({
      rating: "down",
      stage: "detail",
      has_price: true,
      tag_count: 2,
      has_review: true,
    });
    expect(JSON.stringify(detail)).not.toContain("비공개로 쓴 글");
    passes(detail);
  });

  it("report_submitted: type은 대상 종류", () => {
    expect(reportEventType("review")).toBe("review");
    expect(reportEventType("deal")).toBe("deal");
    expect(reportEventType("closed")).toBe("place_closed");
    expect(reportEventType("price")).toBe("place_price");
    expect(reportEventType("info")).toBe("place_info");
    passes({ type: reportEventType("info") });
  });

  it("wait_reported: 바로 입장은 none, 나머지는 단계 이름 (PRD 10.2 값 표기)", () => {
    expect(waitEventLevel("walkIn")).toBe("none");
    expect(waitEventLevel("short")).toBe("short");
    expect(waitEventLevel("long")).toBe("long");
    passes({ place_id: "12345", level: waitEventLevel("walkIn") });
  });

  it("deal_reported, deal_viewed, deal_checked: id와 종류만", () => {
    passes({ place_id: "12345", type: "lunch_special" });
    passes({ place_id: "12345", source: "user", screen: "detail" });
    passes({
      deal_id: "6f1c1f9e-0000-4000-8000-000000000000",
      answer: "still",
    });
  });
});
