"use client";
// 오늘(홈) 빈 상태, 오류, 오프라인, 위치 없음 (T5.21, T5.24, T5.16, PRD 12장, DESIGN.md 5장 "상태").
// 머리 아래 카드 면 안내. 빈 상태만 primary 버튼(이 화면에 다른 주 버튼이 없을 때). 모바일은 엄지 쪽(아래)에 붙인다.
// 공통 상태 컴포넌트(T2.7)를 쓰고, 두 번째 행동(네이버 지도 링크, 로그인 유도)은 그 아래 글자 버튼으로 둔다.
import { ExternalLink, MapPinOff } from "lucide-react";
import type { ReactNode } from "react";
import {
  EmptyState,
  ErrorState,
  OfflineState,
  StateGlyph,
} from "@/components/states";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { CategoryIllustration } from "@/features/place/illustrations";
import type { LatLng } from "@/lib/map/types";
import { naverPlaceSearchUrl } from "@/lib/naver/directions";
import { cn } from "@/lib/utils";
import type { Shortage } from "./deck";

const copy = homeCopy.today;
const states = homeCopy.states;

const secondaryText = cn(
  "inline-flex items-center gap-1.5 self-start rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
  hitArea44,
  focusRing,
);

export function StateCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-auto rounded-card border border-border bg-card px-7 pt-6 pb-8 @max-[23.75rem]/screen:px-5 desktop:mt-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 0곳 (REC-09): 넓힐 수 있으면 "N분까지 넓히기"(primary), 예산으로 빠진 곳이 있으면 "예산 조건 풀기" */
export function EmptyDeck({
  shortage,
  walk,
  onWiden,
  onRelaxBudget,
  signedIn,
}: {
  shortage: Extract<Shortage, { kind: "empty" }>;
  walk: number;
  onWiden: (to: number) => void;
  onRelaxBudget: () => void;
  signedIn: boolean;
}) {
  const { widenTo, overBudget } = shortage;
  const body =
    widenTo !== null
      ? states.empty.body(widenTo)
      : overBudget > 0
        ? copy.shortage.overBudget(overBudget)
        : copy.shortage.maxedBody;
  return (
    <StateCard>
      <EmptyState
        title={states.empty.title(walk)}
        body={body}
        visual={<CategoryIllustration slug="gukbap" />}
        action={
          widenTo !== null
            ? {
                label: states.empty.action(widenTo),
                onClick: () => onWiden(widenTo),
                variant: "primary",
              }
            : overBudget > 0
              ? {
                  label: copy.shortage.relaxBudget,
                  onClick: onRelaxBudget,
                  variant: "primary",
                }
              : signedIn
                ? { label: copy.shortage.editSettings, href: "/me/avoid" }
                : undefined
        }
      />
      {widenTo !== null && overBudget > 0 ? (
        <button
          type="button"
          onClick={onRelaxBudget}
          className={cn(secondaryText, "mt-4")}
        >
          {copy.shortage.relaxBudget}
        </button>
      ) : null}
    </StateCard>
  );
}

/** 카카오 오류, 한도 초과 (T5.24): 재시도 1회(래퍼) 뒤 안내 + 다시 시도 + 네이버 지도에서 주변 식당 보기 */
export function KakaoErrorCard({
  center,
  onRetry,
}: {
  /** 사무실 기준이면 그 핀을 네이버 지도 중심으로. 현위치는 링크에 싣지 않는다 */
  center: LatLng | null;
  onRetry: () => void;
}) {
  const naverHref = naverPlaceSearchUrl(copy.error.naverQuery, center);
  return (
    <StateCard>
      <ErrorState
        title={states.error.title}
        body={states.error.body}
        action={{ label: states.error.action, onClick: onRetry }}
      />
      <a
        href={naverHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(secondaryText, "mt-4")}
      >
        {copy.error.naverLink}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
      </a>
    </StateCard>
  );
}

export function OfflineCard() {
  return (
    <StateCard>
      <OfflineState title={states.offline.title} body={states.offline.body} />
    </StateCard>
  );
}

/** 저장 값 읽기 실패: 다시 시도는 화면 새로 불러오기 */
export function LoadFailedCard({ onRetry }: { onRetry: () => void }) {
  return (
    <StateCard>
      <ErrorState action={{ onClick: onRetry }} />
    </StateCard>
  );
}

/**
 * 위치를 하나도 쓸 수 없음 (PRD 12장 "사무실 미설정 + 권한 거부"): 사무실이 없고 현위치도 못 씀.
 * 둘러보기는 로그인 유도 시트(회사 위치 저장), 로그인 사용자는 사무실 추가 화면(주소 검색, 핀)으로 보낸다.
 * 로그인이 닫힌 환경(flags.auth 꺼짐)에서는 onSaveOffice가 없어 "다시 시도"가 유일한 주 버튼이 된다.
 */
export function NeedLocationCard({
  reason,
  signedIn,
  onRetry,
  onSaveOffice,
}: {
  reason: "denied" | "unavailable";
  signedIn: boolean;
  onRetry: () => void;
  onSaveOffice?: () => void;
}) {
  const t = copy.needLocation;
  const retryOnly = !signedIn && !onSaveOffice;
  return (
    <StateCard>
      <EmptyState
        title={t.title}
        body={
          retryOnly
            ? reason === "denied"
              ? t.deniedBrowse
              : t.unavailableBrowse
            : reason === "denied"
              ? t.denied
              : t.unavailable
        }
        visual={<StateGlyph icon={MapPinOff} />}
        action={
          signedIn
            ? {
                label: copy.location.addOffice,
                href: "/me/offices/new",
                variant: "primary",
              }
            : onSaveOffice
              ? {
                  label: copy.location.saveOffice,
                  onClick: onSaveOffice,
                  variant: "primary",
                }
              : { label: t.retry, onClick: onRetry, variant: "primary" }
        }
      />
      {retryOnly ? null : (
        <button
          type="button"
          onClick={onRetry}
          className={cn(secondaryText, "mt-4")}
        >
          {t.retry}
        </button>
      )}
      {!signedIn && !retryOnly ? (
        <p className="mt-4 type-caption break-keep text-muted-foreground">
          {copy.location.guestNote}
        </p>
      ) : null}
    </StateCard>
  );
}
