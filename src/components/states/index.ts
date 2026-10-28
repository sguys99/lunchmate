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
