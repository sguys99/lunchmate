// 약관 문서 화면 틀 (T4.11). /terms, /privacy가 쓰는 서버 컴포넌트. 문구는 src/copy/legal.ts.
// 최종 전문 전이라 맨 위에 "확정 전 초안" 고지를 둔다. 약관 동의 화면의 "보기"가 새 창으로 연다.
import { legalCopy, type LegalDocument } from "@/copy/legal";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-8 bg-background px-(--lm-layout-gutter) pt-14 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] text-foreground desktop:max-w-[40rem] desktop:pt-20">
      <header className="flex flex-col gap-3">
        <p className="type-caption text-muted-foreground">{doc.updated}</p>
        <h1 className="type-title text-balance break-keep">{doc.title}</h1>
      </header>
      <aside className="flex flex-col gap-1 border-y border-border py-4">
        <p className="type-label">{legalCopy.pendingLabel}</p>
        <p className="type-body-sm break-keep text-muted-foreground">
          {legalCopy.pending}
        </p>
      </aside>
      <div className="flex flex-col gap-7">
        {doc.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="type-label">{s.heading}</h2>
            <p className="type-body-sm break-keep text-muted-foreground">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
