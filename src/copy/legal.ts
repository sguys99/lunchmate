// 이용약관, 개인정보 처리방침 자리 문구 (T4.11, PRD AUTH-02, 11장, D-08 안건 7, 8). 약관 문서는 습니다체 100%.
// 최종 전문은 공개 출시 전 확정한다(위치정보 부분은 T10.1 KISA 확인 뒤). 지금은 뼈대와 확정 전 고지만 둔다.

export type LegalSection = { heading: string; body: string };

export type LegalDocument = {
  metaTitle: string;
  title: string;
  updated: string;
  sections: readonly LegalSection[];
};

const pending =
  "이 문서는 확정 전 초안입니다. 정식 서비스 시작 전에 최종 문구로 바꾸고, 바뀐 내용은 시행 7일 전에 알립니다.";

export const legalCopy = {
  pendingLabel: "확정 전 초안",
  pending,
  backLabel: "뒤로",
  sectionsLabel: "조항",

  service: {
    metaTitle: "이용약관",
    title: "이용약관",
    updated: "시행일 미정",
    sections: [
      {
        heading: "제1조 목적",
        body: "이 약관은 런치메이트가 제공하는 식당 추천, 지도, 투표, 후기 서비스의 이용 조건과 절차를 정합니다.",
      },
      {
        heading: "제2조 가입과 연령",
        body: "카카오, 네이버, 구글 계정으로 가입합니다. 만 14세 미만은 가입할 수 없습니다.",
      },
      {
        heading: "제3조 서비스",
        body: "회사는 추천, 지도, 투표, 후기 기능을 제공합니다. 추천에는 광고와 할인 정보가 반영되지 않습니다.",
      },
      {
        heading: "제4조 이용자의 의무",
        body: "이용자는 사실과 다른 후기나 제보를 남기지 않습니다. 신고가 3건 쌓인 후기는 숨겨지고 관리자가 다시 판단합니다.",
      },
      {
        heading: "제5조 탈퇴",
        body: "이용자는 언제든 나 탭에서 탈퇴할 수 있습니다. 탈퇴하면 설정, 기록, 후기가 바로 삭제됩니다.",
      },
    ],
  },

  privacy: {
    metaTitle: "개인정보 처리방침",
    title: "개인정보 처리방침",
    updated: "시행일 미정",
    sections: [
      {
        heading: "수집 항목",
        body: "소셜 계정 식별자, 닉네임, 프로필 사진을 수집합니다. 이메일과 전화번호는 수집하지 않습니다.",
      },
      {
        heading: "이용 목적",
        body: "로그인, 투표 참여자 표시, 후기 작성자 표시, 추천 설정 저장에 씁니다.",
      },
      {
        heading: "위치정보",
        body: "현위치는 기기 안에서 추천 계산과 지도 이동에만 쓰고 서버, 분석 도구, 오류 모니터링으로 보내지 않습니다. 서버에 저장하는 위치는 이용자가 지도에 직접 놓은 사무실 핀 좌표뿐입니다. 주소 검색 결과 좌표는 지도 이동에만 쓰고 저장하지 않습니다.",
      },
      {
        heading: "후기 집계",
        body: "비공개로 남긴 후기도 가격, 👍, 태그는 이름 없이 식당 집계에 들어갑니다. 후기 글은 본인만 봅니다.",
      },
      {
        heading: "보관과 파기",
        body: "탈퇴하면 바로 삭제합니다. 결제 기능이 없어 법령상 따로 보관하는 정보는 없습니다.",
      },
    ],
  },
} as const satisfies {
  service: LegalDocument;
  privacy: LegalDocument;
  [key: string]: unknown;
};
