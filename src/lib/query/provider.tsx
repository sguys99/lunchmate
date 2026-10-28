"use client";
// QueryClientProvider (T2.19). (app) 레이아웃이 한 번 마운트한다.
// Devtools는 넣지 않는다(번들과 화면 노이즈). 필요하면 개발 전용 동적 import로 따로 붙인다.
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "./client";

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState 대신 모듈 싱글턴: 이 위에 Suspense 경계가 없어 첫 렌더가 suspend되면 state가 버려진다.
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
