"use client";
// 홈 D1 확인 옵션 문맥 (T3.2). 단독 화면 라우트가 감싸고 useHomeLab, useJustPick, useYesterday가 읽는다.
import { createContext, use, type ReactNode } from "react";
import { HOME_LAB_DEFAULTS, type HomeLabOptions } from "./lab-options";

const HomeLabOptionsContext = createContext<HomeLabOptions>(HOME_LAB_DEFAULTS);

export function HomeLabOptionsProvider({
  value,
  children,
}: {
  value: HomeLabOptions;
  children: ReactNode;
}) {
  return (
    <HomeLabOptionsContext value={value}>{children}</HomeLabOptionsContext>
  );
}

export function useHomeLabOptions(): HomeLabOptions {
  return use(HomeLabOptionsContext);
}
