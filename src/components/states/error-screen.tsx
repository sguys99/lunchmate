"use client";
// 화면 전체 오류 (T2.18, APP-06). error.tsx, global-error.tsx, (app)/error.tsx가 쓴다.
// 찾을 수 없음(NotFoundScreen)과 셸 밖 틀(StandaloneFrame)은 서버 안전한 screens.tsx에 있다.
//
// 구성: 오류 상태(제목, 설명, 기본 아이콘) + 버튼 두 개 + 참고 번호(digest, 있을 때만).
// - 다시 시도는 이 화면의 유일한 주 행동이라 primary, 오늘 추천으로는 secondary(포인트 버튼 1개 규칙).
// - 모바일은 버튼을 화면 아래(엄지 쪽 1/3)로 내리고, md 이상은 글 바로 아래 가로로 둔다.
// - 오류 메시지와 스택은 보여 주지 않는다(개발 중에도 같은 화면, 상세는 콘솔과 Sentry에서 본다).
//
// 번들 (T2.22): 루트 error.tsx와 global-error.tsx는 모든 라우트의 첫 로드에 들어간다. 그래서 이 파일은
// Button(Base UI), cn(tailwind-merge), messages.tsx, lucide-react, next/link를 쓰지 않고 state-view의 마크업과
// buttonClass()만 쓴다. 모양은 ErrorState + Button과 같다(같은 마크업, 같은 클래스 문자열, 같은 아이콘 선).
// "오늘 추천으로"는 <a>라서 전체 새로 고침으로 이동한다. 오류 뒤에는 클라이언트 상태를 버리고 새로 받는 편이 안전하다.
//
// 바깥 틀(여백, 폭)은 호출하는 쪽이 정한다: 앱 셸 안은 PageColumn, 셸 밖은 StandaloneFrame.
// 제목은 h1: 이 화면이 페이지 내용 전체를 대신하므로 문서의 첫 제목이 된다(셸 안과 밖 모두, axe page-has-heading-one, T2.17).
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { commonCopy } from "@/copy/common";
import { errorDigest, reportError } from "@/lib/errors/report-error";
import { ActionRow } from "./action-row";
import { CloudOffIcon } from "./inline-icons";
import { StateGlyphView, StateMessageView } from "./state-view";

const copy = commonCopy.errorPage;

export type ErrorScreenProps = {
  /** error.tsx가 받은 값. Error가 아닐 수도 있다 */
  error: unknown;
  /** error.tsx의 retry(). 세그먼트를 다시 받아 그린다 */
  onRetry: () => void;
  /** 오늘 추천으로 가는 경로. 셸 안은 /today, 셸 밖은 랜딩 / */
  homeHref: string;
  className?: string;
};

export function ErrorScreen({
  error,
  onRetry,
  homeHref,
  className,
}: ErrorScreenProps) {
  useEffect(() => {
    void reportError(error);
  }, [error]);
  const digest = errorDigest(error);

  return (
    <div
      data-slot="error-screen"
      className={`flex flex-1 flex-col${className ? ` ${className}` : ""}`}
    >
      <StateMessageView
        kind="error"
        live="alert"
        headingLevel="h1"
        title={copy.title}
        body={copy.body}
        visual={<StateGlyphView icon={CloudOffIcon} />}
      />
      <ActionRow>
        <button
          type="button"
          data-slot="button"
          data-variant="primary"
          className={buttonClass("primary")}
          onClick={onRetry}
        >
          {copy.retry}
        </button>
        <a href={homeHref} className={buttonClass("secondary")}>
          {copy.home}
        </a>
      </ActionRow>
      {digest ? (
        <p className="mt-6 type-caption break-all text-muted-foreground tabular-nums md:mt-10">
          {copy.reference(digest)}
        </p>
      ) : null}
    </div>
  );
}
