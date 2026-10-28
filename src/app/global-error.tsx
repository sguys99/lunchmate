"use client";
// 전역 오류 경계 (T2.18, APP-06). 루트 레이아웃이 깨졌을 때 그 자리를 대신하므로 html, body와 전역 스타일,
// 폰트를 직접 넣는다. metadata를 쓸 수 없어 React <title>로 탭 제목을 단다.
// 다크 모드는 tokens.css의 prefers-color-scheme 규칙이 그대로 따른다(루트 html에 .light/.dark를 붙이지 않음).
import "./globals.css";
import { maruBuri, pretendard } from "./fonts";
import { ErrorScreen } from "@/components/states/error-screen";
import { StandaloneFrame } from "@/components/states/screens";
import { siteCopy } from "@/copy/common";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html
      lang="ko"
      // cn(tailwind-merge)을 쓰지 않는다: 이 파일은 모든 라우트 첫 로드에 들어간다 (T2.22)
      className={`h-full antialiased ${pretendard.variable} ${maruBuri.variable}`}
    >
      <body className="flex min-h-full flex-col">
        <title>{siteCopy.name}</title>
        <StandaloneFrame>
          <ErrorScreen error={error} onRetry={retry} homeHref="/" />
        </StandaloneFrame>
      </body>
    </html>
  );
}
