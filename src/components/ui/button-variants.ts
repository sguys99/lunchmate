// Button의 cva 변형 (T2.5, T2.22로 분리). 클래스 문자열의 단일 출처는 button-classes.ts.
// Base UI Button과 떨어뜨려 둔 이유: 서버 컴포넌트(page-header 등)가 링크에 버튼 모양만 입힐 때 button.tsx를 가져오면
// Base UI Button(클라이언트 모듈)의 참조가 그 라우트 첫 로드에 들어간다. 모양만 필요하면 여기서 가져온다.
import { cva } from "class-variance-authority";
import {
  buttonBaseClass,
  buttonSizeClasses,
  buttonVariantClasses,
} from "./button-classes";

export const buttonVariants = cva(buttonBaseClass, {
  variants: {
    variant: buttonVariantClasses,
    size: buttonSizeClasses,
  },
  compoundVariants: [
    // 텍스트 버튼은 글자 폭만 차지한다(터치 영역은 hitArea44가 넓힌다)
    { variant: "link", className: "h-auto px-0.5 py-0.5" },
  ],
  defaultVariants: {
    variant: "secondary",
    size: "default",
  },
});
