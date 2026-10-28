// LazyMotion 비동기 기능 묶음 (T2.11): drag, layout 애니메이션이 필요할 때만 받는다 (provider.tsx loadDomMax).
// 홈 첫 번들에는 domAnimation만 들어가고, 이 파일은 별도 청크로 나뉜다(T0.27).
import { domMax } from "motion/react";

export default domMax;
