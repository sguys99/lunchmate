"use client";
// 브라우저 온라인 여부 (T2.7, PRD APP-02). navigator.onLine + online/offline 이벤트.
//
// - useSyncExternalStore로 구독해 여러 컴포넌트가 같은 값을 본다(찢김 없음).
// - SSR과 하이드레이션 첫 렌더는 "온라인"으로 둔다. 서버는 연결 상태를 모르고,
//   오프라인 화면을 서버 HTML에 굽지 않기 위해서다. 하이드레이션 뒤 실제 값으로 바뀐다.
// - navigator.onLine이 true여도 실제 인터넷이 된다는 보장은 없다(사설망만 연결 등).
//   그래서 오프라인 판정은 이 훅으로, 요청 실패는 각 쿼리의 오류 상태로 따로 다룬다.
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/** 지금 온라인이면 true. 서버 렌더와 하이드레이션 첫 렌더는 항상 true. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
