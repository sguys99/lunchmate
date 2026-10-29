// shadcn base-vega Badge, DESIGN.md 5장 "배지"로 재스타일 (T2.5). 기본 형태만 둔다.
// 도메인 배지(추정, 제보, 할인, 웨이팅, 기피 경고)는 T2.9에서 이 컴포넌트 위에 만든다.
//
// 라운드 8px(badge: sm), 높이 24, 좌우 8px, 1px 테두리 + caption 글자, 면 없음.
// 의미 색 variant는 테두리에 실색(warning, info ...), 글자에 *-foreground를 쓴다(대비 4.5:1은 foreground 쪽이 맡는다).
// neutral은 도메인 배지 calm 체계(G3)의 중립: input 선 + foreground 글자, 아이콘은 muted-foreground.
// 카드당 최대 2개는 쓰는 쪽에서 지킨다.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-badge border bg-transparent px-2 type-caption whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-border text-foreground",
        muted: "border-border text-muted-foreground",
        neutral:
          "border-input text-foreground [&>svg]:text-muted-foreground",
        success: "border-success text-success-foreground",
        warning: "border-warning text-warning-foreground",
        info: "border-info text-info-foreground",
        destructive: "border-destructive text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants, type BadgeProps };
