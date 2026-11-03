"use client";
// 카카오 장애 때 오늘(홈) "즐겨찾기에서 고르기" (T10.15, D-33 안건 4, PRD 12장 보조 동작, 시안 C 장애 홈).
// - 카카오 오류 카드 아래. today-screen이 오류가 난 뒤에만 React.lazy로 받고, 이 목록도 그때 처음 읽는다(my_favorite_memos).
// - 메모가 있는 즐겨찾기 3곳까지, 최근에 고친 메모 순. 줄을 누르면 카카오맵(place_url)을 새 탭에서 연다.
// - 이름은 카카오에서 받을 수 없으니 내 메모가 이름 자리다. 메모가 없는 즐겨찾기는 보이지 않는다.
// - 받는 동안 같은 높이 스켈레톤, 실패하거나 비면 아무것도 그리지 않는다(오류 카드가 이미 다음 행동을 안내한다).
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, StickyNote } from "lucide-react";
import { focusRing } from "@/components/ui/interaction";
import { memoCopy as copy } from "@/copy/memo";
import { memoKeys } from "./keys";
import { cn } from "@/lib/utils";
import { read } from "@/lib/read";

const kakaoLink = (placeId: string, placeUrl: string | null) =>
  placeUrl ?? `https://place.map.kakao.com/${placeId}`;

export default function FavoriteMemos({ className }: { className?: string }) {
  const q = useQuery({
    queryKey: memoKeys.favorites,
    queryFn: () => read("myFavoriteMemosAction"),
    staleTime: 60_000,
    retry: 1,
  });

  if (q.isPending) {
    return (
      <div
        role="status"
        aria-busy
        aria-label={copy.states.loading}
        className={cn("flex flex-col gap-2", className)}
      >
        <span className="h-4 w-28 rounded-full bg-skeleton" />
        <span className="mt-2 h-14 w-full rounded-md bg-skeleton" />
      </div>
    );
  }
  const list = q.data ?? [];
  if (list.length === 0) return null;

  return (
    <section
      aria-labelledby="memo-pick"
      className={cn(
        "flex flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-slow)]",
        className,
      )}
    >
      <h2 id="memo-pick" className="type-caption text-muted-foreground">
        {copy.pick.title}
      </h2>
      <p className="mt-1 type-caption break-keep text-muted-foreground">
        {copy.pick.note}
      </p>
      <ul className="mt-3 flex flex-col border-t border-border">
        {list.map((f) => (
          <li key={f.placeId}>
            <a
              href={kakaoLink(f.placeId, f.placeUrl)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.pick.openLabel(f.memo)}
              className={cn(
                "flex min-h-14 items-center gap-3 border-b border-border py-2",
                focusRing,
              )}
            >
              <StickyNote
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="min-w-0 flex-1 truncate type-label">
                {f.memo}
              </span>
              <span
                aria-hidden
                className="flex shrink-0 items-center gap-1 type-caption text-muted-foreground"
              >
                {copy.pick.open}
                <ExternalLink className="size-3" strokeWidth={1.75} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
