"use client";
// 칩 (T2.5). Toggle(chip variant) 하나와, 여러 칩을 묶는 ChipGroup(Base UI ToggleGroup).
// - 단독 칩: <Chip pressed onPressedChange>. aria-pressed로 선택 상태를 알린다.
// - 묶음: <ChipGroup multiple value={[...]} onValueChange> 안에 <Chip value="...">.
//   ChipGroup은 role="group"이므로 aria-label(또는 aria-labelledby)로 무엇을 고르는지 알린다.
// 칩 사이 간격 8px: 높이 40 + 간격 8이라 위아래 48px 터치 영역이 겹치지 않는다.
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";
import { Toggle, type ToggleProps } from "./toggle";

function Chip(props: Omit<ToggleProps, "variant">) {
  return <Toggle data-slot="chip" variant="chip" {...props} />;
}

function ChipGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="chip-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

export { Chip, ChipGroup };
