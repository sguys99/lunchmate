// 시안 x 화면 → 컴포넌트 매핑 (T1.14). 스위처와 단독 화면 라우트가 함께 쓴다.
// G1 확정 후 시안 B만 남겼다(T1.20). G3 홈 시안을 더할 때는 DESIGN_IDS(types.ts)와 이 표에 함께 추가한다.
import type { ComponentType } from "react";
import { HomeScreenB } from "./b/home-screen";
import { SheetScreenB } from "./b/sheet-screen";
import type { DesignId, DesignScreenId, DesignScreenProps } from "./types";

export const DESIGN_SCREENS: Readonly<
  Record<
    DesignId,
    Readonly<Record<DesignScreenId, ComponentType<DesignScreenProps>>>
  >
> = {
  b: { home: HomeScreenB, sheet: SheetScreenB },
};
