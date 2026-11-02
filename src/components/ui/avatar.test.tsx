// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

afterEach(cleanup);

/**
 * jsdom은 이미지를 받지 않는다. Base UI는 new window.Image()로 미리 읽으므로 그 객체를 붙잡아
 * onload, onerror를 직접 부른다(T9.10 사진 표시와 실패 대체).
 */
type FakeImage = {
  src: string;
  referrerPolicy: string;
  crossOrigin: string | null;
  complete: boolean;
  naturalWidth: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};
let images: FakeImage[] = [];
const RealImage = window.Image;

beforeEach(() => {
  images = [];
  window.Image = function FakeImageCtor(this: FakeImage) {
    Object.assign(this, {
      src: "",
      referrerPolicy: "",
      crossOrigin: null,
      complete: false,
      naturalWidth: 0,
      onload: null,
      onerror: null,
    });
    images.push(this);
  } as unknown as typeof window.Image;
});
afterEach(() => {
  window.Image = RealImage;
});

const PHOTO = "https://lh3.googleusercontent.com/a/test=s96-c";

function Face({ src }: { src?: string }) {
  return (
    <Avatar>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback>민</AvatarFallback>
    </Avatar>
  );
}

describe("Avatar", () => {
  it("이미지가 없으면 이니셜 대체가 보이고 크기 속성이 붙는다", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarImage alt="민지" />
        <AvatarFallback>민</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("민")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=avatar]")).toHaveAttribute(
      "data-size",
      "lg",
    );
  });

  it("사진을 받는 동안은 이니셜, 받으면 no-referrer, lazy 이미지로 바뀐다", () => {
    const { container } = render(<Face src={PHOTO} />);
    expect(screen.getByText("민")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    const pre = images.at(-1)!;
    expect(pre.src).toBe(PHOTO);
    // 미리 읽기에도 Referer를 보내지 않는다(카카오, 네이버 CDN 핫링크 차단 대비)
    expect(pre.referrerPolicy).toBe("no-referrer");

    act(() => pre.onload?.());
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", PHOTO);
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(screen.queryByText("민")).toBeNull();
  });

  it("사진을 받지 못하면 이니셜이 그대로 남는다", () => {
    const { container } = render(<Face src={PHOTO} />);
    act(() => images.at(-1)!.onerror?.());
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("민")).toBeInTheDocument();
  });
});
