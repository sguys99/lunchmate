"use client";
// 베타 의견 보내기 시트 (T9.4, D-23: A 한 장 시트 + B의 종류별 예시 문구와 화면 첨부 기본값). Base UI Drawer.
// entry.tsx가 진입 줄을 누른 뒤에 동적 import한다(나 탭 첫 로드 밖, 홈 첫 로드와 무관).
// - 모바일: 아래 시트(손잡이, 최대 92dvh, 바닥 고정 보내기 줄). 데스크톱(1024 이상): 가운데 대화상자(최대 448). 후기 시트와 같은 클래스.
// - 입력: 종류 칩 4개(선택), 내용 1~500자(글자 수), "지금 보던 화면 함께 보내기"(버그, 불편은 기본 켬, 좋아요, 제안, 미선택은 끔.
//   사용자가 직접 바꾸면 그 뒤로는 종류를 바꿔도 따라 바뀌지 않는다). 함께 가는 값을 그대로 보인다(경로 틀, 앱 버전, 기기 종류).
// - 상태: 보내는 중(버튼 글자), 실패(버튼 위 한 줄 + 다시 보내기), 한도(버튼 꺼짐), 오프라인(위 안내 + aria-disabled).
//   쓴 글은 어느 경우에도 지우지 않는다. 같은 글을 1분 안에 다시 보내면 보내지 않고 보낸 화면만 보인다(D-23 안건 12).
// - 보낸 뒤: 같은 시트가 고마움 화면으로 바뀐다(4px 위로 페이드, slow, 축소 모드는 즉시). 축하 효과 없음.
import { Check, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
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
import { BETA_FEEDBACK_MAX, betaFeedbackCopy as copy } from "@/copy/beta";
import { APP_VERSION } from "@/lib/app-version";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { sendBetaFeedbackAction } from "./actions";
import { readDeviceInfo, type DeviceInfo } from "./device";
import { lastRoute } from "./last-route";
import {
  BETA_CATEGORIES,
  codePointLength,
  type BetaCategory,
  type BetaFeedbackError,
  type BetaFeedbackRequest,
  type BetaFeedbackResult,
} from "./requests";
import { sanitizeRoute } from "./route-path";

export type BetaFeedbackSheetDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 테스트와 디자인 확인용 주입. 기본은 서버 액션 */
  send?: (input: BetaFeedbackRequest) => Promise<BetaFeedbackResult>;
};

type Status = "idle" | "sending" | "sent" | BetaFeedbackError;

const DUPLICATE_MS = 60_000;
/** 같은 글 1분 안 다시 보내기 막기(이 탭 메모리만) */
let lastSent: { body: string; at: number } | null = null;

/** 종류별 화면 첨부 기본값: 버그, 불편은 켬, 좋아요, 제안, 미선택은 끔 (D-23) */
export function attachDefault(category: BetaCategory | null): boolean {
  return category === "bug" || category === "inconvenient";
}

export function sentInfoParts(
  route: string | null,
  device: DeviceInfo | null,
): string[] {
  const parts: string[] = [];
  if (route) parts.push(copy.sheet.screen(route));
  parts.push(copy.sheet.app(APP_VERSION));
  if (device) {
    parts.push(copy.sheet.devices[device.device]);
    if (device.inApp) parts.push(copy.sheet.inApp);
    if (device.standalone) parts.push(copy.sheet.standalone);
  }
  return parts;
}

