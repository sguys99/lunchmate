// 숫자 공용 컴포넌트(src/components/numbers) 문구 (T2.13). 화면 문구 규칙은 tasks.md 2.2절.
// 보이는 글자는 숫자뿐이라 여기 문장은 대부분 스크린 리더용이다.
export const numbersCopy = {
  /** 카운트다운 role="timer"의 이름. 0인 단위는 읽지 않는다. 예: "마감까지 1시간 2분 5초" */
  countdownLabel: (hours: number, minutes: number, seconds: number) => {
    const parts = [
      hours > 0 ? `${hours}시간` : "",
      hours > 0 || minutes > 0 ? `${minutes}분` : "",
      `${seconds}초`,
    ].filter(Boolean);
    return `마감까지 ${parts.join(" ")}`;
  },
  /** 마감 뒤 카운트다운 자리 */
  countdownClosed: "마감되었습니다",
} as const;
