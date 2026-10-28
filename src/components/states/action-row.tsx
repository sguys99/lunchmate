// 화면 전체 상태(오류, 404)의 버튼 줄 (T2.18, T2.22로 분리).
// 모바일은 버튼을 화면 아래(엄지 쪽 1/3)로 내리고, md 이상은 글 바로 아래 가로로 둔다.
import type { ReactNode } from "react";

export function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="screen-actions"
      className="mt-auto flex flex-col gap-3 pt-10 md:mt-8 md:flex-row md:pt-0"
    >
      {children}
    </div>
  );
}
