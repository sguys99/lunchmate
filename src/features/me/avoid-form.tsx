"use client";
// 못 먹는 음식 수정 (T4.24, SET-03). 온보딩 3단계 칩과 직접 입력(AvoidFields)을 그대로 쓴다.
// 직접 입력 판정 규칙은 T5 하드 필터에서 정한다(D-07 안건 4).
import { useState } from "react";
import { meCopy } from "@/copy/me";
import {
  CUSTOM_AVOID_MAX_ITEMS,
  CUSTOM_AVOID_MAX_LENGTH,
  type AvoidChoice,
} from "@/features/onboarding/constants";
import { AvoidFields } from "@/features/onboarding/steps";
import type { CustomAddResult } from "@/features/onboarding/use-onboarding";
import type { AvoidRequest, SettingsResult } from "./requests";
import { SaveBar } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const key = (a: AvoidChoice) =>
  JSON.stringify([
    [...a.foods].sort(),
    [...a.allergies].sort(),
    [...a.custom].sort(),
  ]);

export function AvoidForm({
  initial,
  submit,
}: {
  initial: AvoidChoice;
  submit: (req: AvoidRequest) => Promise<SettingsResult>;
}) {
  const [avoid, setAvoid] = useState<AvoidChoice>(initial);
  const [savedKey, setSavedKey] = useState(() => key(initial));
  const { state, save } = useSettingsSave();

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

  return (
    <>
      <div className="mt-8">
        <AvoidFields
          ob={{
            avoid,
            setFoods: (foods) => setAvoid((a) => ({ ...a, foods })),
            setAllergies: (allergies) => setAvoid((a) => ({ ...a, allergies })),
            addCustom,
            removeCustom: (item) =>
              setAvoid((a) => ({
                ...a,
                custom: a.custom.filter((x) => x !== item),
              })),
          }}
        />
      </div>
      <SaveBar
        state={state}
        blocked={key(avoid) === savedKey}
        onSave={async () => {
          const next = { ...avoid };
          const ok = await save(
            () => submit(next),
            () => meCopy.avoid.saved,
          );
          if (ok) setSavedKey(key(next));
        }}
      />
    </>
  );
}
