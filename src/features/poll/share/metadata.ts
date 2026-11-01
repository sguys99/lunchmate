// 투표 링크 메타데이터 (T7.14, POLL-04, POLL-09S, AC-POLL-4). /poll/[code] 페이지와 /poll/[code]/result 페이지의
// generateMetadata가 부른다: `export const generateMetadata = ({ params }) => params.then((p) => pollInviteMetadata(p.code))`.
// - og:image는 /api/og/poll/<code>?img=...&v=<버전>(D-17 안건 7, 8). 상대 주소는 루트 layout의 metadataBase가 절대 주소로 만든다.
// - 제목과 설명에는 식당 이름이 없다(T0.16-4). 검색 노출은 막는다(초대 링크는 받은 사람만 보는 주소).
import "server-only";
import type { Metadata } from "next";
import { shareCopy } from "@/copy/share";
import { pollResultHref, pollRoomHref } from "@/features/poll/routes";
import { pollOgAlt } from "./og-art";
import { loadPollOg, type OgImageKind, type PollOg } from "./og-data";
import { OG_SIZE } from "./og-art";
import { pollOgImagePath } from "./og-url";

const m = shareCopy.meta;

/** 순수 함수: 읽은 값 → Metadata (테스트용) */
export function buildPollMetadata(
  code: string,
  img: OgImageKind,
  og: PollOg,
): Metadata {
  const url = img === "result" ? pollResultHref(code) : pollRoomHref(code);
  let title: string;
  let description: string;
  if (og.state === "unavailable") {
    title = m.unavailableTitle;
    description = m.unavailableDescription;
  } else if (img === "result" && og.state === "closed") {
    title = m.resultTitle(og.rawTitle);
    description =
      og.voters !== null && og.topVotes !== null
        ? m.resultDescription(og.voters, og.topVotes)
        : m.resultDescriptionNoCount;
  } else {
    title = m.inviteTitle(og.rawTitle);
    description = m.inviteDescription(og.candidateCount, og.deadline);
  }
  const image = {
    url: pollOgImagePath(
      code,
      img,
      og.state === "unavailable" ? null : og.version,
    ),
    ...OG_SIZE,
    alt: pollOgAlt(og, img),
  };
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: shareCopy.brand,
      locale: "ko_KR",
      url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

async function load(code: string): Promise<PollOg> {
  try {
    return await loadPollOg(code);
  } catch {
    return { state: "unavailable" };
  }
}

/** 투표방 초대 링크 /poll/<code> */
export async function pollInviteMetadata(code: string): Promise<Metadata> {
  return buildPollMetadata(code, "invite", await load(code));
}

/** 결과 공유 링크 /poll/<code>/result */
export async function pollResultMetadata(code: string): Promise<Metadata> {
  return buildPollMetadata(code, "result", await load(code));
}
