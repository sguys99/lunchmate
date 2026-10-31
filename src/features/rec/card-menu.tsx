"use client";
// 오늘(홈) 큰 카드 더 보기 메뉴 (REC-08, T5.20). card-more.tsx가 버튼에 손, 포커스가 닿거나 누를 때 React.lazy로 받는다.
// 메뉴 모양과 키보드 동작은 상세 더 보기(PlaceMoreMenu, Base UI Menu)를 그대로 쓴다.
//
// 항목
// - 즐겨찾기 담기, 빼기: 상세와 같은 useFavorite(로그인 유도, 다시 안 갈 곳 충돌 안내, favorite_added source rec).
// - 다시 안 갈래요: 비로그인은 로그인 유도. 누르면 바로 카드를 빼고(onBlocked, 다음 후보로 교체) 서버에 넣는다.
//   즐겨찾기에 있으면 서버가 즐겨찾기에서 빼고 넣는다. 토스트 "다시 추천하지 않습니다." + 되돌리기(빼고, 뺐던 즐겨찾기는 다시 담음).
//   저장에 실패하면 카드를 되돌린다(onRestored).
// - 투표에 추가: pollEntry 플래그가 켜지고 onAddToPoll이 있을 때만(7단계).
// 서버로 가는 값은 place_id, place_url뿐이다(CLAUDE.md 7장).
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Ban, Star, Vote } from "lucide-react";
import { toast } from "@/components/ui/lazy-toaster";
import { recCopy } from "@/copy/rec";
import { placeCopy } from "@/copy/place";
import { setBlockedAction, setFavoriteAction } from "@/features/place/actions";
import {
  PlaceMoreMenu,
  type MoreMenuAction,
} from "@/features/place/detail/more-menu";
import {
  placeUserStateKey,
  useFavorite,
} from "@/features/place/detail/use-place-actions";
import { isEnabled } from "@/lib/flags";
import type { TodayCard } from "./card-model";

const copy = recCopy.cardActions;

export type CardMenuProps = {
  card: TodayCard;
  online: boolean;
  signedIn: boolean;
  label: string;
  triggerClassName: string;
  defaultOpen?: boolean;
  /** 카드를 묶음에서 빼고 다음 후보로 바꾼다(세션 제외 + 하드 필터) */
  onBlocked: (placeId: string) => void;
  /** 뺀 카드를 되돌린다(저장 실패, 되돌리기) */
  onRestored: (placeId: string) => void;
  /** 비로그인: 로그인 유도 시트 */
  onLogin: () => void;
  onAddToPoll?: (card: TodayCard) => void;
};

type BlockTarget = Pick<
  CardMenuProps,
  "onBlocked" | "onRestored" | "onLogin"
> & { placeId: string; placeUrl: string; client: QueryClient };

const UNDO_TOAST_MS = 6000;

/** 다시 안 갈래요. 컴포넌트가 사라진 뒤(카드가 바뀜)에도 되돌리기가 동작하게 상태 없는 함수로 둔다 */
async function block(t: BlockTarget): Promise<void> {
  const target = { placeId: t.placeId, placeUrl: t.placeUrl };
  t.onBlocked(t.placeId);
  const result = await setBlockedAction({ ...target, on: true }).catch(
    () => null,
  );
  if (!result?.ok) {
    t.onRestored(t.placeId);
    if (result?.error === "unauthenticated") {
      t.onLogin();
      return;
    }
    void toast(
      result?.error === "limit"
        ? copy.toasts.blockLimit
        : copy.toasts.blockFailed,
    );
    return;
  }
  const unfavorited = result.on && result.unfavorited;
  void t.client.invalidateQueries({ queryKey: placeUserStateKey(t.placeId) });
  void toast(copy.toasts.blocked, {
    description: unfavorited ? copy.toasts.blockedUnfavorited : undefined,
    duration: UNDO_TOAST_MS,
    action: {
      label: copy.toasts.undo,
      onClick: () => void undo(t, unfavorited),
    },
  });
}

async function undo(t: BlockTarget, refavorite: boolean): Promise<void> {
  const target = { placeId: t.placeId, placeUrl: t.placeUrl };
  t.onRestored(t.placeId);
  const result = await setBlockedAction({ ...target, on: false }).catch(
    () => null,
  );
  if (!result?.ok) {
    t.onBlocked(t.placeId);
    void toast(copy.toasts.undoFailed);
    return;
  }
  if (refavorite) {
    await setFavoriteAction({ ...target, on: true }).catch(() => null);
  }
  void t.client.invalidateQueries({ queryKey: placeUserStateKey(t.placeId) });
  void toast(copy.toasts.undone);
}

export default function CardMenu({
  card,
  online,
  signedIn,
  label,
  triggerClassName,
  defaultOpen,
  onBlocked,
  onRestored,
  onLogin,
  onAddToPoll,
}: CardMenuProps) {
  const client = useQueryClient();
  const fav = useFavorite({
    placeId: card.id,
    placeUrl: card.placeUrl,
    online,
    source: "rec",
  });

  const actions: MoreMenuAction[] = [
    {
      key: "favorite",
      label: fav.on ? copy.favoriteOff : copy.favoriteOn,
      icon: Star,
      onSelect: () => void fav.toggle(),
      // 상태를 읽는 동안 누르면 비로그인으로 오인해 로그인을 권하게 된다
      disabled: fav.loading || fav.pending,
    },
    {
      key: "block",
      label: copy.block,
      icon: Ban,
      onSelect: () => {
        if (!online) {
          void toast(placeCopy.toasts.offline);
          return;
        }
        if (!signedIn) {
          onLogin();
          return;
        }
        void block({
          placeId: card.id,
          placeUrl: card.placeUrl,
          client,
          onBlocked,
          onRestored,
          onLogin,
        });
      },
    },
  ];
  if (onAddToPoll && isEnabled("pollEntry")) {
    actions.push({
      key: "poll",
      label: copy.addToPoll,
      icon: Vote,
      onSelect: () => onAddToPoll(card),
      disabled: !online,
    });
  }

  return (
    <>
      <PlaceMoreMenu
        actions={actions}
        reports={[]}
        label={label}
        side="bottom"
        iconClassName="size-4"
        defaultOpen={defaultOpen}
        triggerClassName={triggerClassName}
      />
      <span role="status" className="sr-only">
        {fav.message}
      </span>
      {fav.loginSheet}
    </>
  );
}
