"use client";
// 좋아하는 음식 /me/liked (T9.17, SET-06, D-39). 온보딩 넷째 단계와 같은 그림 타일(LikedFields)을 쓴다.
// - 5개까지. 저장하면 기간 없이 반영하고, 그 음식에 👍👎이 쌓이면 가산이 줄어든다(src/lib/reco).
// - "모두 빼기"는 밑줄 글자 버튼(primary는 저장 하나).
import { useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import { meCopy } from "@/copy/me";
import {
  LIKED_CATEGORY_SLUGS,
  LIKED_MAX,
  type LikedCategory,
} from "@/features/onboarding/constants";
import { LikedFields } from "@/features/onboarding/steps";
import type { LikedToggleResult } from "@/features/onboarding/use-onboarding";
import { cn } from "@/lib/utils";
import type { LikedRequest, SettingsResult } from "./requests";
import { SaveBar } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const copy = meCopy.liked;

/** 타일 순서로 정렬한 사본(저장 값 비교용) */
function ordered(list: readonly LikedCategory[]): LikedCategory[] {
  return LIKED_CATEGORY_SLUGS.filter((s) => list.includes(s));
}

export function LikedForm({
  initial,
  submit,
}: {
  initial: LikedCategory[];
  submit: (req: LikedRequest) => Promise<SettingsResult>;
}) {
  const [liked, setLiked] = useState<LikedCategory[]>(ordered(initial));
  const [saved, setSaved] = useState<LikedCategory[]>(ordered(initial));
  const { state, save } = useSettingsSave();
  const changed = ordered(liked).join() !== saved.join();

  function toggleLiked(slug: LikedCategory): LikedToggleResult {
    if (liked.includes(slug)) {
      setLiked(liked.filter((s) => s !== slug));
      return "removed";
    }
    if (liked.length >= LIKED_MAX) return "full";
    setLiked([...liked, slug]);
    return "added";
  }

  async function commit(next: LikedCategory[]) {
    const ok = await save(
      () => submit({ categories: next }),
      () => (next.length > 0 ? copy.saved : copy.cleared),
    );
    if (ok) {
      setSaved(ordered(next));
      setLiked(ordered(next));
    }
  }

  return (
    <>
      <div className="mt-8">
        <LikedFields ob={{ liked, toggleLiked }} />
      </div>
      <SaveBar
        state={state}
        blocked={!changed}
        onSave={() => void commit(ordered(liked))}
      >
        {saved.length > 0 ? (
          <button
            type="button"
            onClick={() => void commit([])}
            aria-disabled={state.busy || !state.online || undefined}
            className={cn(
              "mx-auto -mt-1 inline-flex h-11 items-center px-2 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground active:text-foreground active:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
              focusRing,
            )}
          >
            {copy.clear}
          </button>
        ) : null}
      </SaveBar>
    </>
  );
}
