// 앱 화면 안의 notFound() (T2.18). 예: 없는 투표방 코드(T7). 하단 탭이 남는다.
// 주소 자체가 없는 경우는 루트 not-found.tsx가 받는다.
import { APP_TABS, PageColumn } from "@/components/app-shell";
import { NotFoundScreen } from "@/components/states";

const todayHref = APP_TABS.find(({ id }) => id === "today")?.href ?? "/";

export default function AppNotFound() {
  return (
    <PageColumn>
      <NotFoundScreen homeHref={todayHref} />
    </PageColumn>
  );
}
