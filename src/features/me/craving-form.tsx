"use client";
// "요즘 이게 땡겨요" (T4.26, SET-05). 12종 중 3개까지 고르고 저장하면 7일 동안 추천 가중치를 올린다(가중치 계산은 T5).
// - 남은 날은 KST 날짜로 센다(craving.ts). 만료됐으면 지난 선택을 그대로 보여 주고 다시 저장을 권한다.
// - 3개를 넘게 누르면 고르지 않고 안내 한 줄(칩 규칙: 선택은 테두리와 글자색만).
// - "모두 빼기"는 밑줄 글자 버튼(primary는 저장 하나).
import { useId, useState } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { meCopy } from "@/copy/me";
import {
  CATEGORIES,
  CATEGORY_SLUGS,
  isCategorySlug,
  type CategorySlug,
} from "@/features/place/categories";
import { cn } from "@/lib/utils";
import {
  cravingStatus,
  MAX_CRAVINGS,
  sameCravings,
  type CravingStatus,
} from "./craving";
import type { CravingRequest, CravingResult } from "./requests";
import { SaveBar } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const copy = meCopy.craving;

function StatusLine({ status }: { status: CravingStatus }) {
  const text =
    status.kind === "active"
      ? copy.daysLeft(status.daysLeft)
      : status.kind === "expired"
        ? copy.expired
        : copy.none;
  return (
    <p
      data-testid="craving-status"
      className={cn(
        "type-body-sm break-keep",
        status.kind === "active" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {text}
    </p>
  );
}

export function CravingForm({
  initial,
  initialUntil,
  now: nowIso,
  submit,
}: {
  initial: CategorySlug[];
  initialUntil: string | null;
  /** 서버가 렌더한 시각(ISO). 서버와 브라우저가 같은 남은 날을 그린다 */
  now: string;
  submit: (req: CravingRequest) => Promise<CravingResult>;
}) {
  const groupId = useId();
  const hintId = useId();
  const [picked, setPicked] = useState<CategorySlug[]>(initial);
  const [saved, setSaved] = useState({
    categories: initial,
    until: initialUntil,
  });
  const [overLimit, setOverLimit] = useState(false);
  const now = new Date(nowIso);
  const { state, save } = useSettingsSave();

  const status = cravingStatus(saved.categories, saved.until, now);
  const changed = !sameCravings(picked, saved.categories);
  // 같은 선택이어도 기간이 끝났으면 다시 저장(7일 새로 세기)할 수 있다
  const canSave = changed || (status.kind === "expired" && picked.length > 0);

  async function commit(next: CategorySlug[]) {
    const ok = await save(
      () => submit({ categories: next }),
      () => (next.length > 0 ? copy.saved : copy.cleared),
    );
    if (ok) {
      setOverLimit(false);
      setSaved({ categories: next, until: ok.until });
      setPicked(next);
    }
  }

  return (
    <>
      <div className="mt-6">
        <StatusLine status={status} />
      </div>
      <section aria-labelledby={groupId} className="mt-8 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={groupId} className="type-caption text-muted-foreground">
            {copy.groupLabel}
          </h2>
          <span
            aria-live="polite"
            className="type-caption text-muted-foreground tabular-nums"
          >
            {copy.picked(picked.length)}
          </span>
        </div>
        <ChipGroup
          multiple
          aria-labelledby={groupId}
          aria-describedby={hintId}
          value={picked}
          onValueChange={(v) => {
            const next = v.map(String).filter(isCategorySlug);
            if (next.length > MAX_CRAVINGS) {
              setOverLimit(true);
              return;
            }
            setOverLimit(false);
            // 12종 순서로 둔다
            setPicked(CATEGORY_SLUGS.filter((s) => next.includes(s)));
          }}
        >
          {CATEGORY_SLUGS.map((slug) => (
            <Chip key={slug} value={slug}>
              {CATEGORIES[slug].label}
            </Chip>
          ))}
        </ChipGroup>
        <p
          id={hintId}
          role={overLimit ? "alert" : undefined}
          className="type-caption break-keep text-muted-foreground"
        >
          {overLimit ? copy.limit : copy.renewHint}
        </p>
      </section>
      <SaveBar
        state={state}
        blocked={!canSave}
        onSave={() => void commit(picked)}
      >
        {saved.categories.length > 0 ? (
          <button
            type="button"
            onClick={() => void commit([])}
            aria-disabled={state.busy || !state.online || undefined}
            className={cn(
              "mx-auto -mt-1 inline-flex h-11 items-center px-2 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
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
