// T7.4 공유 이미지 시안 쿼리 규약 (/design-lab/share/<a|b|c>, /design-lab/share/og)
//
//   ?state=ready|loading|empty|error|offline   4상태 (empty: 아직 결과가 없는 진행 중 투표)
//   ?kind=lunch|party                           끼니 투표 / 회식 투표 (목업 제목이 바뀐다)
//   ?title=<제목>                                긴 제목 확인용 (최대 20자, 넘으면 자름)
//   ?n=2~5                                       후보 수
//   ?at=HH:MM                                    마감 시각 (KST, 24시간제)
//   ?voters=<명> ?votes=<1위 표>                  결과 숫자
//   ?name=<식당 이름> ?cat=<카테고리 slug>          결과 공유 이미지(브라우저)에만 쓰는 확정 식당. 서버 OG는 읽지 않는다
//   ?safe=on                                     원본 이미지 위에 안전 영역 선을 켠 채로 연다
// OG 라우트만: ?img=invite|result (그림은 실제 PollOgArt, D-17 A)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";
import { CATEGORY_SLUGS, type CategorySlug } from "@/features/place/categories";
import type { PollOg } from "@/features/poll/share/og-data";
import type { OgImageKind } from "@/features/poll/share/types";

/** 남긴 확인 화면: a 서버 OG(링크 미리보기), b 결과 공유 이미지와 시트 (D-17) */
export type ShareVariant = "a" | "b";
export type { OgImageKind } from "@/features/poll/share/types";

export type ShareParams = {
  state: DesignState;
  kind: "lunch" | "party";
  title: string;
  candidates: number;
  deadline: string;
  voters: number;
  votes: number;
  placeName: string;
  category: CategorySlug;
  dateLabel: string;
  safe: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  return typeof v === "string" ? v : v?.[0];
}

function int(value: string | undefined, min: number, max: number, def: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

/** 목업 값은 모두 가상입니다 (식당 이름 포함). */
export function parseShareParams(raw: Raw): ShareParams {
  const kind = first(raw, "kind") === "party" ? "party" : "lunch";
  const at = first(raw, "at");
  const cat = first(raw, "cat");
  const title = (first(raw, "title") ?? "").trim().slice(0, 20);
  const voters = int(first(raw, "voters"), 2, 30, kind === "party" ? 12 : 5);
  return {
    state: parseDesignState(raw),
    kind,
    title: title || (kind === "party" ? "금요일 회식" : "목요일 점심"),
    candidates: int(first(raw, "n"), 2, 5, kind === "party" ? 5 : 3),
    deadline:
      at && /^([01]\d|2[0-3]):[0-5]\d$/.test(at)
        ? at
        : kind === "party"
          ? "17:00"
          : "12:30",
    voters,
    votes: int(first(raw, "votes"), 1, voters, kind === "party" ? 7 : 3),
    placeName:
      (first(raw, "name") ?? "").trim().slice(0, 30) ||
      (kind === "party" ? "들풀 한우 정육식당" : "정담국밥"),
    category:
      cat && (CATEGORY_SLUGS as readonly string[]).includes(cat)
        ? (cat as CategorySlug)
        : kind === "party"
          ? "gogi"
          : "gukbap",
    dateLabel: kind === "party" ? "11월 6일 금요일" : "11월 5일 목요일",
    safe: first(raw, "safe") === "on",
  };
}

export function parseVariant(value: string | undefined): ShareVariant {
  return value === "b" ? "b" : "a";
}

export function parseImageKind(value: string | undefined): OgImageKind {
  return value === "result" ? "result" : "invite";
}

/** OG 라우트에 넘길 쿼리 (서버 OG가 쓰는 값만. 식당 이름과 카테고리는 넣지 않는다) */
export function ogQuery(img: OgImageKind, p: ShareParams): string {
  const q = new URLSearchParams({
    img,
    kind: p.kind,
    title: p.title,
    n: String(p.candidates),
    at: p.deadline,
    voters: String(p.voters),
    votes: String(p.votes),
  });
  return q.toString();
}

/** 목업 값 → 실제 OG 그림 입력 (결과 그림이면 확정, 초대 그림이면 진행 중) */
export function labPollOg(p: ShareParams, img: OgImageKind): PollOg {
  if (p.state === "error") return { state: "unavailable" };
  return {
    state: img === "result" ? "closed" : "open",
    kind: p.kind,
    title: p.title,
    rawTitle: p.title,
    candidateCount: p.candidates,
    deadline: p.deadline,
    voters: p.voters,
    topVotes: p.votes,
    version: "lab",
  };
}
