"use client";
// 제보와 신고 질문 시트 진입점 (T6.15, T6.16, T6.19, T6.22, D-13). review-sheet, place-detail-sheet와 같은 방식.
//
//   const report = useReportSheet();
//   <button onClick={(e) => report.open({ kind: "deal", placeId, placeUrl }, e.currentTarget)}>할인 정보 알리기</button>
//   {report.sheet}
//
// - 시트 코드(Base UI Drawer, 입력 부품, 서버 액션)는 open()을 처음 부를 때 받는다. 그 전에는 sheet가 null이다.
// - 비로그인으로 알려져 있으면(한도 조회 결과) 시트 대신 로그인 유도 시트("report")를 띄운다.
// - 받는 동안은 바닥에 스켈레톤 시트, 받지 못하면(청크 실패, 오프라인) 안내 한 줄로 대신한다.
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { reportCopy } from "@/copy/report";
import { useLoginPrompt } from "@/features/auth/login-prompt/use-login-prompt";
import { dbKeys } from "@/lib/query/db-keys";
import type {
  ReportSheetConfig,
  ReportSheetDrawerProps,
} from "./report-sheet-drawer";

export type { ReportSheetConfig } from "./report-sheet-drawer";

const copy = reportCopy.sheet;

const load = () => import("./report-sheet-drawer");

function SheetFallback({ error }: { error?: unknown }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet min-[64rem]:mx-0 min-[64rem]:w-2/5 min-[64rem]:max-w-none min-[64rem]:px-10">
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
          <span className="h-7 w-44 rounded-full bg-skeleton" />
          <span className="mt-2 h-10 w-full rounded-full bg-skeleton" />
          <span className="h-12 w-full rounded-md bg-skeleton" />
        </div>
      )}
    </div>
  );
}

const LazyDrawer = dynamic<ReportSheetDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

export function preloadReportSheet(): void {
  void load().catch(() => undefined);
}

type State = { open: boolean; config: ReportSheetConfig; key: number };

export function useReportSheet(): {
  open: (config: ReportSheetConfig, opener?: HTMLElement | null) => void;
  close: () => void;
  preload: () => void;
  /** 한 탭 쓰기(웨이팅, 아직 해요)가 로그인을 요구할 때 */
  promptLogin: () => void;
  isOpen: boolean;
  sheet: ReactNode;
} {
  const client = useQueryClient();
  const login = useLoginPrompt();
  const [state, setState] = useState<State | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (config: ReportSheetConfig, opener?: HTMLElement | null) => {
      const limits = client.getQueryData<{ signedIn: boolean }>(
        dbKeys.dailyLimits,
      );
      if (limits && !limits.signedIn) {
        login.prompt("report");
        return;
      }
      openerRef.current = opener ?? null;
      // 열 때마다 새 입력 상태(key). 닫힌 뒤 초점은 config.finalFocus, 없으면 연 버튼
      setState((s) => ({
        open: true,
        config: {
          ...config,
          finalFocus: () =>
            config.finalFocus?.() ??
            (openerRef.current?.isConnected ? openerRef.current : null),
        },
        key: (s?.key ?? 0) + 1,
      }));
    },
    [client, login],
  );
  const close = useCallback(
    () => setState((s) => (s ? { ...s, open: false } : s)),
    [],
  );
  const onOpenChange = useCallback(
    (next: boolean) => setState((s) => (s ? { ...s, open: next } : s)),
    [],
  );
  const onSignedOut = useCallback(() => login.prompt("report"), [login]);

  const sheet = (
    <>
      {state ? (
        <LazyDrawer
          key={state.key}
          open={state.open}
          onOpenChange={onOpenChange}
          config={state.config}
          onSignedOut={onSignedOut}
        />
      ) : null}
      {login.sheet}
    </>
  );
  return {
    open,
    close,
    preload: preloadReportSheet,
    promptLogin: onSignedOut,
    isOpen: state?.open ?? false,
    sheet,
  };
}
