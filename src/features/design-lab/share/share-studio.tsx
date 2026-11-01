"use client";
// 결과 공유 이미지 시연 (T7.4 시안, POLL-09S). 이 기기에서 canvas로 그리고 Blob URL로만 보여 준다.
// 카카오톡 보내기는 시안에서 실제로 보내지 않는다(실제: Kakao.Share.uploadImage → sendDefault, T7.20).
// 저장은 a[download], 공유는 Web Share Level 2(files). 포인트 컬러 면 버튼은 "카카오톡으로 보내기" 하나다.
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share2, RotateCcw, WifiOff } from "lucide-react";
import { shareLabCopy } from "@/copy/design-lab-share";
import { buttonClass } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIllustration } from "@/features/place/illustrations";
import type { DesignState } from "@/features/design-lab/mock";
import {
  drawShareImage,
  ensureShareFonts,
  loadImage,
  SHARE_IMAGE_SIZE,
  svgToDataUri,
  type ShareImageData,
  type SharePaletteHex,
} from "./share-canvas";

const t = shareLabCopy.page;

type Result = { url: string; blob: Blob };

export function ShareStudio({
  data,
  palette,
  state,
}: {
  data: ShareImageData;
  palette: SharePaletteHex;
  state: DesignState;
}) {
  const illoRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(state === "error");
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);

  const offline = state === "offline";
  const skip = state === "loading" || state === "empty";

  useEffect(() => {
    if (skip) return;
    if (state === "error" && attempt === 0) return;
    let cancelled = false;
    let made: string | null = null;
    (async () => {
      try {
        await ensureShareFonts(
          `${data.placeName}${data.title}${Object.values(data.texts).join("")}${data.dateLabel}0123456789`,
        );
        const svg = illoRef.current?.querySelector("svg");
        const illo =
          svg && data.variant !== "a"
            ? await loadImage(svgToDataUri(svg, palette, data.category))
            : null;
        const canvas = document.createElement("canvas");
        drawShareImage(canvas, data, palette, illo);
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/png"),
        );
        if (!blob) throw new Error("toBlob");
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setResult({ url: made, blob });
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [data, palette, skip, state, attempt]);

  const fileName = `lunchmate-${data.variant}.png`;

  const onShare = useCallback(async () => {
    if (!result) return;
    const file = new File([result.blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // 사용자가 공유 창을 닫은 경우. 따로 알리지 않는다.
      }
    } else {
      setStatus(t.shareUnsupported);
    }
  }, [result, fileName]);

  const alt = shareLabCopy.shareImage.alt(
    data.title,
    data.placeName,
    data.voters,
    data.votes,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* canvas가 그릴 일러스트 원본. 화면에는 보이지 않는다 */}
      <div ref={illoRef} hidden>
        <CategoryIllustration slug={data.category} size={420} variant="card" />
      </div>

      <div className="mx-auto w-full max-w-[360px]">
        {state === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">{shareLabCopy.states.loading.label}</span>
            <Skeleton className="aspect-square w-full rounded-card" />
          </div>
        ) : state === "empty" ? (
          <StateBox
            title={shareLabCopy.states.empty.title}
            body={shareLabCopy.states.empty.body}
          />
        ) : failed ? (
          <StateBox
            title={shareLabCopy.states.error.title}
            body={shareLabCopy.states.error.body}
            action={
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RotateCcw aria-hidden />
                {t.actions.retry}
              </button>
            }
          />
        ) : result ? (
          // Blob URL이라 next/image 최적화 대상이 아니다
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.url}
            alt={alt}
            width={SHARE_IMAGE_SIZE}
            height={SHARE_IMAGE_SIZE}
            className="aspect-square w-full rounded-card border border-border"
          />
        ) : (
          <div aria-busy="true">
            <span className="sr-only">{t.generating}</span>
            <Skeleton className="aspect-square w-full rounded-card" />
          </div>
        )}
        {result && !failed && !skip ? (
          <p className="mt-2 type-caption text-muted-foreground tabular-nums">
            {t.sizeLabel(
              SHARE_IMAGE_SIZE,
              SHARE_IMAGE_SIZE,
              Math.round(result.blob.size / 1024),
            )}
          </p>
        ) : null}
      </div>

      {offline ? (
        <p className="flex items-start gap-2 type-body-sm text-muted-foreground">
          <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          {shareLabCopy.states.offline.body}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={`${buttonClass("primary")} w-full`}
          aria-disabled={offline || !result || skip || failed || undefined}
          onClick={() => {
            if (offline || !result) return;
            setStatus(t.demoSent);
          }}
        >
          {t.actions.kakao}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={result && !skip && !failed ? result.url : undefined}
            download={fileName}
            role="button"
            aria-disabled={!result || skip || failed || undefined}
            className={buttonClass("secondary")}
            onClick={() => result && setStatus(t.saved)}
          >
            <Download aria-hidden />
            {t.actions.save}
          </a>
          <button
            type="button"
            className={buttonClass("secondary")}
            aria-disabled={!result || skip || failed || undefined}
            onClick={onShare}
          >
            <Share2 aria-hidden />
            {t.actions.share}
          </button>
        </div>
        <p role="status" className="min-h-5 type-caption text-muted-foreground">
          {status}
        </p>
      </div>
    </div>
  );
}

function StateBox({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex aspect-square w-full flex-col items-start justify-end gap-3 rounded-card border border-border bg-card p-7">
      <p className="type-heading">{title}</p>
      <p className="type-body-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
