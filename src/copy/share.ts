// 투표 공유 문구: 서버 OG, 카카오톡 공유 템플릿, 결과 공유 시트와 이미지 (T7.13, T7.14, T7.20, POLL-03, POLL-04, POLL-09S).
// 정본 예문은 docs/copy-guide.md 4.13, 규칙은 DESIGN.md 5장 "공유 이미지"(D-17).
// 서버 OG와 링크 미리보기에는 식당 이름을 넣지 않는다(T0.16-4). 결과 공유 이미지(브라우저 생성)에만 이름을 쓴다.
// 제목(사용자 입력)과 식당 이름 뒤에는 조사를 붙이지 않고 쉼표나 줄 나눔으로 잇는다(copy-guide 7.3, D-17 안건 6).
// 초대와 축하는 해요체, 상태 안내, 오류, 고지는 습니다체 (tasks.md 2.2절). 버튼과 라벨은 명사형.
import type { PollKind } from "@/features/poll/share/types";

export const shareCopy = {
  brand: "런치메이트",

  /** 서버 OG 이미지 안 글 (식당 이름 없음) */
  og: {
    inviteHeadline: (title: string) => `${title}, 어디로 갈까요?`,
    resultHeadline: (title: string) => `${title}, 정해졌어요`,
    /** 제목에 서버 글꼴(KS X 1001) 밖 글자가 있을 때 제목 자리에 쓰는 말 (D-17 안건 4) */
    fallbackTitle: {
      lunch: "점심 투표",
      dinner: "저녁 투표",
      party: "회식 투표",
    } satisfies Record<PollKind, string>,
    inviteLabel: {
      lunch: "점심 투표",
      dinner: "저녁 투표",
      party: "회식 투표",
    } satisfies Record<PollKind, string>,
    resultLabel: {
      lunch: "점심 결과",
      dinner: "저녁 결과",
      party: "회식 결과",
    } satisfies Record<PollKind, string>,
    labels: {
      candidates: "후보",
      deadline: "마감",
      voters: "참여",
      top: "1위",
    },
    units: { place: "곳", person: "명", vote: "표" },
    /** 링크가 만료됐거나 취소된 방, 없는 코드 */
    unavailableHeadline: "열 수 없는 투표입니다",
    unavailableBody: "런치메이트에서 새 투표를 만들 수 있습니다.",
    /** 마감 시각이 오늘이 아니면 날짜를 붙인다 */
    deadlineDay: (month: number, day: number) => `${month}월 ${day}일`,
    alt: {
      invite: (count: number, deadline: string) =>
        `런치메이트 투표 초대, 후보 ${count}곳, ${deadline} 마감`,
      result: (voters: number, votes: number) =>
        `런치메이트 투표 결과, ${voters}명 참여, 1위 ${votes}표`,
      resultNoCount: "런치메이트 투표 결과",
      unavailable: "런치메이트 투표",
    },
  },

  /** 링크 메타 제목과 설명 (og:title, og:description). 식당 이름 없음 */
  meta: {
    inviteTitle: (title: string) => `${title} 투표`,
    inviteDescription: (count: number, deadline: string) =>
      `후보 ${count}곳 중에서 골라 주세요. ${deadline}에 마감합니다.`,
    resultTitle: (title: string) => `${title}, 정해졌어요`,
    resultDescription: (voters: number, votes: number) =>
      `${voters}명이 참여했고 1위는 ${votes}표입니다.`,
    resultDescriptionNoCount: "투표 결과를 런치메이트에서 확인할 수 있습니다.",
    unavailableTitle: "런치메이트 투표",
    unavailableDescription: "이 투표는 지금 열 수 없습니다.",
  },

  /** 카카오톡 공유 템플릿 (피드). 문구는 meta와 같은 말이고 버튼만 따로 */
  kakao: {
    inviteButton: "투표하러 가기",
    resultButton: "결과 보기",
  },

  /** 초대 공유 결과 안내 (토스트) */
  invite: {
    copied: "링크를 복사했습니다.",
    copyFailed: "링크를 복사하지 못했습니다. 주소를 길게 눌러 복사해 주세요.",
    shareFailed: "공유 창을 열지 못했습니다. 링크 복사로 보내 주세요.",
    /** Web Share 공유 본문 */
    shareText: (title: string, deadline: string) =>
      `${title} 투표에 들어와 주세요. ${deadline}에 마감합니다.`,
  },

  /** 결과 공유 시트 (D-17 안건 10) */
  sheet: {
    title: "결과 공유",
    close: "결과 공유 닫기",
    description:
      "이미지는 이 기기에서 만들고 런치메이트 서버에 보관하지 않습니다.",
    generating: "결과 이미지를 만드는 중입니다",
    kakao: "카카오톡으로 보내기",
    save: "이미지 저장",
    share: "공유",
    retry: "다시 만들기",
    sending: "카카오톡을 여는 중입니다",
    saved: "이미지를 저장했습니다.",
    kakaoFailed: "카카오톡으로 보내지 못했습니다. 이미지를 저장해 보내 주세요.",
    shareFailed: "공유하지 못했습니다. 이미지를 저장해 보내 주세요.",
    error: {
      title: "결과 이미지를 만들지 못했습니다",
      body: "다시 만들기를 눌러 주세요. 링크 공유는 그대로 할 수 있습니다.",
    },
    offline:
      "연결되면 카카오톡으로 보낼 수 있습니다. 이미지 저장은 지금도 할 수 있습니다.",
    /** 확정 식당 이름을 찾지 못했을 때 이미지에 쓰는 말 (T5.12a 미해결) */
    unnamedPlace: "정해진 곳",
    fileName: "lunchmate-result.png",
  },

  /** 결과 공유 이미지 안 글 (브라우저 생성, 이름 사용 가능) */
  image: {
    votesOf: (voters: number, votes: number) => `${voters}명 중 ${votes}표`,
    alt: (title: string, placeName: string, voters: number, votes: number) =>
      `${title} 결과, ${placeName}, ${voters}명 중 ${votes}표`,
  },
} as const;
