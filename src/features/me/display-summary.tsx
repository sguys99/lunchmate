"use client";
// 설정 "화면" 줄의 값 (T6.13, D-12 안건 5). 화면 모드와 모션 줄이기는 이 기기 저장소 값이라 브라우저에서 읽는다.
// 저장소를 읽기 전(서버 렌더 포함)에는 비워 둔다(기본값이 잠깐 보였다 바뀌지 않게).
import { historyCopy } from "@/copy/history";
import { useUiPrefs } from "@/lib/ui-prefs/store";

const copy = historyCopy.display;

export function DisplaySummary() {
  const hydrated = useUiPrefs((s) => s.hydrated);
  const theme = useUiPrefs((s) => s.theme);
  const reduceMotion = useUiPrefs((s) => s.reduceMotion);
  if (!hydrated) return null;
  const parts: string[] = [copy.theme[theme]];
  if (reduceMotion) parts.push(copy.motionReduced);
  return <>{parts.join(", ")}</>;
}
