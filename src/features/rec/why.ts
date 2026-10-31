// "왜 추천했나요?" 문장 (REC-07, T5.19). 순수 함수.
// 카드 이유 한 줄(src/lib/reco/explain.ts)이 고른 요소(reasonKinds)를 먼저, 나머지 점수를 올린 요소를 기여도 순으로 잇는다.
// 끝에는 콜드 스타트 안내(후기 3건 미만)와 "할인과 광고는 추천에 반영하지 않습니다."(제품 원칙 6)를 붙인다.
// 할인 정보는 여기에도 쓰지 않는다(AC-DEAL-2).
import { recCopy } from "@/copy/rec";
import { formatPriceBand, walkMinutesFromMeters } from "@/lib/format/number";
import { reasonOptions, shortCategoryLabel } from "@/lib/reco/explain";
import { kstDayDiff } from "@/lib/time";
import type { ReasonKind, RecoPick } from "@/lib/reco/types";

const copy = recCopy.why;

/** 마지막 글자에 받침이 있는가(한글이 아니면 없음으로 본다) */
export function hasBatchim(word: string): boolean {
  const code = word.trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0;
}

/** 목적격 조사: "국밥을", "고기를" */
export function withObject(word: string): string {
  return `${word}${hasBatchim(word) ? "을" : "를"}`;
}

function likedPlaceLine(lastUpAt: Date, now: Date): string {
  const days = kstDayDiff(lastUpAt, now);
  const t = copy.likedPlace;
  if (days <= 0) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 7) return t.recent;
  if (days < 14) return t.lastWeek;
  return t.older;
}

function lineOf(kind: ReasonKind, pick: RecoPick, now: Date): string | null {
  const e = pick.evidence;
  const label = shortCategoryLabel(pick.candidate.category);
  switch (kind) {
    case "distance":
      return copy.distance(walkMinutesFromMeters(pick.candidate.distanceM));
    case "likedPlace":
      return e.lastUpAt ? likedPlaceLine(e.lastUpAt, now) : null;
    case "craving":
      return copy.craving(withObject(label));
    case "likedCategory":
      return copy.likedCategory(label);
    case "budget":
      return e.price.source === "report"
        ? copy.budget(formatPriceBand(e.price.priceKRW))
        : null;
    case "reputation":
      return e.thumbsUpPercent === null
        ? null
        : copy.reputation(e.thumbsUpPercent);
    case "novelty":
      return copy.novelty(withObject(label));
    case "newPlace":
      return copy.newPlace;
  }
}

/** 펼쳤을 때 보일 문장들. 같은 요소는 한 번만 */
export function whyLines(pick: RecoPick, now: Date): string[] {
  const kinds: ReasonKind[] = [...pick.reasonKinds];
  for (const o of reasonOptions(pick, now)) {
    if (!kinds.includes(o.kind)) kinds.push(o.kind);
  }
  const lines: string[] = [];
  for (const kind of kinds) {
    const line = lineOf(kind, pick, now);
    if (line && !lines.includes(line)) lines.push(line);
  }
  if (pick.evidence.thumbsUpPercent === null) lines.push(copy.coldStart);
  lines.push(copy.noAds);
  return lines;
}
