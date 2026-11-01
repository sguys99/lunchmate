"use client";
// 투표 만들기 시트 자리 (T7.11, T7.12). openPollCreate(intent)를 구독해 시트 본체(create-drawer.tsx)를 그때 받는다.
// 홈 첫 로드 예산(200KB) 때문에 이 자리 자체도 진입점을 처음 누른 뒤에 마운트한다(today-screen의 lazy).
// 투표 탭과 회식 화면은 (app)/poll/layout.tsx가 마운트한다.
import dynamic from "next/dynamic";
import { pollCreateCopy } from "@/copy/poll-create";
import type { CreateDrawerProps } from "./create-drawer";
import { usePollCreateIntent } from "./intent";

const copy = pollCreateCopy.sheet;

const load = () => import("./create-drawer");

function SheetFallback({ error }: { error?: unknown }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-7 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet">
      {error ? (
        <div role="alert" className="flex flex-col gap-1.5">
          <p className="type-label">{copy.loadFailed}</p>
          <p className="type-caption text-muted-foreground">
            {copy.loadFailedBody}
          </p>
        </div>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label={copy.loading}
          className="flex flex-col gap-3"
        >
          <span className="h-7 w-48 rounded-full bg-skeleton" />
          <span className="mt-2 h-12 w-full rounded-full bg-skeleton" />
          <span className="h-12 w-full rounded-full bg-skeleton" />
        </div>
      )}
    </div>
  );
}

const LazyDrawer = dynamic<CreateDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

export function preloadPollCreate(): void {
  void load().catch(() => undefined);
}

export default function PollCreateHost() {
  const intent = usePollCreateIntent((s) => s.intent);
  const isOpen = usePollCreateIntent((s) => s.isOpen);
  const nonce = usePollCreateIntent((s) => s.nonce);
  const close = usePollCreateIntent((s) => s.close);
  if (!intent) return null;
  return (
    <LazyDrawer
      key={nonce}
      open={isOpen}
      intent={intent}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
