// 아직 열지 않은 탭 안내 (5단계 마무리, 2026-10-31). 탭 4개(DESIGN.md, CLAUDE.md 6.2)는 그대로 두고,
// 열리지 않은 탭을 누르면 404나 자리 문구 대신 이 짧은 안내를 보여 준다.
// - 투표 탭(/poll): 투표방(T7)이 들어오기 전까지 항상.
// - 나 탭(/me와 그 아래): 로그인(flags.auth)이 꺼진 환경에서.
// 구성은 상태 메시지와 같다: 탭 아이콘 그림 → 제목 → 설명 → 버튼 하나(오늘 추천으로, 모바일은 엄지 쪽 아래).
// 나 탭 루트(/me)만 displaySettings로 그 아래 화면 설정(테마, 모션 줄이기, 진동)을 연다. 이 기기 저장이라 로그인이 필요 없다.
// 이때 버튼은 안내 바로 아래에 두고(설정에 밀려 내려가지 않게), 설정은 간격을 크게 띄운 별도 섹션으로 둔다.
// 포인트 컬러 버튼은 쓰지 않는다(버튼은 보조, 설정은 칩과 체크박스).
import { CircleUserRound, Vote } from "lucide-react";
import Link from "next/link";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ActionRow } from "@/components/states/action-row";
import {
  StateGlyphView,
  StateMessageView,
} from "@/components/states/state-view";
import { buttonClass } from "@/components/ui/button-classes";
import { commonCopy } from "@/copy/common";
import { soonCopy } from "@/copy/soon";
import { DisplaySettings } from "@/features/me/display-settings";

const KINDS = {
  poll: { tab: commonCopy.tabs.poll, icon: Vote },
  me: { tab: commonCopy.tabs.me, icon: CircleUserRound },
} as const;

export function ComingSoon({
  kind,
  displaySettings = false,
}: {
  kind: keyof typeof KINDS;
  /** 나 탭 루트(/me)에서만 true: 안내 아래 화면 설정을 연다 */
  displaySettings?: boolean;
}) {
  const { tab, icon } = KINDS[kind];
  const text = soonCopy[kind];
  const withDisplay = kind === "me" && displaySettings;
  const toToday = (
    <Link href="/today" className={buttonClass("secondary")}>
      {soonCopy.toToday}
    </Link>
  );
  return (
    <PageColumn>
      <PageHeader title={tab} />
      <div data-slot="coming-soon" className="mt-8 flex flex-1 flex-col">
        <StateMessageView
          kind="empty"
          title={text.title}
          body={withDisplay ? soonCopy.me.bodyWithDisplay : text.body}
          visual={<StateGlyphView icon={icon} />}
        />
        {withDisplay ? (
          <>
            <div className="mt-6 flex flex-col md:flex-row">{toToday}</div>
            <div className="mt-12 pb-8">
              <DisplaySettings title={soonCopy.me.displayTitle} />
            </div>
          </>
        ) : (
          <ActionRow>{toToday}</ActionRow>
        )}
      </div>
    </PageColumn>
  );
}
