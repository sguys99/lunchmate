"use client";
// 체크박스 (Base UI Checkbox, T4.2 약관 동의 시안에서 추가). shadcn base-vega checkbox와 같은 역할.
// DESIGN.md 2장 "선택 상태는 틴트 대신 1px 테두리나 밑줄": 켜지면 면을 칠하지 않고 테두리와 체크를 primary로 바꾼다.
// 상자는 22px, 터치 영역은 상자가 아니라 감싸는 <label> 줄 전체(높이 44 이상)로 잡는다. 쓰는 쪽에서
// <label className="flex min-h-11 items-center gap-3"><Checkbox /> 이용약관 동의</label>처럼 쓴다.
// Base UI Root는 <span role="checkbox">와 숨은 <input>을 그려서 감싸는 label 클릭으로 바뀐다.
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "./interaction";

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "className"> & {
  className?: string;
  /** lg: 26px(모두 동의 줄처럼 강조할 때) */
  size?: "md" | "lg";
};

function Checkbox({ className, size = "md", ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex shrink-0 items-center justify-center rounded-[0.4375rem] border-[1.5px] border-input bg-card text-primary",
        "transition-[border-color,color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
        "data-checked:border-primary data-indeterminate:border-primary",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        size === "lg" ? "size-[1.625rem]" : "size-[1.375rem]",
        focusRing,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        keepMounted
        className="flex items-center justify-center data-unchecked:opacity-0"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <Minus aria-hidden className="size-4" strokeWidth={2.25} />
            ) : (
              <Check
                aria-hidden
                className={size === "lg" ? "size-[1.125rem]" : "size-4"}
                strokeWidth={2.25}
              />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, type CheckboxProps };
