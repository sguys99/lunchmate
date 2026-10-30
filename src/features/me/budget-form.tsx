"use client";
// 예산과 거리 수정 (T4.24, SET-02). 온보딩 2단계 슬라이더(BudgetFields)를 그대로 쓴다.
// 근처 식당 수는 온보딩에서만 센다(지도 없이 카카오 반경 검색을 다시 부르지 않는다). 여기서는 반경 한 줄만.
import { onboardingCopy } from "@/copy/onboarding";
import { meCopy } from "@/copy/me";
import type { Prefs } from "@/features/onboarding/constants";
import { BudgetFields } from "@/features/onboarding/steps";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import { useState } from "react";
import type { PrefsRequest, SettingsResult } from "./requests";
import { SaveBar } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

export function BudgetForm({
  initial,
  submit,
}: {
  initial: Prefs;
  submit: (req: PrefsRequest) => Promise<SettingsResult>;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saved, setSaved] = useState<Prefs>(initial);
  const { state, save } = useSettingsSave();
  const changed =
    prefs.lunch !== saved.lunch ||
    prefs.dinner !== saved.dinner ||
    prefs.walk !== saved.walk;

  return (
    <>
      <div className="mt-8">
        <BudgetFields
          ob={{
            prefs,
            setLunch: (lunch) => setPrefs((p) => ({ ...p, lunch })),
            setDinner: (dinner) => setPrefs((p) => ({ ...p, dinner })),
            setWalk: (walk) => setPrefs((p) => ({ ...p, walk })),
          }}
          nearby={
            <p className="type-caption text-muted-foreground">
              {onboardingCopy.budget.radius(
                searchRadiusFromWalkMinutes(prefs.walk),
              )}
            </p>
          }
        />
      </div>
      <SaveBar
        state={state}
        blocked={!changed}
        onSave={async () => {
          const next = { ...prefs };
          const ok = await save(
            () => submit(next),
            () => meCopy.budget.saved,
          );
          if (ok) setSaved(next);
        }}
      />
    </>
  );
}
