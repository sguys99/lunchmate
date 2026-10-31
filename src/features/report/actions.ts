"use server";
// 신고, 식당 정보 제보, 할인, 웨이팅 서버 액션 (T6.15~T6.24, T6.17, T6.18, PLACE-05, PLACE-07, MOD-01~05, DEAL-01~04).
// 흐름과 zod 검사는 report-requests.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 정책 + 열 권한, 등록은 보안 함수(register_deal, report_wait).
// - 요청에 장소명, 좌표, 현위치는 없다(CLAUDE.md 7장). 신고 글과 할인 내용은 금칙어를 거른 뒤 저장한다.
import { isEnabled } from "@/lib/flags";
import { createServerSupabase, type ServerSupabase } from "@/lib/supabase/server";
import { fail, type WriteResult } from "@/lib/supabase/write-result";
import type { DealCheckAnswer } from "./labels";
import {
  checkDeal,
  registerDeal,
  reportDeal,
  reportPlace,
  reportReview,
  reportWait,
  undoDealCheck,
  undoWait,
  type CheckDealRequest,
  type DealIdRequest,
  type RegisterDealRequest,
  type RegisterDealResult,
  type ReportDealRequest,
  type ReportDeps,
  type ReportPlaceRequest,
  type ReportReviewRequest,
  type ReportWaitRequest,
  type ReportWaitResult,
  type WaitReportIdRequest,
} from "./report-requests";

function depsFor(supabase: ServerSupabase): ReportDeps {
  return {
    async currentUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    now: () => new Date(),
    async insertReviewReport(userId, row) {
      const { error } = await supabase
        .from("review_reports")
        .insert({ user_id: userId, ...row });
      return error;
    },
    async insertPlaceReport(userId, row) {
      const { error } = await supabase
        .from("place_reports")
        .insert({ user_id: userId, ...row });
      return error;
    },
    async registerDeal(args) {
      const { data, error } = await supabase.rpc("register_deal", {
        p_place_id: args.p_place_id,
        p_type: args.p_type,
        p_content: args.p_content,
        p_days: args.p_days,
        p_slots: args.p_slots,
        p_replace: args.p_replace,
        ...(args.p_ends_on ? { p_ends_on: args.p_ends_on } : {}),
        ...(args.p_place_url ? { p_place_url: args.p_place_url } : {}),
      });
      return { data: data?.[0] ?? null, error };
    },
    async insertDealCheck(userId, dealId, answer) {
      const { error } = await supabase
        .from("place_deal_checks")
        .insert({ user_id: userId, deal_id: dealId, answer });
      return error;
    },
    async updateDealCheck(userId, dealId, answer) {
      const { data, error } = await supabase
        .from("place_deal_checks")
        .update({ answer })
        .eq("user_id", userId)
        .eq("deal_id", dealId)
        .select("deal_id");
      return { count: data?.length ?? 0, error };
    },
    async deleteDealCheck(userId, dealId) {
      const { data, error } = await supabase
        .from("place_deal_checks")
        .delete()
        .eq("user_id", userId)
        .eq("deal_id", dealId)
        .select("deal_id");
      return { count: data?.length ?? 0, error };
    },
    async reportWait(args) {
      const { data, error } = await supabase.rpc("report_wait", args);
      return { data: data?.[0] ?? null, error };
    },
    async deleteWaitReport(userId, reportId) {
      // RLS가 2분 지난 행을 거른다(지우면 0행)
      const { data, error } = await supabase
        .from("wait_reports")
        .delete()
        .eq("user_id", userId)
        .eq("id", reportId)
        .select("id");
      return { count: data?.length ?? 0, error };
    },
  };
}

async function run<R>(
  fn: (deps: ReportDeps) => Promise<R>,
  fallback: R,
): Promise<R> {
  if (!isEnabled("auth")) return fallback;
  const supabase = await createServerSupabase();
  if (!supabase) return fallback;
  try {
    return await fn(depsFor(supabase));
  } catch {
    return fallback;
  }
}

/** 후기 신고 (MOD-01) */
export async function reportReviewAction(
  input: ReportReviewRequest,
): Promise<WriteResult> {
  return run((d) => reportReview(input, d), fail("save"));
}

/** 할인 신고 (DEAL-04) */
export async function reportDealAction(
  input: ReportDealRequest,
): Promise<WriteResult> {
  return run((d) => reportDeal(input, d), fail("save"));
}

/** 식당 정보 제보: 문 닫았어요 / 가격이 달라요 / 정보가 틀려요 (PLACE-05) */
export async function reportPlaceAction(
  input: ReportPlaceRequest,
): Promise<WriteResult> {
  return run((d) => reportPlace(input, d), fail("save"));
}

/** 할인 등록 (DEAL-01). merged면 중복 단계, replace: true로 다시 부르면 바꿔 넣기 */
export async function registerDealAction(
  input: RegisterDealRequest,
): Promise<RegisterDealResult> {
  return run((d) => registerDeal(input, d), fail("save"));
}

/** 아직 해요 / 끝났어요 (DEAL-03). 중복 단계의 "아직 해요로 확인"도 이것(still) */
export async function checkDealAction(
  input: CheckDealRequest,
): Promise<WriteResult<{ answer: DealCheckAnswer }>> {
  return run((d) => checkDeal(input, d), fail("save"));
}

/** 아직 해요 / 끝났어요 되돌리기 */
export async function undoDealCheckAction(
  input: DealIdRequest,
): Promise<WriteResult> {
  return run((d) => undoDealCheck(input, d), fail("save"));
}

/** 웨이팅 한 탭 (PLACE-07) */
export async function reportWaitAction(
  input: ReportWaitRequest,
): Promise<ReportWaitResult> {
  return run((d) => reportWait(input, d), fail("save"));
}

/** 웨이팅 되돌리기 (2분 안) */
export async function undoWaitAction(
  input: WaitReportIdRequest,
): Promise<WriteResult> {
  return run((d) => undoWait(input, d), fail("save"));
}