export default function BetaFeedbackSheetDrawer({
  open,
  onOpenChange,
  send = sendBetaFeedbackAction,
}: BetaFeedbackSheetDrawerProps) {
  const online = useOnlineStatus();
  const [category, setCategory] = useState<BetaCategory | null>(null);
  const [text, setText] = useState("");
  const [attach, setAttach] = useState(false);
  const attachTouched = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  // 시트는 브라우저에서만 그린다(entry.tsx dynamic ssr: false). 연 순간의 기기 종류
  const [device] = useState<DeviceInfo>(readDeviceInfo);
  // 시트를 연 순간의 "지금 보던 화면"(나 탭 직전 경로)
  const route = useMemo(() => sanitizeRoute(lastRoute()), []);
  const titleId = useId();
  const chipsLabelId = useId();
  const textId = useId();
  const attachId = useId();
  const noteId = useId();

  const offline = !online;
  const length = codePointLength(text);
  const empty = text.trim().length === 0;
  const over = length > BETA_FEEDBACK_MAX;
  const blocked =
    status === "sending" || status === "limit" || status === "suspended";
  const canSend = !empty && !over && !offline && !blocked;

  function chooseCategory(next: BetaCategory | null) {
    setCategory(next);
    if (!attachTouched.current) setAttach(attachDefault(next));
  }

  async function submit() {
    if (!canSend) return;
    const body = text.trim();
    if (lastSent && lastSent.body === body && Date.now() - lastSent.at < DUPLICATE_MS) {
      setStatus("sent");
      return;
    }
    setStatus("sending");
    const r = await send({
      category,
      body: text,
      route: attach ? route : null,
      device: device.device,
      inApp: device.inApp,
      standalone: device.standalone,
    }).catch((): BetaFeedbackResult => ({ ok: false, error: "save" }));
    if (r.ok) {
      lastSent = { body, at: Date.now() };
      setStatus("sent");
    } else {
      setStatus(r.error);
    }
  }

  function again() {
    setText("");
    setCategory(null);
    setAttach(false);
    attachTouched.current = false;
    setStatus("idle");
  }

  const note = offline
    ? copy.states.offline
    : status === "limit"
      ? copy.states.limit
      : status === "suspended"
        ? copy.states.suspended
        : status === "unauthenticated"
          ? copy.states.signedOut
          : status === "invalid"
            ? copy.states.invalid
            : status === "save"
              ? copy.states.sendFailed
              : null;
  const sent = status === "sent";
  const placeholder = category
    ? copy.placeholders[category]
    : copy.sheet.textPlaceholder;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop forceRender className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            aria-labelledby={titleId}
            className={cn(
              "max-h-[92dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-2 px-7 pt-3 pb-2 max-[23.75rem]:px-5 min-[64rem]:pt-6">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pt-4 pb-6 max-[23.75rem]:px-5">
              {sent ? (
                <SentView onClose={() => onOpenChange(false)} onAgain={again} />
              ) : (
                <div className="flex flex-col gap-6">
                  <p className="-mt-2 type-caption break-keep text-muted-foreground">
                    {copy.sheet.description}
                  </p>

                  <div className="flex flex-col gap-3">
                    <p
                      id={chipsLabelId}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="type-label">
                        {copy.sheet.categoryQuestion}
                      </span>
                      <span className="type-caption text-muted-foreground">
                        {copy.sheet.categoryOptional}
                      </span>
                    </p>
                    <ChipGroup
                      aria-labelledby={chipsLabelId}
                      value={category ? [category] : []}
                      onValueChange={(v: unknown[]) => {
                        const next = v[0];
                        chooseCategory(
                          (BETA_CATEGORIES as readonly unknown[]).includes(next)
                            ? (next as BetaCategory)
                            : null,
                        );
                      }}
                    >
                      {BETA_CATEGORIES.map((c) => (
                        <Chip key={c} value={c}>
                          {copy.categories[c]}
                        </Chip>
                      ))}
                    </ChipGroup>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={textId} className="type-label">
                      {copy.sheet.textLabel}
                    </label>
                    <div className="relative">
                      <textarea
                        id={textId}
                        rows={5}
                        aria-describedby={`${textId}-count`}
                        aria-invalid={over || undefined}
                        placeholder={placeholder}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className={cn(
                          "block w-full resize-none rounded-input border border-input bg-card px-4 pt-3 pb-8 type-body text-foreground outline-none placeholder:text-muted-foreground",
                          "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
                          over && "border-destructive",
                        )}
                      />
                      <span
                        id={`${textId}-count`}
                        className={cn(
                          "pointer-events-none absolute right-4 bottom-2 type-caption tabular-nums",
                          over ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        <span aria-hidden>
                          {copy.sheet.count(length, BETA_FEEDBACK_MAX)}
                        </span>
                        <span className="sr-only">
                          {copy.sheet.countLabel(length, BETA_FEEDBACK_MAX)}
                        </span>
                      </span>
                    </div>
                    {over ? (
                      <p className="type-caption text-destructive">
                        {copy.sheet.tooLong(BETA_FEEDBACK_MAX)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={attachId}
                      checked={attach}
                      onCheckedChange={(v) => {
                        attachTouched.current = true;
                        setAttach(v === true);
                      }}
                      aria-describedby={`${attachId}-detail`}
                      className="mt-0.5"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <label htmlFor={attachId} className="type-body-sm">
                        {copy.sheet.attach}
                      </label>
                      <p
                        id={`${attachId}-detail`}
                        className="type-caption break-keep text-muted-foreground"
                      >
                        <span className="break-all" data-testid="beta-sent-info">
                          {copy.sheet.sentInfo(
                            sentInfoParts(attach ? route : null, device),
                          )}
                        </span>
                        <br />
                        {copy.sheet.privacy}
                      </p>
                    </div>
                  </div>
                  <p className="type-caption break-keep text-muted-foreground">
                    {copy.sheet.retention}
                  </p>
                </div>
              )}
            </div>

            {sent ? null : (
              <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-popover px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5 min-[64rem]:pb-5">
                {note ? (
                  <p
                    role={offline ? "status" : "alert"}
                    className={cn(
                      "type-caption break-keep",
                      offline ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {note}
                  </p>
                ) : empty ? (
                  <p id={noteId} className="type-caption text-muted-foreground">
                    {copy.sheet.needText}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void submit()}
                  aria-disabled={!canSend || undefined}
                  aria-describedby={empty && !note ? noteId : undefined}
                  className={cn(
                    buttonClass("primary"),
                    // 다크 모드에서 꺼진 면(bg-muted)이 시트 면과 비슷해 1px 선으로 구분한다(g9 7절 품질 메모)
                    "w-full aria-disabled:border aria-disabled:border-border",
                  )}
                >
                  {status === "sending"
                    ? copy.sheet.sending
                    : status === "save"
                      ? copy.states.retry
                      : copy.sheet.send}
                </button>
              </div>
            )}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

function SentView({
  onClose,
  onAgain,
}: {
  onClose: () => void;
  onAgain: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-start gap-4 pb-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]"
    >
      <span
        aria-hidden
        className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <Check className="size-6" strokeWidth={1.75} />
      </span>
      <p className="flex flex-col gap-2">
        <span className="type-heading font-heading break-keep">
          {copy.sent.title}
        </span>
        <span className="type-body-sm break-keep text-muted-foreground">
          {copy.sent.body}
        </span>
      </p>
      <div className="flex w-full flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className={cn(buttonClass("secondary"), "w-full")}
        >
          {copy.sent.close}
        </button>
        <button
          type="button"
          onClick={onAgain}
          className={cn(buttonClass("ghost"), "w-full")}
        >
          {copy.sent.again}
        </button>
      </div>
    </div>
  );
}
