"use server";
// 관리자 서버 액션 (T8.5, MOD-06). 모든 입력은 zod로 다시 검사하고(CLAUDE.md 7장), 처리는 admin_* 보안 함수만 부른다.
// 관리자 확인은 세 번째 겹인 DB 함수가 최종으로 하고, 여기서는 세션 role을 먼저 본다(아니면 forbidden).
// 분석 이벤트는 보내지 않는다(안건 15: 운영 지표는 처리 이력 테이블로).
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import {
  closureRowSchema,
  decideClosureInput,
  decideItemInput,
  decideRowSchema,
  logRowSchema,
  mapAdminError,
  reportedRowSchema,
  searchUsersInput,
  setSuspensionInput,
  undoInput,
  userIdInput,
  userRowSchema,
  type AdminResult,
  type AdminSnapshot,
  type AdminUser,
  type DecideClosureInput,
  type DecideItemInput,
  type SetSuspensionInput,
} from "./model";
import { callAdminRpc, getAdminSession, type AdminSession } from "./server";

type Fail = { ok: false; error: "forbidden" | "invalid" | "save" };

async function session(): Promise<AdminSession | Fail> {
  if (!isEnabled("adminConsole")) return { ok: false, error: "forbidden" };
  const s = await getAdminSession().catch(() => null);
  return s ?? { ok: false, error: "forbidden" };
}

function isFail(v: AdminSession | Fail): v is Fail {
  return "ok" in v;
}

/** 네 구역 목록을 한 번에 (TanStack Query 세션 메모리에만 둔다. 저장하지 않는다) */
export async function loadAdminSnapshotAction(): Promise<
  AdminResult<{ snapshot: AdminSnapshot }>
> {
  const s = await session();
  if (isFail(s)) return s;
  const [items, closures, users, log] = await Promise.all([
    callAdminRpc(s.supabase, "admin_reported_items"),
    callAdminRpc(s.supabase, "admin_closures"),
    callAdminRpc(s.supabase, "admin_users", {}),
    callAdminRpc(s.supabase, "admin_log", { p_limit: 200 }),
  ]);
  for (const r of [items, closures, users, log]) {
    const failed = mapAdminError(r.error);
    if (failed) return { ok: false, error: failed };
  }
  const parsed = z
    .object({
      items: z.array(reportedRowSchema),
      closures: z.array(closureRowSchema),
      users: z.array(userRowSchema),
      log: z.array(logRowSchema),
    })
    .safeParse({
      items: items.data,
      closures: closures.data,
      users: users.data,
      log: log.data,
    });
  if (!parsed.success) return { ok: false, error: "save" };
  return { ok: true, snapshot: parsed.data };
}

/** 후기, 할인 숨김 확정 또는 복구(문제없음). includeAuthor면 같은 작성자의 다른 검토 대기 글도 숨긴다 */
export async function decideItemAction(
  input: DecideItemInput,
): Promise<AdminResult<{ actionIds: string[] }>> {
  const v = decideItemInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(s.supabase, "admin_decide_item", {
    p_target_type: v.data.targetType,
    p_target_id: v.data.targetId,
    p_result: v.data.result,
    ...(v.data.reason ? { p_reason: v.data.reason } : {}),
    p_include_author: v.data.includeAuthor,
  });
  const failed = mapAdminError(error);
  if (failed) return { ok: false, error: failed };
  const rows = z.array(decideRowSchema).safeParse(data);
  if (!rows.success) return { ok: false, error: "save" };
  return { ok: true, actionIds: rows.data.map((r) => r.action_id) };
}

/** 폐업 확인(confirm) 또는 영업 중으로 두기(dismiss) */
export async function decideClosureAction(
  input: DecideClosureInput,
): Promise<AdminResult<{ actionIds: string[] }>> {
  const v = decideClosureInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(
    s.supabase,
    "admin_decide_closure",
    { p_place_id: v.data.placeId, p_result: v.data.result },
  );
  return oneAction(data, error);
}

/** 정지(기간, 사유) 또는 해제 */
export async function setSuspensionAction(
  input: SetSuspensionInput,
): Promise<AdminResult<{ actionIds: string[] }>> {
  const v = setSuspensionInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(
    s.supabase,
    "admin_set_suspension",
    v.data.status === "suspended"
      ? {
          p_user_id: v.data.userId,
          p_status: "suspended",
          p_duration: v.data.duration,
          p_reason: v.data.reason,
        }
      : { p_user_id: v.data.userId, p_status: "active" },
  );
  return oneAction(data, error);
}

/** 정지 검토 후보 문제없음 */
export async function clearUserAction(input: {
  userId: string;
}): Promise<AdminResult<{ actionIds: string[] }>> {
  const v = userIdInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(s.supabase, "admin_clear_user", {
    p_user_id: v.data.userId,
  });
  return oneAction(data, error);
}

/** 되돌리기(토스트 8초, 처리 이력 줄). 여러 건이면 한꺼번에, 하나라도 안 되면 전부 취소 */
export async function undoAction(input: {
  actionIds: string[];
}): Promise<AdminResult<{ count: number }>> {
  const v = undoInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(s.supabase, "admin_undo", {
    p_action_ids: v.data.actionIds,
  });
  const failed = mapAdminError(error);
  if (failed) return { ok: false, error: failed };
  const n = z.number().int().safeParse(data);
  return n.success ? { ok: true, count: n.data } : { ok: false, error: "save" };
}

/** 닉네임으로 찾기 (20명) */
export async function searchUsersAction(input: {
  query: string;
}): Promise<AdminResult<{ users: AdminUser[] }>> {
  const v = searchUsersInput.safeParse(input);
  if (!v.success) return { ok: false, error: "invalid" };
  const s = await session();
  if (isFail(s)) return s;
  const { data, error } = await callAdminRpc(s.supabase, "admin_users", {
    p_query: v.data.query,
  });
  const failed = mapAdminError(error);
  if (failed) return { ok: false, error: failed };
  const rows = z.array(userRowSchema).safeParse(data);
  if (!rows.success) return { ok: false, error: "save" };
  return { ok: true, users: rows.data.filter((u) => u.kind === "match") };
}

function oneAction(
  data: unknown,
  error: Parameters<typeof mapAdminError>[0],
): AdminResult<{ actionIds: string[] }> {
  const failed = mapAdminError(error);
  if (failed) return { ok: false, error: failed };
  const id = z.string().min(1).safeParse(data);
  return id.success
    ? { ok: true, actionIds: [id.data] }
    : { ok: false, error: "save" };
}
