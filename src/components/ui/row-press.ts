// 목록 줄 눌림 클래스. interaction.ts와 나눈 이유: 홈 첫 로드(interaction.ts 포함)에 이 문자열을 넣지 않기 위해서다(T8.8).
/**
 * 목록 줄 눌림 (T8.8, 2026-11-01 사용자 결정 P1). 줄 전체가 버튼이나 링크인 목록(지도 목록, 설정 줄, 상세 접힘 행,
 * 투표 후보 줄)은 면을 칠하지 않고 줄 안 글자와 그림(직계 자식)만 opacity 0.6으로 흐린다. 여백 없는 줄에서도 잘려 보이지 않는다.
 */
export const rowPress =
  "*:transition-opacity *:duration-(--lm-duration-fast) *:ease-standard active:*:opacity-60 motion-reduce:*:transition-none";
