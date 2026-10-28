"use client";
// shadcn base-vega Slider, 예산과 도보 시간 슬라이더용으로 재스타일 (T2.5).
//
// - label을 주면 윗줄에 라벨(label)과 현재 값(numeric-md, tabular-nums)을 양끝에 둔다.
//   값 표시는 formatValue(예: formatWalkMinutes)로 화면과 aria-valuetext를 같은 문장으로 맞춘다.
//   범위 슬라이더(값 2개)는 "~"로 잇는다(문구 규칙: 범위는 ~).
// - label 없이 쓸 때는 thumbLabel(또는 aria-labelledby가 있는 Field)로 접근 가능한 이름을 준다.
// - 트랙 4px input 색, 채움 primary(가는 선이라 면 규칙 대상 아님), 손잡이 24px card 면 + 1.5px primary 테두리.
//   손잡이 터치 영역 44px. 조작 영역(Control) 높이도 44px.
// - 그림자 없음. 포커스는 손잡이 바깥 2px ring.
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hitArea44 } from "./interaction";

type SliderProps = SliderPrimitive.Root.Props & {
  /** 보이는 라벨. 있으면 값 표시 줄이 함께 나온다 */
  label?: ReactNode;
  /** 숫자 하나를 화면 문구로. 값 표시와 aria-valuetext가 함께 쓴다 */
  formatValue?: (value: number) => string;
  /** 보이는 라벨이 없을 때 손잡이의 aria-label */
  thumbLabel?: string;
  /** 값 표시 줄을 숨긴다(라벨만) */
  hideValue?: boolean;
};

const RANGE_JOINER = " ~ ";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  label,
  formatValue,
  thumbLabel,
  hideValue = false,
  ...props
}: SliderProps) {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [typeof value === "number" ? value : (defaultValue ?? min)];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("flex w-full flex-col gap-2", className)}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      {label != null && (
        <div className="flex items-baseline justify-between gap-4">
          <SliderPrimitive.Label
            data-slot="slider-label"
            className="type-label text-foreground"
          >
            {label}
          </SliderPrimitive.Label>
          {!hideValue && (
            <SliderPrimitive.Value
              data-slot="slider-value"
              className="type-numeric-md text-foreground"
            >
              {(formatted, current) =>
                (formatValue ? current.map(formatValue) : formatted).join(
                  RANGE_JOINER,
                )
              }
            </SliderPrimitive.Value>
          )}
        </div>
      )}
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-50"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1 w-full rounded-full bg-input select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full rounded-full bg-primary select-none"
          />
          {values.map((_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              // 손잡이 순서는 고정이라 index가 곧 정체성이다
              key={index}
              index={index}
              aria-label={label == null ? thumbLabel : undefined}
              getAriaValueText={
                formatValue ? (_formatted, v) => formatValue(v) : undefined
              }
              className={cn(
                "block size-6 shrink-0 rounded-full border-[1.5px] border-primary bg-card select-none",
                "transition-[background-color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                "data-dragging:bg-accent data-disabled:pointer-events-none",
                hitArea44,
              )}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider, type SliderProps };
