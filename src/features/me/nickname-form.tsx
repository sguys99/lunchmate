"use client";
// 이름(닉네임) 보기와 수정 (T4.27, AUTH-05 계정 화면). 다른 사람에게 보일 이름이라는 고지를 함께 둔다(사용자 결정 2026-10-30).
// - profiles.nickname은 본인만 고칠 수 있다(열 단위 권한). 1~20자, 앞뒤 공백 없음(DB 제약, 서버 zod 재검증).
// - 계정 화면에는 탈퇴(destructive)와 로그아웃(secondary)이 있으므로 저장 버튼도 secondary로 둔다(primary 면 없음).
// - 4상태: 저장 중(버튼 aria-busy), 실패, 오프라인(SaveNotes), 이름 없음(안내 한 줄). 로딩은 페이지 Suspense.
import { useId, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Input } from "@/components/ui/input";
import { meCopy } from "@/copy/me";
import { cn } from "@/lib/utils";
import type { NicknameRequest, SettingsResult } from "./requests";
import { SaveNotes } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const copy = meCopy.name;
const MAX = 20;

export function NicknameForm({
  initial,
  submit,
}: {
  initial: string | null;
  submit: (
    req: NicknameRequest,
  ) => Promise<SettingsResult<{ nickname: string }>>;
}) {
  const inputId = useId();
  const noticeId = useId();
  const hintId = useId();
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial);
  const [empty, setEmpty] = useState(false);
  const { state, save } = useSettingsSave();
  const trimmed = value.trim();
  const unchanged = trimmed === (saved ?? "");
  const disabled = state.busy || !state.online || unchanged;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) {
      setEmpty(true);
      return;
    }
    if (disabled) return;
    const ok = await save(
      () => submit({ nickname: trimmed }),
      () => copy.saved,
    );
    if (ok) {
      setSaved(ok.nickname);
      setValue(ok.nickname);
    }
  }

  return (
    <section className="flex flex-col gap-3 pt-6">
      <h2 className="type-label">
        <label htmlFor={inputId}>{copy.title}</label>
      </h2>
      <p
        id={noticeId}
        className="type-body-sm break-keep text-muted-foreground"
      >
        {copy.notice}
      </p>
      {!saved ? (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.none}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          id={inputId}
          value={value}
          maxLength={MAX}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder={copy.placeholder}
          aria-describedby={`${noticeId} ${hintId}`}
          aria-invalid={empty || undefined}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            setEmpty(false);
          }}
        />
        <p
          id={hintId}
          role={empty ? "alert" : undefined}
          className="flex justify-between gap-3 type-caption text-muted-foreground"
        >
          <span>{empty ? copy.empty : ""}</span>
          <span className="tabular-nums">
            {value.length}/{MAX}
          </span>
        </p>
        <SaveNotes state={state} />
        <button
          type="submit"
          aria-disabled={disabled || undefined}
          aria-busy={state.busy || undefined}
          className={cn(
            buttonClass("secondary"),
            "w-full desktop:w-auto desktop:self-start",
          )}
        >
          {state.busy ? copy.saving : copy.save}
        </button>
      </form>
    </section>
  );
}
