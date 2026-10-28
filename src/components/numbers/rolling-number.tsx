"use client";
// 숫자 롤링 공용 컴포넌트 (T2.13). 득표 수, 👍 비율, 가격처럼 "값이 바뀌는 숫자"에 쓴다.
//
// - NumberFlow(@number-flow/react)를 감싸 타이밍을 DESIGN.md 모션 토큰으로 고정한다(timing.ts).
// - 축소 모드: useMotionReduced(앱 설정 reduce 또는 OS prefers-reduced-motion)면 animated=false로 즉시 바뀐다.
//   NumberFlow 자체의 respectMotionPreference는 끄고 이 값 하나로 판단한다(앱 설정 "줄이기"도 따르게).
// - tabular-nums: 자리 폭이 고정되어 숫자가 바뀌어도 옆 글자가 흔들리지 않는다. 글꼴 크기와 굵기는
//   부모의 type-numeric-* 클래스를 그대로 물려받는다(커스텀 엘리먼트 안으로 상속되는 속성).
// - 이 파일을 import하는 화면에만 NumberFlow 청크(약 5.6KB gzip)가 들어간다. 홈 첫 로드에 넣지 않는다.
import NumberFlow, { type NumberFlowProps } from "@number-flow/react";
import { useEffect, useState } from "react";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NUMBER_FLOW_TIMINGS } from "./timing";

export type RollingNumberProps = Omit<
  NumberFlowProps,
  | "animated"
  | "respectMotionPreference"
  | "transformTiming"
  | "spinTiming"
  | "opacityTiming"
> & {
  /**
   * 처음 보일 때 이 값에서 실제 값으로 굴러간다(예: 득표 수 0에서 시작).
   * NumberFlow는 값이 바뀔 때만 움직이므로 첫 프레임에 이 값을 그린 뒤 다음 프레임에 value로 바꾼다.
   * 축소 모드면 바로 value를 그린다.
   */
  from?: number;
};

export function RollingNumber({
  value,
  from,
  className,
  locales = "ko-KR",
  ...props
}: RollingNumberProps) {
  const reduced = useMotionReduced();
  const [mounted, setMounted] = useState(from === undefined);
  useEffect(() => {
    if (mounted) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  const shown = mounted || reduced || from === undefined ? value : from;
  return (
    <NumberFlow
      {...props}
      {...NUMBER_FLOW_TIMINGS}
      value={shown}
      locales={locales}
      animated={!reduced}
      respectMotionPreference={false}
      className={cn("tabular-nums", className)}
    />
  );
}
