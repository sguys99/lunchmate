// 시안 x 화면 → 컴포넌트 매핑 (T1.14). 스위처와 단독 화면 라우트가 함께 쓴다.
// 시안 담당은 이 파일을 고치지 않는다. 각자 {a,b,c}/home-screen.tsx, sheet-screen.tsx만 고친다.
import type { ComponentType } from "react";
import { HomeScreenA } from "./a/home-screen";
import { SheetScreenA } from "./a/sheet-screen";
import { HomeScreenB } from "./b/home-screen";
import { SheetScreenB } from "./b/sheet-screen";
import { HomeScreenC } from "./c/home-screen";
import { SheetScreenC } from "./c/sheet-screen";
import type { DesignId, DesignScreenId, DesignScreenProps } from "./types";

export const DESIGN_SCREENS: Readonly<
  Record<
    DesignId,
    Readonly<Record<DesignScreenId, ComponentType<DesignScreenProps>>>
  >
> = {
  a: { home: HomeScreenA, sheet: SheetScreenA },
  b: { home: HomeScreenB, sheet: SheetScreenB },
  c: { home: HomeScreenC, sheet: SheetScreenC },
};
