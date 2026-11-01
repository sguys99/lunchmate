// 약관 문서 화면 틀 (T4.11, T8.14). /terms, /privacy, /location이 쓰는 서버 컴포넌트. 문구는 src/copy/legal.ts.
// 최종 시행 전이라 맨 위에 "확정 전 초안" 고지를 둔다. 약관 동의 화면의 "보기"가 새 창으로 연다.
// 절마다 문단(body), 목록(items), 덧붙임(after), 문의 이메일(contact), 다른 문서 링크(link)를 순서대로 그린다.
// 문의 이메일은 환경변수 값(src/lib/contact)을 서버에서 읽는다. 비어 있으면 준비 중 문구.
import Link from "next/link";
import { legalCopy, type LegalDocument } from "@/copy/legal";
import { focusRing } from "@/components/ui/interaction";
import { contactEmail } from "@/lib/contact";
import { cn } from "@/lib/utils";

const paragraph = "type-body-sm break-keep text-muted-foreground";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const email = contactEmail();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-8 bg-background px-(--lm-layout-gutter) pt-14 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] text-foreground desktop:max-w-[40rem] desktop:pt-20">
      <header className="flex flex-col gap-3">
        <p className="type-caption text-muted-foreground">{doc.updated}</p>
        <h1 className="type-title text-balance break-keep">{doc.title}</h1>
      </header>
      <aside className="flex flex-col gap-1 border-y border-border py-4">
        <p className="type-label">{legalCopy.pendingLabel}</p>
        <p className={paragraph}>{legalCopy.pending}</p>
      </aside>
      <div className="flex flex-col gap-8">
        {doc.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="type-label">{s.heading}</h2>
            {s.body?.map((p) => (
              <p key={p} className={paragraph}>
                {p}
              </p>
            ))}
            {s.items ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
                {s.items.map((item) => (
                  <li key={item} className={paragraph}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {s.after?.map((p) => (
              <p key={p} className={paragraph}>
                {p}
              </p>
            ))}
            {s.contact ? (
              <p className="type-body-sm break-keep">
                <span className="text-muted-foreground">
                  {legalCopy.contactLabel}{" "}
                </span>
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className={cn(
                      "break-all underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
                      focusRing,
                    )}
                  >
                    {email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    {legalCopy.contactPending}
                  </span>
                )}
              </p>
            ) : null}
            {s.link ? (
              <Link
                href={s.link.href}
                className={cn(
                  "inline-flex min-h-11 items-center self-start type-body-sm underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
                  focusRing,
                )}
              >
                {s.link.label}
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
