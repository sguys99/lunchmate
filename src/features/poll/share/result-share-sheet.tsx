"use client";
// 결과 공유 시트 (T7.20, POLL-09S, D-17 B 그림 포스터, 안건 10). Base UI Drawer, 데스크톱은 가운데 대화상자.
// 투표방 결과 화면(P1)이 "결과 공유"(테두리 버튼)를 누른 뒤 next/dynamic으로 이 파일을 받는다(투표방 첫 로드 밖).
// - 시트가 열리면 이미지를 그린다(그리기 모듈 result-image.ts도 이때 동적 import). 서버와 CDN에 보관하지 않는다(T0.16-4).
// - 올리브 면 버튼은 시트 안 "카카오톡으로 보내기" 하나. 저장과 공유(Web Share 파일, 미지원이면 숨김)는 테두리 두 칸.
// - 카카오톡: Kakao.Share.uploadImage(이미지가 카카오 서버에 100일 남음, D-17 안건 9) → sendDefault 피드(결과 링크).
// - 결과 안내는 role="status" 한 줄. 그리기 실패는 다시 만들기, 오프라인이면 카카오톡만 aria-disabled.
import { Download, RotateCcw, Share2, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { shareCopy } from "@/copy/share";
import { CategoryIllustration } from "@/features/place/illustrations";
import { pollResultHref } from "@/features/poll/routes";
import { track } from "@/lib/analytics/track";
import { absoluteUrl } from "@/lib/env/site";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { ResultShareSheetProps } from "./types";

const t = shareCopy.sheet;

type Made = { url: string; blob: Blob };

function canShareFile(blob: Blob | null): boolean {
  if (!blob || typeof navigator === "undefined" || !navigator.canShare)
    return false;
  try {
    return navigator.canShare({
      files: [new File([blob], t.fileName, { type: "image/png" })],
    });
  } catch {
    return false;
  }
}

export function ResultShareSheet({
  open,
  onOpenChange,
  code,
  title,
  placeName,
  category,
  votes,
  voters,
}: ResultShareSheetProps) {
  const online = useOnlineStatus();
  const illoRef = useRef<HTMLDivElement>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const name = placeName ?? t.unnamedPlace;
  const votesOf = shareCopy.image.votesOf(voters, votes);
  const alt = shareCopy.image.alt(title, name, voters, votes);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const img = await import("./result-image");
        await img.ensureShareFonts(
          `${name}${title}${votesOf}${shareCopy.brand}0123456789`,
        );
        const svg = illoRef.current?.querySelector("svg");
        const illo =
          svg && category
            ? await img.loadImage(img.svgToDataUri(svg, category))
            : null;
        const canvas = document.createElement("canvas");
        img.drawResultImage(
          canvas,
          {
            title,
            placeName: name,
            category,
            voters,
            votes,
            texts: { brand: shareCopy.brand, votesOf },
          },
          illo,
        );
        const blob = await img.canvasToPng(canvas);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setMade({ url, blob });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setMade(null);
      setFailed(false);
    };
  }, [open, attempt, name, title, votesOf, category, voters, votes]);

  const ready = Boolean(made) && !failed;
  const shareable = canShareFile(made?.blob ?? null);

  const onKakao = useCallback(async () => {
    if (!made || !online || sending) return;
    setSending(true);
    setStatus(t.sending);
    try {
      const { loadKakaoShare } = await import("@/lib/kakao/share-sdk");
      const kakao = await loadKakaoShare();
      const file = new File([made.blob], t.fileName, { type: "image/png" });
      const up = await kakao.uploadImage({ file: [file] });
      const link = {
        mobileWebUrl: absoluteUrl(pollResultHref(code)),
        webUrl: absoluteUrl(pollResultHref(code)),
      };
      kakao.sendDefault({
        objectType: "feed",
        content: {
          title: shareCopy.meta.resultTitle(title),
          description: votesOf,
          imageUrl: up.infos.original.url,
          imageWidth: 1080,
          imageHeight: 1080,
          link,
        },
        buttons: [{ title: shareCopy.kakao.resultButton, link }],
      });
      setStatus("");
      track({ name: "poll_result_shared", properties: { channel: "kakao" } });
    } catch {
      setStatus(t.kakaoFailed);
    } finally {
      setSending(false);
    }
  }, [made, online, sending, code, title, votesOf]);

  const onSave = useCallback(() => {
    if (!made) return;
    const a = document.createElement("a");
    a.href = made.url;
    a.download = t.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus(t.saved);
    track({ name: "poll_result_shared", properties: { channel: "save" } });
  }, [made]);

  const onShare = useCallback(async () => {
    if (!made) return;
    const file = new File([made.blob], t.fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: alt });
      track({ name: "poll_result_shared", properties: { channel: "share" } });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setStatus(t.shareFailed);
    }
  }, [made, alt]);

  const disabledKakao = !ready || !online || sending;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop forceRender className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            className={cn(
              "max-h-[92dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-3 px-7 pt-4 pb-1 max-[23.75rem]:px-5 min-[64rem]:pt-6">
              <DrawerTitle className="min-w-0 flex-1 type-heading break-keep">
                {t.title}
              </DrawerTitle>
              <DrawerClose
                aria-label={t.close}
                className={cn(
                  "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <DrawerContent className="flex flex-col gap-5 px-7 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5">
              <DrawerDescription className="type-caption break-keep text-muted-foreground">
                {t.description}
              </DrawerDescription>

              {/* canvas가 그릴 일러스트 원본. 화면에는 보이지 않는다 */}
              {category ? (
                <div ref={illoRef} hidden>
                  <CategoryIllustration
                    slug={category}
                    size={420}
                    variant="card"
                  />
                </div>
              ) : null}

              <div className="mx-auto w-full max-w-[20rem]">
                {failed ? (
                  <div
                    role="alert"
                    className="flex aspect-square w-full flex-col items-start justify-end gap-3 rounded-card border border-border bg-card p-6"
                  >
                    <p className="type-label">{t.error.title}</p>
                    <p className="type-body-sm break-keep text-muted-foreground">
                      {t.error.body}
                    </p>
                    <button
                      type="button"
                      className={buttonClass("secondary", "sm")}
                      onClick={() => setAttempt((n) => n + 1)}
                    >
                      <RotateCcw aria-hidden />
                      {t.retry}
                    </button>
                  </div>
                ) : made ? (
                  // Blob URL이라 next/image 최적화 대상이 아니다
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={made.url}
                    alt={alt}
                    width={1080}
                    height={1080}
                    className="aspect-square w-full rounded-card border border-border"
                  />
                ) : (
                  <div aria-busy="true">
                    <span className="sr-only">{t.generating}</span>
                    <Skeleton className="aspect-square w-full rounded-card" />
                  </div>
                )}
              </div>

              {!online ? (
                <p className="flex items-start gap-2 type-body-sm break-keep text-muted-foreground">
                  <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {t.offline}
                </p>
              ) : null}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className={cn(buttonClass("primary"), "w-full")}
                  aria-disabled={disabledKakao || undefined}
                  onClick={onKakao}
                >
                  {t.kakao}
                </button>
                <div
                  className={cn(
                    "grid gap-3",
                    shareable ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  <button
                    type="button"
                    className={buttonClass("secondary")}
                    aria-disabled={!ready || undefined}
                    onClick={onSave}
                  >
                    <Download aria-hidden />
                    {t.save}
                  </button>
                  {shareable ? (
                    <button
                      type="button"
                      className={buttonClass("secondary")}
                      aria-disabled={!ready || undefined}
                      onClick={onShare}
                    >
                      <Share2 aria-hidden />
                      {t.share}
                    </button>
                  ) : null}
                </div>
                <p
                  role="status"
                  className="min-h-5 type-caption break-keep text-muted-foreground"
                >
                  {status}
                </p>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

export default ResultShareSheet;
