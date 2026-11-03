"use client";
// 식당 메모 작은 시트 (T10.15, D-33 시안 B 이름표 시트). Base UI Drawer. memo-sheet.tsx가 누른 뒤에 동적 import한다.
// - 모바일: 아래 작은 시트(손잡이). 데스크톱(1024 이상): 가운데 대화상자(최대 448). 후기, 베타 의견 시트와 같은 클래스.
//   상세 시트 위에서 열면 중첩 Drawer다. 딤은 forceRender로 상세 위에 한 겹 더 깐다.
// - 입력: 한 줄 input. 처음 메모를 쓸 때는 늘 빈 칸이다(카카오 장소명 미리 채우기, 붙여 넣기 버튼, 자동 완성 없음, D-32).
//   이미 쓴 메모를 고칠 때만 그 메모가 들어 있다. 40자(코드 포인트), 글자 수, 넘으면 빨간 수 + 한 줄, 저장 꺼짐.
//   빈 칸 저장 = 메모 지우기. Enter(한글 조합 중 제외)로 저장.
// - 상태: 저장하는 중(버튼 글자), 실패(입력 아래 한 줄 + "다시 저장", 쓴 글 유지), 금칙어, 하루 30회, 300곳, 오프라인(aria-disabled + 한 줄).
// - 저장되면 세션 캐시의 메모 자리만 바꾸고(applyMemo, 다시 읽지 않음) 시트를 닫는다. 결과 한 줄은 부르는 쪽(이름표 옆)이 알린다.
// - 올리브 버튼은 시트(별도 층) 안 저장 하나뿐이다. 메모 지우기는 고스트.
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { memoCopy as copy } from "@/copy/memo";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { setPlaceMemoAction } from "./actions";
import { applyMemo } from "./cache";
import { MEMO_MAX, memoCheck, memoLength } from "./model";
import type {
  PlaceMemoError,
  SetPlaceMemoRequest,
  SetPlaceMemoResult,
} from "./requests";

export type MemoSheetTarget = {
  placeId: string;
  placeUrl: string | null;
  /** 지금 메모(없으면 null). 입력란은 이 값에서 시작한다(처음이면 빈 칸) */
  memo: string | null;
};

export type MemoSheetDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MemoSheetTarget;
  /** 저장(memo) 또는 지움(null) 뒤. 부르는 쪽이 결과 한 줄을 알린다 */
  onSaved: (memo: string | null) => void;
  /** 닫힌 뒤 포커스를 돌려줄 곳(이름표 알약) */
  finalFocus?: () => HTMLElement | null;
  /** 테스트 주입. 기본은 서버 액션 */
  save?: (input: SetPlaceMemoRequest) => Promise<SetPlaceMemoResult>;
};

type Status = "idle" | "saving" | PlaceMemoError;

function errorText(status: Status): string | null {
  switch (status) {
    case "idle":
    case "saving":
      return null;
    default:
      return copy.errors[status];
  }
}

