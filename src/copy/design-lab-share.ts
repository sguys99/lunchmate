// OG 이미지와 결과 공유 이미지 시안 문구 (T7.4, /design-lab/share/<a|b|c>). POLL-03, POLL-04, POLL-09S, copy-guide 4.13.
// 상태 안내, 오류, 정책은 습니다체, 초대와 축하는 해요체 (tasks.md 2.2절). 이미지 안 값 구분은 문자 대신 간격으로 나눈다.
// 제목(사용자 입력)과 식당 이름 뒤에는 조사를 붙이지 않는다(copy-guide 7.3). 그래서 "목요일 점심이 정해졌어요" 대신 쉼표로 잇는다.
// 시안을 고른 뒤(T7.5) 실제 구현 때 src/copy/poll.ts와 meta.ts로 옮긴다.

export const shareLabCopy = {
  names: {
    a: "시안 A 한 줄 제목",
    b: "시안 B 돌 한 줄",
    c: "시안 C 식권",
  },
  intents: {
    a: "마루 부리 큰 제목 한 줄과 숫자 두 칸. 여백이 이미지의 대부분입니다.",
    b: "후보 수만큼 옅은 돌(일러스트의 원)을 놓고, 결과에서는 한 돌에만 올리브 테두리를 두릅니다.",
    c: "점심 식권 한 장. 떼는 쪽에 마감 시각이나 1위 표 수를 크게 둡니다.",
  },

  brand: "런치메이트",

  /** 서버 OG 이미지 안 글 (식당 이름 없음, T0.16-4) */
  og: {
    inviteHeadline: (title: string) => `${title}, 어디로 갈까요?`,
    resultHeadline: (title: string) => `${title}, 정해졌어요`,
    inviteSub: (count: number) => `후보 ${count}곳 중 한 곳을 골라 주세요.`,
    resultSub: (voters: number, votes: number) =>
      `${voters}명이 참여했고 1위는 ${votes}표입니다.`,
    ticketInvite: { lunch: "점심 투표", party: "회식 투표" },
    ticketResult: { lunch: "점심 결과", party: "회식 결과" },
    labels: {
      candidates: "후보",
      deadline: "마감",
      voters: "참여",
      top: "1위",
    },
    units: { place: "곳", person: "명", vote: "표" },
    alt: {
      invite: (count: number, hhmm: string) =>
        `런치메이트 투표 초대, 후보 ${count}곳, ${hhmm} 마감`,
      result: (voters: number, votes: number) =>
        `런치메이트 투표 결과, ${voters}명 참여, 1위 ${votes}표`,
    },
  },

  /** 브라우저에서 만드는 결과 공유 이미지 안 글 (확정 식당 이름 사용 가능) */
  shareImage: {
    celebrate: {
      lunch: "오늘 점심은 여기로 정했어요.",
      party: "회식 장소가 정해졌어요.",
    },
    votesOf: (voters: number, votes: number) => `${voters}명 중 ${votes}표`,
    ticketFinal: "확정",
    alt: (title: string, placeName: string, voters: number, votes: number) =>
      `${title} 투표 결과 이미지, 1위 ${placeName}, ${voters}명 중 ${votes}표`,
  },

  /** 카카오톡 공유 템플릿 문구 제안 (Kakao.Share.sendDefault feed). 안마다 같은 구조 */
  kakao: {
    inviteTitle: (title: string) => `${title} 투표`,
    inviteDescription: (count: number, hhmm: string) =>
      `후보 ${count}곳 중에서 골라 주세요. ${hhmm}에 마감합니다.`,
    inviteButton: "투표하러 가기",
    resultTitle: (title: string) => `${title}, 정해졌어요`,
    resultDescription: (voters: number, votes: number) =>
      `${voters}명이 참여했고 1위는 ${votes}표입니다.`,
    resultButton: "결과 보기",
  },

  /** 시안 확인 화면 */
  page: {
    eyebrow: "T7.4 공유 이미지 시안",
    chatHeading: "카카오톡에서 보이는 모습",
    chatBody:
      "카카오톡 말풍선 모형입니다. 실제 크기는 기기마다 다르고, 이미지는 2:1로 보내 잘리지 않게 했습니다.",
    chatLight: "밝은 채팅방",
    chatDark: "어두운 채팅방",
    inviteCaption: "초대 링크 (서버 OG)",
    resultCaption: "결과 링크 (서버 OG, 식당 이름 없음)",
    shareCaption: "결과 공유 이미지 (브라우저에서 만듦)",
    sourceHeading: "원본 이미지",
    sourceBody:
      "서버 OG는 1200 x 600(2:1), 결과 공유 이미지는 1080 x 1080(1:1)입니다. 선은 다른 서비스가 1.91:1로 자를 때 남는 영역입니다.",
    safeToggle: "안전 영역 보기",
    smallHeading: "작게 볼 때",
    smallBody:
      "카카오톡 말풍선 폭(약 260px)으로 줄였을 때 글자가 읽히는지 봅니다.",
    shareHeading: "결과 공유",
    shareBody:
      "이미지는 이 기기에서 만들고 서버에 보관하지 않습니다. 카카오톡으로 보낼 때만 카카오 이미지 서버에 올라갑니다.",
    actions: {
      kakao: "카카오톡으로 보내기",
      save: "이미지 저장",
      share: "공유",
      retry: "다시 만들기",
    },
    demoSent:
      "시안에서는 카카오톡으로 보내지 않습니다. 실제 화면에서는 이미지를 올린 뒤 공유 창이 열립니다.",
    saved: "이미지를 저장했습니다.",
    shareUnsupported:
      "이 브라우저는 이미지 공유를 지원하지 않습니다. 이미지를 저장해 보내 주세요.",
    generating: "결과 이미지를 만드는 중입니다",
    sizeLabel: (w: number, h: number, kb: number) => `${w} x ${h}, 약 ${kb}KB`,
    bubbleSender: "점심탐험가",
  },

  states: {
    loading: { label: "공유 이미지를 불러오는 중입니다" },
    empty: {
      title: "아직 결과가 없습니다",
      body: "투표가 끝나면 결과 이미지를 만들 수 있습니다. 지금은 초대 링크만 보낼 수 있습니다.",
    },
    error: {
      title: "결과 이미지를 만들지 못했습니다",
      body: "다시 만들기를 눌러 주세요. 링크 공유는 그대로 할 수 있습니다.",
    },
    offline: {
      title: "오프라인입니다",
      body: "연결되면 카카오톡으로 보낼 수 있습니다. 이미지 저장은 지금도 할 수 있습니다.",
    },
  },
} as const;
