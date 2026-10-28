"use client";
// 첫 토스트 때 Sonner를 받는 토스트 (T2.22). 앱 화면은 이 파일의 toast()와 <LazyToaster />를 쓴다.
//
// 왜: 전역 <Toaster />를 (app) 레이아웃에 바로 두면 sonner(약 9KB gzip)와 아이콘이 홈 첫 로드에 들어간다.
// 토스트는 사용자가 무언가를 한 뒤에만 뜨므로 첫 호출 때 sonner와 Toaster(sonner.tsx)를 함께 받는다.
// - toast.success(...) 등은 sonner를 import한 뒤 같은 이름의 함수를 부른다. 그 사이 <LazyToaster />가 Toaster를 마운트한다.
// - Sonner는 Toaster가 구독하기 전에 만든 토스트도 구독 시점에 다시 보내 주므로(ToastState.subscribe) 첫 토스트가 사라지지 않는다.
// - 반환값은 Promise<토스트 id>. 바로 닫을 일이 있으면 id 옵션을 직접 정해 넘긴다.
// 디자인 랩처럼 첫 로드가 상관없는 곳은 sonner.tsx의 Toaster, toast를 그대로 써도 된다.
import type { ExternalToast } from "sonner";
import { lazy, Suspense, useSyncExternalStore } from "react";

type ToastId = string | number;
type Message = string;

let requested = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadSonner() {
  if (!requested) {
    requested = true;
    for (const listener of listeners) listener();
  }
  return import("sonner");
}

type Kind = "success" | "error" | "info" | "warning" | "message";

function show(kind: Kind | null, message: Message, data?: ExternalToast) {
  return loadSonner().then(({ toast }) =>
    kind ? toast[kind](message, data) : toast(message, data),
  );
}

/** sonner toast의 지연 판. `toast.success(commonCopy.toasts.linkCopied)` */
export const toast = Object.assign(
  (message: Message, data?: ExternalToast): Promise<ToastId> =>
    show(null, message, data),
  {
    success: (message: Message, data?: ExternalToast) =>
      show("success", message, data),
    error: (message: Message, data?: ExternalToast) =>
      show("error", message, data),
    info: (message: Message, data?: ExternalToast) =>
      show("info", message, data),
    warning: (message: Message, data?: ExternalToast) =>
      show("warning", message, data),
    message: (message: Message, data?: ExternalToast) =>
      show("message", message, data),
    /** 아직 sonner를 받지 않았으면 띄운 토스트가 없으므로 아무 일도 하지 않는다 */
    dismiss: (id?: ToastId) => {
      if (!requested) return;
      void import("sonner").then(({ toast }) => toast.dismiss(id));
    },
  },
);

const Toaster = lazy(() =>
  import("./sonner").then((mod) => ({ default: mod.Toaster })),
);

/** 앱 셸에 한 번만 둔다. 첫 toast() 호출 전에는 아무것도 그리지 않고 아무것도 받지 않는다 */
export function LazyToaster() {
  const active = useSyncExternalStore(
    subscribe,
    () => requested,
    () => false,
  );
  if (!active) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}

/** 테스트 전용: 요청 상태 초기화 */
export function resetLazyToasterForTest() {
  requested = false;
}
