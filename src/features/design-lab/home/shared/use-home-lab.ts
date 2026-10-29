"use client";
// 홈 시안 공용 상태 (T3.1): 끼니, 기준 위치, 다시 뽑기 회차, 스크린 리더 안내.
// 목업이라 끼니나 기준 위치를 바꾸면 다른 세트로 넘어가고, 다시 뽑기와 같은 셔플 모션을 탄다.
import { useState } from "react";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { MOCK_HOME_ALL_SETS, type MockPick } from "@/features/design-lab/mock";

const copy = designLabHomeCopy.screen;

export type Meal = "lunch" | "dinner";
export const BASE_LOCATIONS = ["office", "other", "here"] as const;
export type BaseLocation = (typeof BASE_LOCATIONS)[number];

export type HomeLab = {
  meal: Meal;
  location: BaseLocation;
  /** 다시 뽑기, 끼니, 기준 위치가 바뀔 때마다 1씩 는다. 셔플 모션의 key */
  round: number;
  picks: MockPick;
  /** aria-live 문장 */
  announcement: string;
  announce: (text: string) => void;
  reroll: () => void;
  setMeal: (meal: Meal) => void;
  cycleLocation: () => void;
};

export function useHomeLab(): HomeLab {
  const [meal, setMealState] = useState<Meal>("lunch");
  const [location, setLocation] = useState<BaseLocation>("office");
  const [round, setRound] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const sets = MOCK_HOME_ALL_SETS;
  const picks = sets[round % sets.length] ?? sets[0]!;

  return {
    meal,
    location,
    round,
    picks,
    announcement,
    announce: setAnnouncement,
    reroll: () => {
      setRound((r) => r + 1);
      setAnnouncement(copy.rerolled);
    },
    setMeal: (next) => {
      if (next === meal) return;
      setMealState(next);
      setRound((r) => r + 1);
      setAnnouncement(copy.meal.changed(copy.meal[next]));
    },
    cycleLocation: () => {
      const i = BASE_LOCATIONS.indexOf(location);
      const next = BASE_LOCATIONS[(i + 1) % BASE_LOCATIONS.length] ?? "office";
      setLocation(next);
      setRound((r) => r + 1);
      setAnnouncement(copy.location.changed(copy.location.options[next]));
    },
  };
}
