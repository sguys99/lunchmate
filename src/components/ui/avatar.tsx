"use client";
// shadcn base-vega Avatar, DESIGN.md 토큰으로 재스타일 (T2.5). 투표 참여자, 나 화면 프로필.
// - 크기 sm 24 / default 32 / lg 40 / xl 56. 사진 위에 1px border 선을 겹쳐 밝은 사진도 바탕과 구분한다.
// - 대체(이니셜): muted 면 + muted-foreground 글자, 라운드 full. 사진이 없거나 실패하면 보인다.
// - 이미지 alt는 쓰는 쪽에서 닉네임을 넣는다. 장식용이면 alt="".
// - 사진(T9.10): Base UI가 미리 읽어 다 받은 뒤에만 <img>를 그린다. 받는 중과 실패는 대체(이니셜)가 같은 크기로 남아 흔들림이 없다.
//   카카오, 네이버 CDN이 외부 Referer를 막을 수 있어 referrerPolicy="no-referrer"가 기본이다(미리 읽기에도 같이 쓰인다).

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg" | "xl";
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xl]:size-14",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  referrerPolicy = "no-referrer",
  loading = "lazy",
  decoding = "async",
  ...props
}: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      referrerPolicy={referrerPolicy}
      loading={loading}
      decoding={decoding}
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted type-caption text-muted-foreground group-data-[size=sm]/avatar:text-[0.6875rem] group-data-[size=xl]/avatar:type-label",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-success text-background ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted type-caption text-muted-foreground tabular-nums ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
};
