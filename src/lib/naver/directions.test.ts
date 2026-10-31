import { describe, expect, it } from "vitest";
import {
  isMobileUserAgent,
  naverAppName,
  naverPlaceSearchUrl,
  naverWebWalkUrl,
  nmapWalkUrl,
} from "./directions";

const dest = {
  name: "정담 국밥",
  position: { lat: 37.4979502, lng: 127.0276368 },
};
const office = {
  kind: "office" as const,
  name: "사무실",
  position: { lat: 37.5, lng: 127.03 },
};
const current = { ...office, kind: "current" as const, name: "현위치" };

describe("naverAppName", () => {
  it("사이트 URL에서 끝 슬래시를 떼어 appname으로 쓴다", () => {
    expect(naverAppName("https://lunchmate.vercel.app/")).toBe(
      "https://lunchmate.vercel.app",
    );
  });
  it("http(s) URL이 아니면 거부한다", () => {
    expect(() => naverAppName("lunchmate")).toThrow();
  });
});

describe("nmapWalkUrl (NAV-01)", () => {
  it("사무실 출발이면 slat, slng, sname과 목적지, appname을 퍼센트 인코딩으로 넣는다", () => {
    const url = nmapWalkUrl({
      destination: dest,
      origin: office,
      appname: "https://lunchmate.vercel.app",
    });
    expect(url).toBe(
      "nmap://route/walk?slat=37.5&slng=127.03&sname=%EC%82%AC%EB%AC%B4%EC%8B%A4" +
        "&dlat=37.4979502&dlng=127.0276368&dname=%EC%A0%95%EB%8B%B4%20%EA%B5%AD%EB%B0%A5" +
        "&appname=https%3A%2F%2Flunchmate.vercel.app",
    );
  });
  it("현위치 출발이거나 출발지가 없으면 출발지를 빼 앱이 기기 위치를 쓰게 한다", () => {
    for (const origin of [current, null]) {
      const url = nmapWalkUrl({
        destination: dest,
        origin,
        appname: "https://a.app",
      });
      expect(url.startsWith("nmap://route/walk?dlat=")).toBe(true);
      expect(url).not.toContain("slat");
    }
  });
  it("appname은 항상 들어간다", () => {
    const url = nmapWalkUrl({
      destination: dest,
      origin: null,
      appname: "https://a.app",
    });
    expect(
      new URL(url.replace("nmap://", "https://x/")).searchParams.get("appname"),
    ).toBe("https://a.app");
  });
  it("좌표를 7자리로 자르고 잘못된 좌표는 거부한다", () => {
    const url = nmapWalkUrl({
      destination: {
        name: "a",
        position: { lat: 37.123456789, lng: 127.987654321 },
      },
      origin: null,
      appname: "https://a.app",
    });
    expect(url).toContain("dlat=37.1234568&dlng=127.9876543");
    expect(() =>
      nmapWalkUrl({
        destination: { name: "a", position: { lat: Number.NaN, lng: 1 } },
        origin: null,
        appname: "https://a.app",
      }),
    ).toThrow();
  });
});

describe("naverWebWalkUrl (NAV-02, NAV-03)", () => {
  it("경도,위도,이름 순서의 출발과 도착 칸 + walk", () => {
    expect(naverWebWalkUrl({ destination: dest, origin: office })).toBe(
      "https://map.naver.com/p/directions/127.03,37.5,%EC%82%AC%EB%AC%B4%EC%8B%A4/" +
        "127.0276368,37.4979502,%EC%A0%95%EB%8B%B4%20%EA%B5%AD%EB%B0%A5/-/walk",
    );
  });
  it("출발지를 모르면 - 칸", () => {
    expect(naverWebWalkUrl({ destination: dest, origin: null })).toMatch(
      /^https:\/\/map\.naver\.com\/p\/directions\/-\/127\.0276368,/,
    );
  });
  it("현위치 출발은 좌표를 넣지 않고 - 칸 (CLAUDE.md 7장)", () => {
    const url = naverWebWalkUrl({ destination: dest, origin: current });
    expect(url).toMatch(/^https:\/\/map\.naver\.com\/p\/directions\/-\//);
    expect(url).not.toContain(String(current.position.lat));
  });
  it("이름 속 쉼표와 슬래시는 칸을 깨지 않게 공백으로 바꾼다", () => {
    const url = naverWebWalkUrl({
      destination: { name: "국밥/탕, 본점", position: dest.position },
      origin: null,
    });
    expect(url).toContain(encodeURIComponent("국밥 탕  본점"));
    expect(url.split("/").length).toBe(9);
  });
});

describe("naverPlaceSearchUrl (PLACE-04)", () => {
  it("이름 검색 + 좌표 지도 중심", () => {
    expect(naverPlaceSearchUrl("정담 국밥", dest.position)).toBe(
      "https://map.naver.com/p/search/%EC%A0%95%EB%8B%B4%20%EA%B5%AD%EB%B0%A5?c=127.0276368,37.4979502,17,0,0,0,dh",
    );
  });
  it("좌표가 없으면 이름만", () => {
    expect(naverPlaceSearchUrl("국밥", null)).toBe(
      "https://map.naver.com/p/search/%EA%B5%AD%EB%B0%A5",
    );
  });
});

describe("isMobileUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari", true],
    [
      "Mozilla/5.0 (Linux; Android 15; SM-S928N) Chrome/130 Mobile Safari",
      true,
    ],
    ["Mozilla/5.0 (iPhone) KAKAOTALK 11.0.0", true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605", false],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130", false],
    ["", false],
  ])("%s → %s", (ua, mobile) => {
    expect(isMobileUserAgent(ua)).toBe(mobile);
  });
});
