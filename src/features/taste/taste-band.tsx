"use client";
// 홈 취향 띠 본체 (T9.17, D-39 A 한 줄 띠). slot.tsx가 React.lazy로 받는다(홈 첫 로드 밖).
// - 못 먹는 음식과 좋아하는 음식을 둘 다 비워 둔 사용자에게 가입 7일 안(prompt-rule.ts), 어제 피드백 띠 자리에 대신 보인다.
// - "알려 주기": 아래 시트에서 못 먹는 음식 → 좋아하는 음식 두 단계(온보딩과 같은 조각 AvoidFields, LikedFields).
//   저장하면 기존 나 탭 서버 액션(saveAvoidAction, saveLikedAction)으로 쓰고, 띠를 숨기고 홈을 다시 그린다(새 설정으로 추천).
// - 닫기: 띠를 바로 숨기고 닫은 시각을 남긴다(dismissTastePromptAction). 실패해도 이번 화면에서는 숨긴 채 둔다.
// - 모션은 CSS뿐(ob-rise 등장, 시트는 Sheet 기본 전환). 분석 이벤트는 새로 두지 않는다(D-39 계획).
import { Ban, CloudOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  saveAvoidAction,
  saveLikedAction,
  dismissTastePromptAction,
} from "@/app/(app)/me/actions";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { toast } from "@/components/ui/lazy-toaster";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { tasteCopy } from "@/copy/taste";
import {
  CUSTOM_AVOID_MAX_ITEMS,
  CUSTOM_AVOID_MAX_LENGTH,
  EMPTY_AVOID,
  LIKED_MAX,
  type AvoidChoice,
  type LikedCategory,
} from "@/features/onboarding/constants";
import { AvoidFields, LikedFields, Note } from "@/features/onboarding/steps";
import type {
  CustomAddResult,
  LikedToggleResult,
} from "@/features/onboarding/use-onboarding";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";

const copy = tasteCopy;

export default function TasteBand({ className }: { className?: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  if (hidden) return null;

  return (
    <div className={className}>
      <section
        aria-label={copy.band.title}
        className="ob-rise flex min-h-16 items-center gap-3 rounded-card border border-border bg-card py-2 pr-1 pl-4"
      >
        <Ban
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-label break-keep">{copy.band.title}</p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.band.body}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(buttonClass("secondary", "sm"), "shrink-0")}
        >
          {copy.band.action}
        </button>
        <button
          type="button"
          aria-label={copy.band.close}
          onClick={() => {
            setHidden(true);
            void dismissTastePromptAction().catch(() => undefined);
          }}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground active:text-foreground",
            focusRing,
          )}
        >
          <X aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      </section>
      <TasteSheet
        open={open}
        onOpenChange={setOpen}
        onSaved={() => {
          setOpen(false);
          setHidden(true);
          void toast.success(copy.sheet.saved);
          router.refresh();
        }}
      />
    </div>
  );
}

function TasteSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const online = useOnlineStatus();
  const [step, setStep] = useState<1 | 2>(1);
  const [avoid, setAvoid] = useState<AvoidChoice>(EMPTY_AVOID);
  const [liked, setLiked] = useState<LikedCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const s = copy.sheet;

  function addCustom(raw: string): CustomAddResult {
    const item = raw.trim().slice(0, CUSTOM_AVOID_MAX_LENGTH);
    if (!item) return "empty";
    if (
      avoid.custom.includes(item) ||
      avoid.foods.includes(item) ||
      avoid.allergies.includes(item)
    )
      return "duplicate";
    if (avoid.custom.length >= CUSTOM_AVOID_MAX_ITEMS) return "limit";
    setAvoid((a) => ({ ...a, custom: [...a.custom, item] }));
    return "added";
  }

  function toggleLiked(slug: LikedCategory): LikedToggleResult {
    if (liked.includes(slug)) {
      setLiked(liked.filter((x) => x !== slug));
      return "removed";
    }
    if (liked.length >= LIKED_MAX) return "full";
    setLiked([...liked, slug]);
    return "added";
  }

  async function save() {
    if (busy || !online) return;
    setBusy(true);
    setFailed(false);
    const a = await saveAvoidAction(avoid).catch(
      () => ({ ok: false }) as const,
    );
    const l = a.ok
      ? await saveLikedAction({ categories: liked }).catch(
          () => ({ ok: false }) as const,
        )
      : a;
    setBusy(false);
    if (a.ok && l.ok) onSaved();
    else setFailed(true);
  }

  const blocked = busy || (step === 2 && !online);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStep(1);
      }}
    >
      <SheetContent side="bottom" aria-label={s.label}>
        <SheetHeader>
          <p className="type-caption text-muted-foreground">
            {s.progress(step)}, {s.steps[step - 1]}
          </p>
          <SheetTitle>{step === 1 ? s.avoidTitle : s.likedTitle}</SheetTitle>
          <SheetDescription>
            {step === 1 ? s.avoidBody : s.likedBody}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div key={step} className="ob-rise">
            {step === 1 ? (
              <AvoidFields
                ob={{
                  avoid,
                  setFoods: (foods) => setAvoid((x) => ({ ...x, foods })),
                  setAllergies: (allergies) =>
                    setAvoid((x) => ({ ...x, allergies })),
                  addCustom,
                  removeCustom: (item) =>
                    setAvoid((x) => ({
                      ...x,
                      custom: x.custom.filter((c) => c !== item),
                    })),
                }}
              />
            ) : (
              <LikedFields ob={{ liked, toggleLiked }} />
            )}
          </div>
        </SheetBody>
        <SheetFooter className="flex flex-col gap-3">
          {failed ? (
            <Note
              icon={CloudOff}
              live="alert"
              title={s.error.title}
              body={s.error.body}
            />
          ) : null}
          <div className="flex gap-2">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(buttonClass("secondary"), "shrink-0")}
              >
                {s.back}
              </button>
            ) : null}
            <button
              type="button"
              aria-disabled={blocked || undefined}
              aria-busy={busy || undefined}
              onClick={() => {
                if (blocked) return;
                if (step === 1) setStep(2);
                else void save();
              }}
              className={cn(buttonClass("primary"), "flex-1")}
            >
              {busy ? s.saving : step === 1 ? s.next : s.save}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
