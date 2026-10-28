// 화면 전체 상태의 서버 안전 부분 (T2.18, APP-06, T2.22): 찾을 수 없음, 셸 밖 틀, 버튼 줄.
// "use client"가 아니라서 루트 not-found.tsx(서버 컴포넌트)가 써도 클라이언트 번들에 들어가지 않는다.
// 오류 화면(ErrorScreen)은 다시 시도 버튼과 Sentry 보고 때문에 클라이언트라 error-screen.tsx에 따로 둔다.
//
// 무거운 공통 모듈(cn/tailwind-merge, Base UI Button)과 클라이언트 참조(next/link, lucide-react Icon)를 쓰지 않는다.
// 루트 not-found는 모든 라우트 첫 로드에 클라이언트 참조를 더하기 때문이다. 버튼 모양은 buttonClass(), 이동은 <a>(전체 새로 고침).
// 제목은 h1: 이 화면이 페이지 내용 전체를 대신하므로 문서의 첫 제목이 된다(셸 안과 밖 모두, axe page-has-heading-one, T2.17).
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { commonCopy } from "@/copy/common";
import { ActionRow } from "./action-row";
import { UtensilsIcon } from "./inline-icons";
import { StateGlyphView, StateMessageView } from "./state-view";

/** 없는 주소나 notFound(). 다음 행동은 오늘 추천으로 하나뿐이라 primary */
export function NotFoundScreen({
  homeHref,
  className,
}: {
  homeHref: string;
  className?: string;
}) {
  const { title, body, action } = commonCopy.states.notFound;
  return (
    <div
      data-slot="not-found-screen"
      className={`flex flex-1 flex-col${className ? ` ${className}` : ""}`}
    >
      <StateMessageView
        kind="empty"
        headingLevel="h1"
        title={title}
        body={body}
        visual={<StateGlyphView icon={UtensilsIcon} />}
      />
      <ActionRow>
        <a href={homeHref} className={buttonClass("primary")}>
          {action}
        </a>
      </ActionRow>
    </div>
  );
}

/**
 * 앱 셸 밖(루트 오류, 전역 오류, 루트 404)의 바깥 틀. PageColumn과 같은 폭과 좌우 여백,
 * 위는 조금 더 내려 화면 위 1/3쯤에서 글이 시작하게 한다. safe-area는 viewport-fit 없이도 0이라 안전하다.
 */
export function StandaloneFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-[max(4rem,18dvh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}
