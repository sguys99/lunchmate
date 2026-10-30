"use client";
// 사무실 추가 (T4.23, SET-01). 온보딩 1단계(D-07 B 지도 위 시트, DESIGN.md 5장 "온보딩")와 같은 틀과 핀 규칙을 쓴다.
// - 앱 셸(하단 탭) 위를 덮는 전체 화면. 모바일은 지도 위 + 아래 시트, 데스크톱은 왼쪽 460 패널 + 오른쪽 지도.
// - 핀 규칙 (ONB-01, AC-ONB-3, T0.16, T0.18): 검색과 현위치는 지도만 옮기고 핀을 비운다. 지도를 누르거나 핀을 끌어
//   놓아야만 저장이 켜진다. 저장 요청의 좌표는 officeSaveInput(핀)에서만 만든다(usePinPlacement, office-draft.ts).
// - 이름은 기본 "사무실 N"(N = 지금 개수 + 1)이고 바꿀 수 있다.
// - 저장하면 사무실 목록으로 돌아간다. 실패하면 핀과 이름은 그대로 두고 안내.
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Input } from "@/components/ui/input";
import { meCopy } from "@/copy/me";
import { onboardingCopy } from "@/copy/onboarding";
import {
  locateOnce,
  readGeoPermission,
} from "@/features/onboarding/geolocation";
import { officeSaveInput } from "@/features/onboarding/office-draft";
import { OnboardingMap } from "@/features/onboarding/onboarding-map";
import {
  LocateButton,
  LocationNotes,
  LocationSearch,
} from "@/features/onboarding/steps";
import { usePinPlacement } from "@/features/onboarding/use-pin-placement";
import { cn } from "@/lib/utils";
import type { AddOfficeRequest, SettingsResult } from "./requests";
import { SaveNotes } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const copy = meCopy.officeNew;
const PIN_DEPS = {
  locate: () => locateOnce(),
  readPermission: readGeoPermission,
};

export function OfficeNewScreen({
  defaultName,
  backHref,
  submit,
}: {
  defaultName: string;
  backHref: string;
  submit: (req: AddOfficeRequest) => Promise<SettingsResult>;
}) {
  const router = useRouter();
  const nameId = useId();
  const needId = useId();
  const [announce, setAnnounce] = useState("");
  const [name, setName] = useState(defaultName);
  const { state, save } = useSettingsSave();
  const pin = usePinPlacement({
    enabled: !state.busy,
    announce: setAnnounce,
    deps: PIN_DEPS,
  });
  const trimmed = name.trim();
  const blocked = !pin.canSave || !trimmed || state.busy || !state.online;
  const ob = { ...pin, online: state.online };

  async function onSave() {
    const office = officeSaveInput(pin.office);
    if (!office || blocked) return;
    const ok = await save(
      () => submit({ name: trimmed, office }),
      () => meCopy.offices.saved.added,
    );
    if (ok) router.replace(backHref);
  }

  return (
    <div className="@container/screen fixed inset-0 z-40 flex flex-col bg-background font-sans text-foreground">
      <div className="relative flex h-dvh min-h-[36rem] flex-col overflow-hidden desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]">
        <div className="relative min-h-44 flex-1 desktop:order-2 desktop:min-h-0 desktop:border-l desktop:border-border">
          <OnboardingMap
            pin={pin.office.pin}
            interactive={!state.busy}
            radiusM={null}
            dots={[]}
            onPinGesture={pin.placePin}
            registerMover={pin.registerMover}
            corner={!pin.locateHidden ? <LocateButton ob={ob} /> : undefined}
            className="absolute inset-0"
          />
        </div>

        <section
          aria-label={copy.title}
          className="relative z-20 -mt-7 flex max-h-[72dvh] flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet desktop:order-1 desktop:mt-0 desktop:max-h-none desktop:rounded-none desktop:bg-background desktop:shadow-none"
        >
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
          />
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>
          <header className="flex h-12 shrink-0 items-center justify-end px-(--lm-layout-gutter) desktop:h-20 desktop:items-end desktop:px-10 desktop:pb-2">
            <Link
              href={backHref}
              aria-label={copy.close}
              className={cn(
                "-mr-3 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              <X aria-hidden className="size-5" strokeWidth={1.75} />
            </Link>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--lm-layout-gutter) desktop:px-10">
            <div className="flex flex-col pb-6">
              <h1 className="type-title text-balance break-keep">
                {copy.title}
              </h1>
              <p className="mt-2 type-body-sm break-keep text-muted-foreground">
                {copy.body}
              </p>
              <div className="mt-5">
                <LocationSearch ob={ob} />
              </div>
              <div className="mt-5">
                <LocationNotes ob={pin} />
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <label
                  htmlFor={nameId}
                  className="type-caption text-muted-foreground"
                >
                  {copy.nameLabel}
                </label>
                <Input
                  id={nameId}
                  value={name}
                  maxLength={20}
                  enterKeyHint="done"
                  placeholder={meCopy.offices.namePlaceholder}
                  onChange={(e) => setName(e.currentTarget.value)}
                />
              </div>
            </div>
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-border px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:px-10 desktop:pb-8">
            <SaveNotes state={state} />
            {state.online && !state.error && !pin.canSave ? (
              <p
                id={needId}
                className="text-center type-caption text-muted-foreground"
              >
                {onboardingCopy.location.needPin}
              </p>
            ) : null}
            <button
              type="button"
              aria-disabled={blocked || undefined}
              aria-busy={state.busy || undefined}
              aria-describedby={!pin.canSave ? needId : undefined}
              onClick={() => void onSave()}
              className={cn(
                buttonClass("primary"),
                "relative w-full overflow-hidden",
              )}
            >
              {state.busy ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 bg-primary-foreground/60 motion-safe:animate-pulse"
                />
              ) : null}
              {state.busy ? copy.saving : copy.save}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
