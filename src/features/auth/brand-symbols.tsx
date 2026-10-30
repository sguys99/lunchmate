// 소셜 로그인 심볼 (T3.4, T4.6에서 design-lab에서 옮김). 색은 DESIGN.md color.*.brand 토큰(Tailwind fill-brand-*)만 쓴다.
// - 카카오: 말풍선 심볼, #000000 (카카오 로그인 디자인 가이드, 형태, 비율, 색 변경 금지)
// - 네이버: N 심볼, 흰색 (네이버 로그인 BI 가이드)
// - 구글: 표준 G 로고 4색, 흰 바탕 위 (Google Identity branding guidelines, 크기, 색 변경 금지)
// 출시 전 각 사가 내려주는 공식 SVG 에셋으로 바꿔 끼운다([확인 필요], 이 경로는 가이드 형태를 따라 다시 그린 것).
import { cn } from "@/lib/utils";

export function KakaoSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className={cn("size-[1.125rem] fill-brand-kakao-symbol", className)}
    >
      <path d="M9 1.6c-4.42 0-8 2.8-8 6.27 0 2.23 1.49 4.19 3.73 5.3l-.95 3.47c-.08.3.26.54.52.37l4.13-2.74c.19.01.38.02.57.02 4.42 0 8-2.8 8-6.42C17 4.4 13.42 1.6 9 1.6Z" />
    </svg>
  );
}

export function NaverSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("size-3.5 fill-brand-naver-foreground", className)}
    >
      <path d="M10.85 8.56 4.97 0H0v16h5.15V7.44L11.03 16H16V0h-5.15v8.56Z" />
    </svg>
  );
}

export function GoogleSymbol({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full bg-brand-google-logo-surface",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-[1.125rem]">
        <path
          className="fill-brand-google-red"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          className="fill-brand-google-blue"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          className="fill-brand-google-yellow"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          className="fill-brand-google-green"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    </span>
  );
}
