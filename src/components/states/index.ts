// 4상태 공통 컴포넌트 (T2.7). 로딩은 스켈레톤(스피너 금지), 빈 상태, 오류, 오프라인.
// 오프라인 판정은 @/lib/network의 useOnlineStatus.
export {
  CardSkeleton,
  ListSkeleton,
  LoadingRegion,
  SheetSkeleton,
  SkeletonLine,
  type SkeletonLineType,
} from "./loading";
export {
  EmptyState,
  ErrorState,
  OfflineState,
  StateGlyph,
  type EmptyStateProps,
  type ErrorStateProps,
  type OfflineStateProps,
  type StateAction,
  type StateActionWithDefaultLabel,
} from "./messages";
// 화면 전체 오류, 404, 셸 밖 틀 (T2.18). error.tsx, global-error.tsx, not-found.tsx가 쓴다.
// 오류 경계 파일은 번들을 위해 이 묶음 대신 ./error-screen, ./screens를 직접 가져온다 (T2.22).
export { ErrorScreen, type ErrorScreenProps } from "./error-screen";
export { NotFoundScreen, StandaloneFrame } from "./screens";
