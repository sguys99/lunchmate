"use client";
// 설정 저장 상태 (T4.23~T4.26). 저장 중, 오류, 오프라인을 한곳에서 다룬다.
// - 오프라인이면 요청하지 않는다(버튼은 aria-disabled, 안내는 SaveBar).
// - 실패하면 고른 값은 그대로 두고 오류 안내를 보인다. 성공 문구는 토스트(지연 로딩)로 알린다.
// - 서버 액션이 revalidatePath로 /me 화면을 다시 그리므로 여기서 새로 고치지 않는다.
import { useState } from "react";
import { toast } from "@/components/ui/lazy-toaster";
import { useOnlineStatus } from "@/lib/network";
import type { SettingsError } from "./requests";

export type SaveState = {
  online: boolean;
  busy: boolean;
  error: SettingsError | null;
};

export function useSettingsSave() {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SettingsError | null>(null);

  /** 요청을 보낸다. 성공하면 결과를 돌려주고, 막히거나 실패하면 null */
  async function save<
    R extends { ok: true } | { ok: false; error: SettingsError },
  >(
    request: () => Promise<R>,
    successMessage?: (result: Extract<R, { ok: true }>) => string | null,
  ): Promise<Extract<R, { ok: true }> | null> {
    if (!online || busy) return null;
    setBusy(true);
    setError(null);
    const result = await request().catch(
      () => ({ ok: false, error: "save" }) as const,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    const ok = result as Extract<R, { ok: true }>;
    const message = successMessage?.(ok);
    if (message) void toast.success(message);
    return ok;
  }

  return {
    state: { online, busy, error } satisfies SaveState,
    save,
    clearError: () => setError(null),
  };
}
