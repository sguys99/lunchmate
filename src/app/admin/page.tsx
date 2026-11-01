// /admin (T8.5, MOD-06): 신고된 후기, 폐업 제보, 사용자 정지, 처리 이력. 화면은 features/admin/admin-console.tsx.
// 관리자 확인은 layout.tsx(404)와 admin_* 보안 함수가 한다. 목록은 브라우저가 서버 액션으로 받는다(4상태, 다시 시도).
import { Suspense } from "react";
import { AdminConsole } from "@/features/admin/admin-console";
import { getAdminSession } from "@/features/admin/server";
import { adminCopy } from "@/copy/admin";

async function Console() {
  // 레이아웃이 이미 확인했으므로 여기서는 이름만 쓴다(같은 요청 안의 두 번째 읽기)
  const admin = await getAdminSession();
  return (
    <AdminConsole
      adminNickname={admin?.nickname ?? adminCopy.author.noNickname}
    />
  );
}

export default function Page() {
  return (
    <Suspense>
      <Console />
    </Suspense>
  );
}
