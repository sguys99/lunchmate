// 한도 수치 정합성 (T8.15, MOD-05, DEAL-04, PLACE-07, POLL). PRD 수치 = DB(마이그레이션) = 화면 문구인지 확인한다.
// DB 값을 바꾸는 새 마이그레이션을 넣으면 이 테스트가 가장 마지막 정의를 읽어 비교한다.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BETA_FEEDBACK_DAILY, betaFeedbackCopy } from "@/copy/beta";
import { DAILY_LIMITS, moderationCopy } from "@/copy/moderation";
import { pollCreateCopy } from "@/copy/poll-create";

/** PRD 정본 수치 (MOD-05, DEAL-04, T5.14 방문 20). 베타 의견 10은 D-23 안건 12(PRD 밖 베타 운영 값) */
const PRD = { reviews: 20, reports: 30, deals: 10, polls: 10, visits: 20 };
const BETA_FEEDBACK = 10;
/** 식당 메모 저장과 고침 하루 30 (T10.15, D-33. PRD 밖 운영 값) */
const PLACE_MEMOS = 30;

const dir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"));
const allSql = migrations.join("\n");

/** 가장 마지막 private.daily_quota_max 정의의 when 'x' then N */
function latestQuotaMax(): Record<string, number> {
  const bodies = allSql.split(
    "create or replace function private.daily_quota_max",
  );
  const last = bodies.at(-1)?.split("$$;")[0] ?? "";
  const out: Record<string, number> = {};
  for (const m of last.matchAll(/when '(\w+)'\s+then (\d+)/g)) {
    out[m[1] as string] = Number(m[2]);
  }
  return out;
}

describe("하루 한도: PRD = DB = 문구", () => {
  it("DB daily_quota_max가 PRD와 같다", () => {
    expect(latestQuotaMax()).toEqual({
      reviews: PRD.reviews,
      reports: PRD.reports,
      deals: PRD.deals,
      polls: PRD.polls,
      beta_feedback: BETA_FEEDBACK,
      place_memos: PLACE_MEMOS,
    });
  });

  it("베타 의견 하루 10번 문구 (T9.4)", () => {
    expect(BETA_FEEDBACK_DAILY).toBe(BETA_FEEDBACK);
    expect(betaFeedbackCopy.states.limit).toContain(`${BETA_FEEDBACK}번`);
  });

  it("방문 기록 20 (visits 트리거)", () => {
    expect(allSql).toMatch(
      /from public\.visits[\s\S]{0,120}\) >= 20 then\s+raise exception 'visits_daily_limit_exceeded'/,
    );
  });

  it("화면 숫자(DAILY_LIMITS)와 안내 문구가 같은 값을 말한다", () => {
    for (const bucket of ["reviews", "reports", "deals", "visits"] as const) {
      expect(DAILY_LIMITS[bucket]).toBe(PRD[bucket]);
      expect(moderationCopy.limits[bucket].body).toContain(
        `하루 ${PRD[bucket]}건`,
      );
    }
  });

  it("투표방 하루 10개 문구", () => {
    expect(JSON.stringify(pollCreateCopy)).toContain(`하루 ${PRD.polls}개까지`);
  });
});

describe("그 밖의 한도 (DB에서 강제)", () => {
  it("웨이팅 같은 식당 30분 1회, 되돌리기 2분 (PLACE-07)", () => {
    expect(allSql).toMatch(/w\.created_at > now\(\) - interval '30 minutes'/);
    expect(allSql).toMatch(/created_at > now\(\) - interval '2 minutes'/);
  });

  it("정보 제보 같은 식당 같은 종류 하루 1회 (PLACE-05)", () => {
    expect(allSql).toContain(
      "constraint place_reports_once_per_day unique (user_id, place_id, kind, kst_day)",
    );
  });

  it("같은 대상 신고 1회 (MOD-01, DEAL-04)", () => {
    expect(allSql).toContain(
      "constraint review_reports_one_per_review unique (user_id, review_id)",
    );
    expect(allSql).toContain(
      "constraint review_reports_one_per_deal unique (user_id, deal_id)",
    );
  });

  it("투표방 30명, 후보 2~5곳, 참여자 제안 대기 3곳, 제목 20자", () => {
    expect(allSql).toMatch(/poll_members where poll_id = v_poll\.id\) >= 30/);
    expect(allSql).toMatch(/if v_n < 2 or v_n > 5 then/);
    expect(allSql).toMatch(
      /status = 'suggested' and added_by = v_uid\s+\) >= 3/,
    );
    expect(allSql).toContain(
      "constraint polls_title_len check (char_length(title) between 1 and 20",
    );
  });

  it("글자 수: 후기 100, 할인 내용 60, 신고 기타 100", () => {
    expect(allSql).toMatch(
      /body is null or \(char_length\(body\) between 1 and 100/,
    );
    expect(allSql).toMatch(/char_length\(content\) between 1 and 60/);
    expect(allSql).toMatch(/char_length\(note\) between 1 and 100/);
  });
});
