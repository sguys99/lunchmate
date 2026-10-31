// 나 탭 로그인 꺼짐 화면 (T6.13, D-12 안건 12, AUTH-07, DESIGN.md 5장 "나 탭" 로그인 꺼짐).
// 안내 + 오늘 추천 보기(보조) + 흐린 이번 주 일지 예시(inert + aria-hidden, 정적 그림) + 화면 설정을 이 자리에 펼쳐 둠(이 기기 저장).
// 예시 이름은 지어낸 정적 문구다(카카오 값 아님). 포인트 컬러 버튼은 쓰지 않는다.
import Link from "next/link";
import { PageColumn } from "@/components/app-shell";
import { buttonClass } from "@/components/ui/button-classes";
import { historyCopy as copy } from "@/copy/history";
import { DisplaySettings } from "@/features/me/display-settings";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";

const TABS = [copy.tabs.history, copy.tabs.places, copy.tabs.reviews];

export function MeAuthOff() {
  const a = copy.states.authOff;
  return (
    <PageColumn>
      <header className="flex flex-col gap-2">
        <h1 className="type-title break-keep text-foreground">{copy.title}</h1>
      </header>
      <div className="mt-8 flex flex-col">
        <h2 className="type-heading break-keep">{a.title}</h2>
        <p className="mt-2 type-body-sm break-keep text-muted-foreground">
          {a.body}
        </p>
        <Link
          href="/today"
          className={cn(buttonClass("secondary"), "mt-5 self-start")}
        >
          {a.cta}
        </Link>
        <figure className="mt-10 flex flex-col gap-3">
          <figcaption className="type-caption text-muted-foreground">
            {a.preview}
          </figcaption>
          <div
            aria-hidden
            inert
            className="pointer-events-none rounded-card border border-dashed border-input p-5 opacity-60 select-none"
          >
            <div className="grid grid-cols-3 border-b border-border pb-2 text-center type-label text-muted-foreground">
              {TABS.map((t, i) => (
                <span
                  key={t}
                  className={i === 0 ? "text-foreground" : undefined}
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-4 type-label">{copy.history.thisWeek}</p>
            <ul className="flex flex-col">
              {copy.preview.map((x) => (
                <li
                  key={x.d}
                  className="flex items-center gap-3 border-b border-border py-3"
                >
                  <span className="flex w-6 flex-col items-center">
                    <span className="type-numeric-md tabular-nums">{x.d}</span>
                    <span className="type-caption text-muted-foreground">
                      {x.w}
                    </span>
                  </span>
                  <CategoryIllustration slug={x.slug} size={32} />
                  <span className="type-body-sm">{x.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </figure>
        <div className="mt-12 pb-8">
          <DisplaySettings title={a.displayTitle} />
        </div>
      </div>
    </PageColumn>
  );
}
