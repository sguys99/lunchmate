"use client";
// 홈 시안 비교 옵션 문맥 (T3.2). 단독 화면 라우트와 비교 스위처가 감싸고, 카드 조각(card-bits)과 useHomeLab이 읽는다.
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
