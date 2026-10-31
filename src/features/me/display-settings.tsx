"use client";
// 화면 설정 (T4.25, SET-04, D-04): 화면 모드(시스템, 라이트, 다크), 모션 줄이기, 진동. 이 기기에만 저장한다(src/lib/ui-prefs).
// 누르면 바로 적용되고 저장 버튼이 없다. 저장소를 읽기 전에는 컨트롤을 잠근다(기본값이 잠깐 보였다 바뀌지 않게).
// 로그인 없이 쓰는 기기 저장이라, 로그인이 꺼진 환경의 /me 안내 화면(app/(app)/coming-soon.tsx)에서도 그대로 쓴다.
// 화면 모드는 칩 세 개(단일 선택, 칩 규칙), 켜고 끄기는 체크박스 줄(약관 화면과 같은 컴포넌트).
import { useId, useSyncExternalStore } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { meCopy } from "@/copy/me";
import { isHapticsSupported } from "@/lib/haptics";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/ui-prefs/prefs";
import { useUiPrefs } from "@/lib/ui-prefs/store";

const copy = meCopy.display;
const subscribeNever = () => () => {};

function ToggleRow({
  label,
  body,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  body: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const bodyId = useId();
  return (
    <li>
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="type-body">{label}</span>
          <span
            id={bodyId}
            className="type-caption break-keep text-muted-foreground"
          >
            {body}
          </span>
        </span>
        <Checkbox
          checked={checked}
          disabled={disabled}
          aria-describedby={bodyId}
          onCheckedChange={(v) => onChange(v === true)}
        />
      </label>
    </li>
  );
}

/** title: 섹션 제목. 기본은 로그인된 /me의 "화면", 로그인이 꺼진 /me 안내 화면은 "화면 설정"을 넘긴다 */
export function DisplaySettings({
  title = meCopy.sections.display,
}: {
  title?: string;
} = {}) {
  const themeId = useId();
  const hydrated = useUiPrefs((s) => s.hydrated);
  const theme = useUiPrefs((s) => s.theme);
  const reduceMotion = useUiPrefs((s) => s.reduceMotion);
  const haptics = useUiPrefs((s) => s.haptics);
  const setTheme = useUiPrefs((s) => s.setTheme);
  const setReduceMotion = useUiPrefs((s) => s.setReduceMotion);
  const setHaptics = useUiPrefs((s) => s.setHaptics);
  // 진동 지원 여부는 브라우저에서만 안다(서버 렌더와 맞추려고 마운트 뒤에 읽는다)
  const vibrate = useSyncExternalStore(
    subscribeNever,
    isHapticsSupported,
    () => null,
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        <li className="flex flex-col gap-3 py-4">
          <span id={themeId} className="type-body">
            {copy.theme}
          </span>
          <ChipGroup
            aria-labelledby={themeId}
            value={[theme]}
            disabled={!hydrated}
            onValueChange={(v) => {
              const next = v[0];
              // 이미 고른 칩을 다시 누르면 비는데, 화면 모드는 늘 하나라 무시한다
              if (
                typeof next === "string" &&
                (THEME_PREFERENCES as readonly string[]).includes(next)
              )
                setTheme(next as ThemePreference);
            }}
          >
            {THEME_PREFERENCES.map((t) => (
              <Chip key={t} value={t}>
                {copy.themeOptions[t]}
              </Chip>
            ))}
          </ChipGroup>
          <p className="type-caption text-muted-foreground">{copy.themeHint}</p>
        </li>
        <ToggleRow
          label={copy.reduceMotion}
          body={copy.reduceMotionBody}
          checked={reduceMotion}
          disabled={!hydrated}
          onChange={setReduceMotion}
        />
        <ToggleRow
          label={copy.haptics}
          body={vibrate === false ? copy.hapticsUnsupported : copy.hapticsBody}
          checked={haptics}
          disabled={!hydrated}
          onChange={setHaptics}
        />
      </ul>
    </section>
  );
}
