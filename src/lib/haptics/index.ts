// 햅틱 피드백 유틸 (T2.14, tasks.md 5장 S10). navigator.vibrate를 지원하는 기기(주로 Android Chrome)에서만
// 짧게 진동하고, 미지원 환경(iOS Safari, 데스크톱 대부분, SSR)에서는 아무 일도 하지 않는다.
//
// - 의미 기반 4종만 둔다. 화면 코드는 밀리초를 직접 쓰지 않고 kind를 고른다.
// - 진동은 "보조" 신호다. 진동만으로 결과를 알리지 않는다(시각 피드백이 항상 함께 있어야 한다).
// - 끄는 조건은 앱 설정 "진동" off(setHapticsEnabled(false)) 하나뿐이다. 나 탭 화면 설정(T4.25)이 "모션 줄이기"와
//   "진동"을 두 토글로 나눴으므로 OS prefers-reduced-motion과 앱 "모션 줄이기"는 진동을 끄지 않는다(design-decisions D-04).
//   값은 src/lib/ui-prefs(UiPrefsProvider)가 저장소에서 읽어 setHapticsEnabled로 맞춘다.
// - 사용자 제스처 제약: Chrome은 페이지에 사용자 활성화(sticky user activation)가 한 번도 없으면
//   vibrate를 무시하고 false를 돌려준다(콘솔 경고 포함). 그래서 탭, 스와이프 손 뗌, 버튼 클릭 같은
//   제스처 핸들러 안에서만 부른다. Realtime 수신, 타이머, 효과(useEffect) 안에서 부르지 않는다.
//   예: 투표 마감 브로드캐스트를 받았을 때는 진동하지 않고, 사용자가 직접 확정 버튼을 눌렀을 때만 진동.
// - 백그라운드 탭, iframe(권한 정책 vibrate 차단)에서도 무시될 수 있다. 실패는 모두 조용히 삼킨다.
// - 스로틀: 마지막으로 진동한 뒤 MIN_INTERVAL_MS 안의 호출은 버린다(연타, 스와이프 중 반복 호출 방지).
//
// 연결 제안(아직 연결하지 않음, PoC 결과에 따라):
// - 카드 스와이프로 다음 카드 확정(손을 떼어 넘어간 순간): "select"
// - 다시 뽑기(셔플) 버튼: "tap"
// - 투표 확정, 회식 장소 확정(축하 화면 진입과 같은 순간): "success"
// - 되돌릴 수 없는 동작 확인 단계(투표 마감 확인, 다시 안 갈 곳 지정): "warning"
// - 일반 버튼, 탭 이동, 칩 토글에는 쓰지 않는다(진동이 잦으면 의미가 사라진다).

/** 진동 의미. tap: 가벼운 누름, select: 선택 확정, success: 완료(짧게 두 번), warning: 주의. */
export type HapticKind = "tap" | "select" | "success" | "warning";

/** kind별 진동 패턴(ms). 배열은 [진동, 쉼, 진동, ...]. 모두 100ms 이하로 짧게 둔다. */
export const HAPTIC_PATTERNS: Readonly<
  Record<HapticKind, number | readonly number[]>
> = {
  tap: 10,
  select: 15,
  success: [12, 60, 12],
  warning: [30, 50, 30],
};

/** 이 간격(ms) 안의 연속 호출은 무시한다. */
export const MIN_INTERVAL_MS = 80;

let enabled = true;
let lastAt = Number.NEGATIVE_INFINITY;

/** 앱 설정 "진동" 켜기/끄기. 화면 설정 저장소(src/lib/ui-prefs)가 값이 바뀔 때마다 부른다. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** 이 브라우저가 navigator.vibrate를 갖고 있으면 true. SSR에서는 false. */
export function isHapticsSupported(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

/**
 * 짧은 진동을 요청한다. 실제로 vibrate를 불렀고 브라우저가 받아들였으면 true.
 * 미지원, 꺼짐, 스로틀, 브라우저 거부(제스처 밖 호출 등), 예외는 모두 false.
 * 반환값으로 UI를 분기하지 않는다(진동은 보조 신호).
 */
export function haptic(kind: HapticKind): boolean {
  try {
    if (!enabled) return false;
    if (!isHapticsSupported()) return false;

    const now = Date.now();
    if (now - lastAt < MIN_INTERVAL_MS) return false;
    lastAt = now;

    const pattern = HAPTIC_PATTERNS[kind];
    return navigator.vibrate(
      typeof pattern === "number" ? pattern : [...pattern],
    );
  } catch {
    return false;
  }
}

/** 테스트 전용: 모듈 상태(설정, 스로틀 시각)를 처음으로 되돌린다. */
export function resetHapticsForTest(): void {
  enabled = true;
  lastAt = Number.NEGATIVE_INFINITY;
}
