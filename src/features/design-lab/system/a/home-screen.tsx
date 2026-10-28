"use client";
// 시안 A "Terracotta Table" 비교 화면 1: 오늘(홈) 추천 카드 3장 + 하단 탭 (T1.11, T1.13).
// 지금은 자리표시. 시안 A 담당이 이 파일을 실제 화면으로 바꾼다(export 이름과 props는 유지).
import { PlaceholderScreen } from "../placeholder-screen";
import type { DesignScreenProps } from "../types";

export function HomeScreenA(props: DesignScreenProps) {
  return <PlaceholderScreen screen="home" {...props} />;
}
