// 지도, 장소 SDK 가짜 (T4.22). 네이버 지도 Client ID와 카카오 JS 키는 도메인 제한이 걸려 있어 localhost 포트가 등록되지
// 않았으면 실제 SDK가 인증에 실패한다. E2E는 실제 SDK 대신 이 가짜 스크립트로 응답해 화면 흐름만 검증한다.
// - 가짜 네이버 지도: 지도 요소를 누르면 누른 자리 좌표로 click 이벤트(1px = 0.00001도), panTo, setCenter는 중심만 바꾼다.
// - 가짜 카카오: "소담"이 들어간 검색어에 장소 1곳, 음식점(FD6) 반경 검색에 20곳(거리 50m 간격).
// 실제 SDK 동작(인증, 도메인)은 실기기나 등록된 도메인에서 따로 확인한다.
import type { Page } from "@playwright/test";

export const FAKE_SEARCH_RESULT = {
  lat: 37.5701,
  lng: 126.9832,
  name: "소담빌딩",
};
export const FAKE_PX_DEG = 0.00001;

const NAVER_FAKE = `(function () {
  function LatLng(lat, lng) { this._lat = lat; this._lng = lng; }
  LatLng.prototype.lat = function () { return this._lat; };
  LatLng.prototype.lng = function () { return this._lng; };
  function Point(x, y) { this.x = x; this.y = y; }
  function LatLngBounds(sw, ne) { this.sw = sw; this.ne = ne; }
  LatLngBounds.prototype.getSW = function () { return this.sw; };
  LatLngBounds.prototype.getNE = function () { return this.ne; };
  var registry = [];
  function on(target, name, handler) { var l = { t: target, n: name, h: handler }; registry.push(l); return l; }
  function off(l) { var i = registry.indexOf(l); if (i >= 0) registry.splice(i, 1); }
  function fire(target, name, e) { registry.slice().forEach(function (l) { if (l.t === target && l.n === name) l.h(e); }); }
  var PX = ${FAKE_PX_DEG};
  function Map(el, o) {
    var self = this; this.el = el; this.c = o.center; this.z = o.zoom;
    el.setAttribute("data-fake-map", "");
    el.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest("[data-fake-marker]")) return;
      var r = el.getBoundingClientRect();
      var dx = ev.clientX - r.left - r.width / 2, dy = ev.clientY - r.top - r.height / 2;
      fire(self, "click", { coord: new LatLng(self.c.lat() - dy * PX, self.c.lng() + dx * PX) });
    });
  }
  Map.prototype.setCenter = function (c) { this.c = c; };
  Map.prototype.getCenter = function () { return this.c; };
  Map.prototype.setZoom = function (z) { this.z = z; };
  Map.prototype.panTo = function (c) { this.c = c; };
  Map.prototype.panBy = function (p) { this.c = new LatLng(this.c.lat() - p.y * PX, this.c.lng() + p.x * PX); };
  Map.prototype.fitBounds = function () {};
  // 지도 탭(T5.26~T5.30)이 쓰는 영역: 요소 크기 x 1px 좌표 간격
  Map.prototype.getBounds = function () {
    var r = this.el.getBoundingClientRect(), hw = (r.width / 2) * PX, hh = (r.height / 2) * PX;
    return new LatLngBounds(new LatLng(this.c.lat() - hh, this.c.lng() - hw), new LatLng(this.c.lat() + hh, this.c.lng() + hw));
  };
  Map.prototype.setSize = function () {};
  Map.prototype.destroy = function () { this.el.innerHTML = ""; };
  function Marker(o) {
    this.p = o.position; this.el = o.map.el;
    var d = document.createElement("div");
    d.setAttribute("data-fake-marker", "");
    d.style.cssText = "position:absolute;left:50%;top:50%;pointer-events:none";
    var c = o.icon && o.icon.content;
    if (c) { if (typeof c === "string") d.innerHTML = c; else d.appendChild(c); }
    this.d = d; o.map.el.appendChild(d);
  }
  Marker.prototype.setPosition = function (p) { this.p = p; };
  Marker.prototype.setZIndex = function (z) { this.d.style.zIndex = String(z); };
  Marker.prototype.getPosition = function () { return this.p; };
  Marker.prototype.setMap = function (m) { if (!m) this.d.remove(); };
  function Circle(o) { this.o = o; }
  Circle.prototype.setCenter = function () {};
  Circle.prototype.setRadius = function () {};
  Circle.prototype.setMap = function () {};
  window.naver = { maps: { Map: Map, LatLng: LatLng, LatLngBounds: LatLngBounds, Point: Point, Marker: Marker, Circle: Circle,
    Event: { addListener: on, removeListener: off } } };
})();`;

const KAKAO_FAKE = `(function () {
  var r = ${JSON.stringify(FAKE_SEARCH_RESULT)};
  function LatLng(lat, lng) { this.getLat = function () { return lat; }; this.getLng = function () { return lng; }; }
  var page1 = { totalCount: 20, current: 1, hasNextPage: false, nextPage: function () {} };
  var services = {
    Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
    SortBy: { ACCURACY: "accuracy", DISTANCE: "distance" },
    Places: function () {
      return {
        keywordSearch: function (q, cb) {
          setTimeout(function () {
            if (q.indexOf("소담") >= 0)
              cb([{ id: "900", place_name: r.name, address_name: "서울 중구 소담동 1", road_address_name: "서울 중구 소담로 24", x: String(r.lng), y: String(r.lat) }], "OK", page1);
            else cb([], "ZERO_RESULT", page1);
          }, 30);
        },
        categorySearch: function (code, cb) {
          var docs = [];
          for (var i = 0; i < 20; i++) docs.push({ id: "f" + i, place_name: "식당" + i, address_name: "", road_address_name: "", x: String(126.978 + i * 0.0003), y: "37.5665", distance: String(50 + i * 50) });
          setTimeout(function () { cb(docs, "OK", page1); }, 30);
        }
      };
    },
    Geocoder: function () {
      return { addressSearch: function (q, cb) { setTimeout(function () { cb([], "ZERO_RESULT", page1); }, 10); } };
    }
  };
  window.kakao = { maps: { LatLng: LatLng, load: function (cb) { window.kakao.maps.services = services; cb(); } } };
})();`;

export async function mockMapSdks(page: Page): Promise<void> {
  await page.route("https://oapi.map.naver.com/openapi/v3/maps.js**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: NAVER_FAKE }),
  );
  await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: KAKAO_FAKE }),
  );
}
