// 공유 이미지 확인 화면 문구 (/design-lab/share/<a|b>, T7.4 시안 → T7.14, T7.20 구현 뒤 남긴 것, D-17).
// 실제 이미지와 공유 문구는 src/copy/share.ts. 여기에는 확인 화면의 설명 글만 둔다.
// 상태 안내, 설명은 습니다체 (tasks.md 2.2절).

export const shareLabCopy = {
  names: {
    a: "공유 확인 A 링크 미리보기(서버 OG)",
    b: "공유 확인 B 결과 공유 이미지",
  },
  intents: {
    a: "카카오톡 링크 미리보기에 쓰는 서버 OG입니다. 마루 부리 큰 제목 한 줄과 숫자 두 칸이고 식당 이름은 넣지 않습니다.",
    b: "결과 화면의 공유 시트입니다. 카테고리 그림이 주인공인 1:1 이미지를 이 기기에서 그립니다.",
  },

  page: {
    eyebrow: "T7.14, T7.20 공유 확인 화면",
    chatHeading: "카카오톡에서 보이는 모습",
    chatBody:
      "카카오톡 말풍선 모형입니다. 실제 크기는 기기마다 다르고, 이미지는 2:1로 보내 잘리지 않게 했습니다.",
    chatLight: "밝은 채팅방",
    chatDark: "어두운 채팅방",
    inviteCaption: "초대 링크 (서버 OG)",
    resultCaption: "결과 링크 (서버 OG, 식당 이름 없음)",
    sourceHeading: "원본 이미지",
    sourceBody:
      "서버 OG는 1200 x 600(2:1)입니다. 선은 다른 서비스가 1.91:1로 자를 때 남는 영역입니다.",
    safeToggle: "안전 영역 보기",
    smallHeading: "작게 볼 때",
    smallBody:
      "카카오톡 말풍선 폭(약 260px)으로 줄였을 때 글자가 읽히는지 봅니다.",
    shareHeading: "결과 공유",
    shareBody:
      "이미지는 이 기기에서 만들고 서버에 보관하지 않습니다. 카카오톡으로 보낼 때만 카카오 이미지 서버에 올라갑니다.",
    openSheet: "결과 공유 열기",
    bubbleSender: "점심탐험가",
  },
} as const;
