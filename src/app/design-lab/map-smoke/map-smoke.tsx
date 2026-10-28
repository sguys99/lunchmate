"use client";

import { useState } from "react";
import { MapView } from "@/features/map/components/map-view";
import { createNaverMapProvider } from "@/lib/naver/naver-map-provider";

/** 네이버 구현체를 주입해 빈 지도를 보여 준다. 기본 중심은 서울시청 근처 상수다. */
export function MapSmoke() {
  const [provider] = useState(() => createNaverMapProvider());
  return <MapView provider={provider} className="h-[28rem]" />;
}
