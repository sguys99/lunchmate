// 상태 메시지의 마크업만 담은 가벼운 층 (T2.22). messages.tsx(빈 상태, 오류, 오프라인)와
// 화면 전체 오류, 404(error-screen.tsx, screens.tsx)가 같은 모양을 쓰도록 여기서 한 번만 그린다.
//
// 이 파일은 cn(tailwind-merge), Base UI, "use client"에 의존하지 않는다. 루트 오류 경계는 모든 라우트 첫 로드에
// 들어가므로 무거운 공통 모듈을 끌고 오지 않게 하기 위해서다. 클래스 병합이 필요한 쪽(messages.tsx)은
// 바깥에서 cn으로 합친 최종 className을 넘긴다.
import { useId, type ComponentType, type ReactNode } from "react";

/** 선 아이콘. Lucide 아이콘이나 같은 속성을 받는 인라인 SVG(error-screen.tsx의 CloudOffIcon) */
export type StateIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

/** 그림 상자 기본 클래스. 카테고리 일러스트와 같은 96px 상자 */
export const STATE_GLYPH_CLASS = "relative block size-24 shrink-0";

/**
 * 상태 아이콘. 일러스트와 같은 자리(중심 40,42, 반지름 25)의 옅은 원 위에 1.4 선 아이콘.
 * className은 최종 값(기본 STATE_GLYPH_CLASS)이다.
 */
export function StateGlyphView({
  icon: Icon,
  className = STATE_GLYPH_CLASS,
}: {
  icon: StateIcon;
  className?: string;
}) {
  return (
    <span aria-hidden data-slot="state-glyph" className={className}>
      <span className="absolute top-[17px] left-[15px] size-[50px] rounded-full bg-muted" />
      <Icon
        className="absolute top-[24px] left-[22px] size-9 text-muted-foreground"
        strokeWidth={1.4}
      />
    </span>
  );
}

/** 상태 메시지 section 기본 클래스 */
export const STATE_MESSAGE_CLASS = "flex flex-col items-start";

export type StateMessageViewProps = {
  kind: "empty" | "error" | "offline";
  title: string;
  body?: ReactNode;
  /** 그림. null이나 undefined면 그리지 않는다(기본 그림은 호출하는 쪽이 정한다) */
  visual?: ReactNode;
  /** h1은 상태가 페이지 내용 전체를 대신할 때만(오류 화면, 404, T2.17) */
  headingLevel?: "h1" | "h2" | "h3";
  live?: "alert" | "status";
  /** 최종 className(기본 STATE_MESSAGE_CLASS) */
  className?: string;
  /** 제목과 설명 아래 버튼 자리(live region 밖) */
  children?: ReactNode;
};

/** 그림 → 제목 → 설명 → (버튼). 왼쪽 정렬, 제목으로 이름 붙은 section */
export function StateMessageView({
  kind,
  title,
  body,
  visual,
  headingLevel = "h2",
  live,
  className = STATE_MESSAGE_CLASS,
  children,
}: StateMessageViewProps) {
  const titleId = useId();
  const Heading = headingLevel;
  return (
    <section
      aria-labelledby={titleId}
      data-slot="state-message"
      data-state={kind}
      className={className}
    >
      {/* 그림 상자 안 원이 15px 안쪽에 있어, 8px 당겨 원이 글줄 왼쪽 근처에 오게 한다 */}
      {visual ? <div className="-ml-2">{visual}</div> : null}
      <div role={live} className="flex flex-col gap-3 pt-3">
        <Heading
          id={titleId}
          className="type-heading text-balance break-keep text-foreground"
        >
          {title}
        </Heading>
        {body ? (
          <p className="type-body-sm break-keep text-muted-foreground">
            {body}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
