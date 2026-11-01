// 화면 접근성 탐침 (T8.9). axe가 보지 않는 규칙을 실제 DOM에서 잰다.
// - 제목: h1 정확히 1개, 단계 건너뛰기 없음
// - 랜드마크: main 1개
// - 터치 영역: 보이는 조작 요소(버튼, 링크, 입력, 역할 버튼)의 너비와 높이 44px 이상. 문단 안 글자 링크는 WCAG 2.5.8 예외라 뺀다
// - 이모지: aria-hidden 밖 이모지 글자는 스크린리더가 "위로 향한 엄지" 같은 이름으로 읽는다(보고용, 실패 조건 아님)
// - SVG: aria-hidden도 아니고 이름(role=img + 이름)도 없는 svg
// - 넘침: 문서 가로 스크롤
import type { Page } from "@playwright/test";

export type ProbeResult = {
  h1: number;
  headingSkips: string[];
  mains: number;
  smallTargets: string[];
  loudEmoji: string[];
  namelessSvg: string[];
  overflowX: number;
};

export async function probeA11y(page: Page): Promise<ProbeResult> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      if (el.closest("[aria-hidden='true'],[inert],nextjs-portal"))
        return false;
      return true;
    };
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30)}"`;

    const heads = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
    ).filter(visible);
    const headingSkips: string[] = [];
    let prev = 0;
    for (const h of heads) {
      const lv = Number(h.tagName[1]);
      if (prev && lv > prev + 1) headingSkips.push(`h${prev}→${label(h)}`);
      prev = lv;
    }

    const targets = Array.from(
      document.querySelectorAll(
        "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option]",
      ),
    ).filter(visible);
    const smallTargets: string[] = [];
    for (const el of targets) {
      // 비활성 요소는 누를 수 없어 대상이 아니다(aria-disabled는 pointer-events-none이라 아래 점 검사가 틀린다)
      if (el.matches(":disabled, [aria-disabled='true']")) continue;
      // 라벨 줄 전체가 누르는 칸인 체크박스(Base UI span role=checkbox), 슬라이더 손잡이 속 숨은 input
      if (el.closest("label") && el.tagName !== "A" && el.tagName !== "BUTTON")
        continue;
      if ((el as HTMLInputElement).type === "range") continue;
      // 지도 마커(보이는 높이 36 + 꼬리)는 이웃과 겹쳐 놓여 넓힐 수 없다. 같은 일을 시트 목록 줄(44 이상)로 할 수 있어
      // WCAG 2.5.8 "같은 기능의 다른 조작" 예외로 본다(g8-a11y-audit.md)
      if (el.closest("[role=application]")) continue;
      // 문단 속 글자 링크(인라인)는 예외
      if (
        el.tagName === "A" &&
        getComputedStyle(el).display === "inline" &&
        el.closest("p, li, dd, td, figcaption, small")
      )
        continue;
      // 라벨에 감싸인 숨은 입력은 라벨 크기로 잰다
      let box = el.getBoundingClientRect();
      if (el.tagName === "INPUT") {
        const lab = el.closest("label");
        if (lab) box = lab.getBoundingClientRect();
        const t = (el as HTMLInputElement).type;
        if ((t === "radio" || t === "checkbox") && !lab) {
          const id = el.id && document.querySelector(`label[for="${el.id}"]`);
          if (id) box = id.getBoundingClientRect();
        }
      }
      // 가려진(클립된 sr-only) 요소는 넘긴다
      if (box.width <= 1 || box.height <= 1) continue;
      if (box.width >= 43.5 && box.height >= 43.5) continue;
      // 보이는 크기는 작아도 가상 요소(after:-inset) 등으로 누르는 칸을 넓혔으면 통과.
      // 모자란 만큼 바깥 점을 눌러 같은 요소가 잡히는지 elementFromPoint로 잰다
      (el as HTMLElement).scrollIntoView({ block: "center", inline: "center" });
      box = el.getBoundingClientRect();
      if (el.tagName === "INPUT") {
        const lab = el.closest("label");
        if (lab) box = lab.getBoundingClientRect();
      }
      const host = el.tagName === "INPUT" ? (el.closest("label") ?? el) : el;
      const ex = Math.max(0, (44 - box.height) / 2) - 0.5;
      const ey = Math.max(0, (44 - box.width) / 2) - 0.5;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const hits = (x: number, y: number) => {
        const at = document.elementFromPoint(x, y);
        return !!at && (host.contains(at) || at === host);
      };
      const okY =
        box.height >= 43.5 ||
        (hits(cx, box.top - ex) && hits(cx, box.bottom + ex));
      const okX =
        box.width >= 43.5 ||
        (hits(box.left - ey, cy) && hits(box.right + ey, cy));
      if (!okX || !okY)
        smallTargets.push(
          `${label(el)} ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
    }

    const emoji = /\p{Extended_Pictographic}/u;
    const loudEmoji: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent ?? "";
      if (!emoji.test(t)) continue;
      const p = n.parentElement;
      if (!p || !visible(p)) continue;
      if (p.closest("script,style")) continue;
      // 이름을 aria-label로 덮어쓴 버튼, 링크, 그림 안이면 글자를 읽지 않는다
      if (
        p.closest(
          ":is(button,a,[role=img],[role=button])[aria-label], :is(button,a,[role=img],[role=button])[aria-labelledby]",
        )
      )
        continue;
      loudEmoji.push(`${p.tagName.toLowerCase()} "${t.trim().slice(0, 20)}"`);
    }

    const namelessSvg = Array.from(document.querySelectorAll("svg"))
      .filter(visible)
      .filter((s) => {
        if (s.closest("[aria-hidden='true']")) return false;
        if (
          s.getAttribute("role") === "img" &&
          (s.getAttribute("aria-label") || s.querySelector("title"))
        )
          return false;
        // 이름 있는 버튼, 링크 안의 아이콘은 버튼 이름이 대신한다(그래도 aria-hidden이 바람직)
        return true;
      })
      .map((s) => {
        const host = s.closest("button,a,[role]");
        return `svg in ${host ? label(host) : (s.parentElement?.tagName.toLowerCase() ?? "?")}`;
      });

    return {
      h1: heads.filter((h) => h.tagName === "H1").length,
      headingSkips,
      mains: document.querySelectorAll("main,[role=main]").length,
      smallTargets: Array.from(new Set(smallTargets)),
      loudEmoji: Array.from(new Set(loudEmoji)),
      namelessSvg: Array.from(new Set(namelessSvg)),
      overflowX:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

/** Tab을 n번 눌러 초점 표시(outline 또는 box-shadow)가 없는 요소와 화면 밖 초점을 모은다 */
export async function probeFocus(page: Page, presses = 40) {
  const missingRing: string[] = [];
  const offscreen: string[] = [];
  const order: string[] = [];
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      if (el.closest("nextjs-portal")) return null;
      const cs = getComputedStyle(el);
      const ring =
        (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== "none";
      const b = el.getBoundingClientRect();
      const out =
        b.bottom < 0 ||
        b.right < 0 ||
        b.top > innerHeight + 4000 ||
        b.width === 0 ||
        b.height === 0;
      const name = `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24)}"`;
      return { name, ring: ring || !el.matches(":focus-visible"), out };
    });
    if (!r) continue;
    order.push(r.name);
    if (!r.ring) missingRing.push(r.name);
    if (r.out) offscreen.push(r.name);
  }
  return {
    order,
    missingRing: Array.from(new Set(missingRing)),
    offscreen: Array.from(new Set(offscreen)),
  };
}
