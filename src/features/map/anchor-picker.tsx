"use client";
// 지도에서 기준 찍기 (D-15 안건 10, D-16 안건 9). 투표 만들기 "기준 바꾸기"(시트 안)와 회식 "기준 위치 바꾸기"(화면 안)가
// 같은 칸을 그 자리에 펼쳐 쓴다. 지도 SDK는 이 칸을 열 때만 받는다(anchor-picker-lazy.tsx).
//
// 좌표 경로 (CLAUDE.md 7장, T0.16, T0.18, 온보딩 핀 규칙 T4.16 그대로)
// - 기준이 되는 좌표는 사용자가 지도를 누르거나 핀을 끌어 놓은 UserPinnedLatLng 하나뿐이다(usePinPlacement, pinFromGesture).
// - 현위치 버튼은 지도 중심만 옮기고 핀을 비운다(MapMoveTarget). 그 좌표는 onConfirm으로 갈 수 없다(타입으로 막음).
// - 처음 지도 중심(initialCenter)은 지금 기준(저장된 사무실 핀이나 앞서 찍은 점)이고 핀을 만들지 않는다.
// 바닥 버튼은 테두리다. 올리브 면 버튼은 시트나 화면의 주 버튼 하나뿐이다(DESIGN.md 버튼 규칙).
import { useId, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { anchorPickerCopy as copy } from "@/copy/anchor-picker";
import {
  locateOnce,
  readGeoPermission,
} from "@/features/onboarding/geolocation";
import { OnboardingMap } from "@/features/onboarding/onboarding-map";
import type { UserPinnedLatLng } from "@/features/onboarding/pin";
import { LocateButton } from "@/features/onboarding/steps";
import { usePinPlacement } from "@/features/onboarding/use-pin-placement";
import type { LatLng } from "@/lib/map/types";
import { useOnlineStatus } from "@/lib/network/use-online-status";
import { cn } from "@/lib/utils";
import "@/features/onboarding/onboarding.css";

const PIN_DEPS = {
  locate: () => locateOnce(),
  readPermission: readGeoPermission,
};

export type AnchorPickerProps = {
  /** 처음 지도 중심(지금 기준). 핀은 만들지 않는다 */
  initialCenter: LatLng;
  /** 핀 둘레에 그릴 반경(m). 회식은 도보 15분, 투표방은 null(반경은 후보에 따라 정해짐) */
  radiusM?: number | null;
  /** 사용자가 놓은 핀만 받는다(현위치, 검색 좌표는 이 타입이 될 수 없다) */
  onConfirm: (pin: UserPinnedLatLng) => void;
  onCancel: () => void;
  /** 저장 중이면 핀 놓기와 버튼을 잠근다 */
  busy?: boolean;
  /** 제목 단계. 시트 안은 h3(시트 제목 h2 아래), 화면 안은 h2 */
  headingLevel?: 2 | 3;
  className?: string;
};

export function AnchorPicker({
  initialCenter,
  radiusM = null,
  onConfirm,
  onCancel,
  busy = false,
  headingLevel = 3,
  className,
}: AnchorPickerProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const titleId = useId();
  const needId = useId();
  const online = useOnlineStatus();
  const [announce, setAnnounce] = useState("");
  const pin = usePinPlacement({
    enabled: !busy,
    announce: setAnnounce,
    deps: PIN_DEPS,
  });
  const placed = pin.office.pin;
  const blocked = !placed || busy;

  return (
    <section
      aria-labelledby={titleId}
      // 시트 안에서 지도를 끌어도 시트가 닫히지 않게 한다(Base UI Drawer 스와이프 제외)
      data-base-ui-swipe-ignore=""
      className={cn("flex flex-col gap-3", className)}
    >
      <Heading id={titleId} className="type-label">
        {copy.title}
      </Heading>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.body}
      </p>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <div className="relative h-64 overflow-hidden rounded-card border border-border">
        <OnboardingMap
          pin={placed}
          interactive={!busy}
          radiusM={placed ? radiusM : null}
          dots={[]}
          onPinGesture={pin.placePin}
          registerMover={pin.registerMover}
          corner={
            !pin.locateHidden ? (
              <LocateButton ob={{ ...pin, online }} />
            ) : undefined
          }
          initialCenter={initialCenter}
          mapLabel={copy.mapLabel}
          pinTitle={copy.pinTitle}
          standalone
          className="absolute inset-0"
        />
      </div>
      {pin.locateFailed ? (
        <p role="status" className="type-caption break-keep text-foreground">
          {copy.locateFailed}
        </p>
      ) : null}
      <p
        id={needId}
        role="status"
        data-testid="anchor-pin-status"
        className={cn(
          "type-body-sm break-keep",
          placed ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {placed ? copy.pinPlaced : copy.needPin}
      </p>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.notice}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={buttonClass("ghost")}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          aria-disabled={blocked || undefined}
          aria-describedby={!placed ? needId : undefined}
          onClick={() => {
            if (placed && !busy) onConfirm(placed);
          }}
          className={buttonClass("secondary")}
        >
          {copy.confirm}
        </button>
      </div>
    </section>
  );
}