export default function MemoSheetDrawer({
  open,
  onOpenChange,
  target,
  onSaved,
  finalFocus,
  save = setPlaceMemoAction,
}: MemoSheetDrawerProps) {
  const client = useQueryClient();
  const online = useOnlineStatus();
  const [text, setText] = useState(target.memo ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const titleId = useId();
  const inputId = useId();
  const countId = useId();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const check = memoCheck(text);
  const length = memoLength(text);
  const over = check === "tooLong";
  // 한도와 정지는 다시 눌러도 같다(쓴 글은 남긴다)
  const blocked =
    status === "daily" || status === "suspended" || status === "disabled";
  const canSave =
    online &&
    status !== "saving" &&
    !blocked &&
    !over &&
    (check === "ok" || target.memo !== null);
  const failed = errorText(status);
  const note = !online
    ? copy.states.offline
    : over
      ? copy.errors.tooLong(MEMO_MAX)
      : failed;

  async function submit() {
    if (!canSave) return;
    setStatus("saving");
    let result: SetPlaceMemoResult;
    try {
      result = await save({
        placeId: target.placeId,
        placeUrl: target.placeUrl,
        body: text,
      });
    } catch {
      result = { ok: false, error: "save" };
    }
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    applyMemo(client, target.placeId, result.memo);
    setStatus("idle");
    onSaved(result.memo);
    onOpenChange(false);
  }

  async function remove() {
    if (!online || status === "saving") return;
    setText("");
    setStatus("saving");
    let result: SetPlaceMemoResult;
    try {
      result = await save({
        placeId: target.placeId,
        placeUrl: target.placeUrl,
        body: "",
      });
    } catch {
      result = { ok: false, error: "save" };
    }
    if (!result.ok) {
      // 지우지 못했으면 쓴 글을 되돌린다
      setText(target.memo ?? "");
      setStatus(result.error);
      return;
    }
    applyMemo(client, target.placeId, null);
    setStatus("idle");
    onSaved(null);
    onOpenChange(false);
  }

  const label =
    status === "saving"
      ? copy.sheet.saving
      : failed && !blocked
        ? copy.sheet.retry
        : copy.sheet.save;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop forceRender className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            aria-labelledby={titleId}
            initialFocus={() => inputRef.current ?? true}
            finalFocus={() => finalFocus?.() ?? true}
            className={cn(
              "max-h-[92dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-2 px-7 pt-3 pb-1 max-[23.75rem]:px-5 min-[64rem]:pt-6">
              <DrawerTitle
                id={titleId}
                className="min-w-0 flex-1 type-heading break-keep outline-none"
              >
                {copy.sheet.title}
              </DrawerTitle>
              <DrawerClose
                aria-label={copy.sheet.close}
                className={cn(
                  "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <div className="flex flex-col gap-4 px-7 pt-2 pb-5 max-[23.75rem]:px-5">
              <p className="type-body-sm break-keep text-muted-foreground">
                {copy.sheet.body}
              </p>
              <div className="flex flex-col gap-2">
                <label htmlFor={inputId} className="sr-only">
                  {copy.sheet.inputLabel}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    // 장소명 자동 완성과 맞춤법 제안을 끈다(빈 칸에서 사용자가 직접 쓴 글만, D-32)
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    aria-describedby={note ? `${countId} ${noteId}` : countId}
                    aria-invalid={
                      over ||
                      status === "banned" ||
                      status === "invalid" ||
                      undefined
                    }
                    readOnly={!online}
                    placeholder={copy.sheet.placeholder}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (status !== "saving" && !blocked) setStatus("idle");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                    className={cn(
                      "block h-12 w-full rounded-input border border-input bg-card pr-16 pl-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
                      "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
                      (over || status === "banned" || status === "invalid") &&
                        "border-destructive",
                    )}
                  />
                  <span
                    id={countId}
                    className={cn(
                      "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-caption tabular-nums",
                      over ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    <span aria-hidden>
                      {copy.sheet.count(length, MEMO_MAX)}
                    </span>
                    <span className="sr-only">
                      {copy.sheet.countLabel(length, MEMO_MAX)}
                    </span>
                  </span>
                </div>
                {note ? (
                  <p
                    id={noteId}
                    role={!online ? "status" : "alert"}
                    className={cn(
                      "type-caption break-keep",
                      !online ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {note}
                  </p>
                ) : null}
                <p className="type-caption text-muted-foreground">
                  {copy.sheet.privacy}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-popover px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5 min-[64rem]:rounded-b-card min-[64rem]:pb-5">
              <button
                type="button"
                onClick={() => void submit()}
                aria-disabled={!canSave || undefined}
                className={cn(buttonClass("primary"), "w-full")}
              >
                {label}
              </button>
              {target.memo !== null ? (
                <button
                  type="button"
                  onClick={() => void remove()}
                  aria-disabled={!online || status === "saving" || undefined}
                  className={cn(
                    buttonClass("ghost"),
                    "w-full text-muted-foreground",
                  )}
                >
                  {copy.sheet.remove}
                </button>
              ) : null}
            </div>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
