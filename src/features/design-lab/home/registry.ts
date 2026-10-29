// 홈 시안(T3.1) id → 화면 컴포넌트. 시안 목록, 비교 스위처, 단독 화면 라우트가 함께 쓴다.
// G3에서 고르지 않은 안은 이 표와 해당 폴더(a|b|c|d), src/app/design-lab/home/<id>를 함께 지운다(T3.8).
import type { ComponentType } from "react";
import { HomeA } from "./a/home-a";
import { HomeB } from "./b/home-b";
import { HomeC } from "./c/home-c";
import { HomeD } from "./d/home-d";
import type { HomeVariantId, HomeVariantProps } from "./types";

export const HOME_VARIANTS: Readonly<
  Record<HomeVariantId, ComponentType<HomeVariantProps>>
> = {
  a: HomeA,
  b: HomeB,
  c: HomeC,
  d: HomeD,
};
