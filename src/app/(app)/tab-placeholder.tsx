// 탭 화면 자리 표시 (T2.6). 실제 화면은 각 작업(오늘 T5, 지도 T5, 투표 T7, 나 T6)이 이 페이지를 바꿔 쓴다.
// 프로덕션에서는 (app) 레이아웃의 appShell 플래그로 보이지 않는다.
import { PageColumn, PageHeader } from "@/components/app-shell";
import { shellCopy } from "@/copy/shell";

export function TabPlaceholder({ title }: { title: string }) {
  return (
    <PageColumn>
      <PageHeader title={title} />
      <p className="mt-6 type-body-sm text-muted-foreground">
        {shellCopy.placeholder.body}
      </p>
    </PageColumn>
  );
}
