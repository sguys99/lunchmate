"use client";
// 문의하기 본문 (T8.6, MOD-07). 문의 채널은 이메일 하나(사용자 결정 11/01).
// - 주소를 선택 가능한 글자로 크게 보여 주고, "주소 복사"(primary, 하단 1/3 주 동작) + "메일 앱 열기"(secondary, mailto).
//   카카오톡 같은 인앱 브라우저는 mailto를 막는 경우가 있어 복사가 주 동작이다.
// - 복사는 로그인 화면의 인앱 안내와 같은 copyText(Clipboard API → 숨은 textarea 대체). 결과는 토스트 대신 줄 안 상태 문구.
//   실패하면 주소를 길게 눌러 복사하라고 안내한다(주소는 이미 글자로 보이므로 따로 입력란을 띄우지 않는다).
// - 오프라인이어도 복사와 메일 앱 열기는 기기 안 동작이라 막지 않는다(메일 앱이 연결 뒤 보낸다).
// - 주소가 없으면(환경변수 미설정) 항목을 숨기지 않고 빈 상태 문법으로 "문의 주소를 준비하고 있습니다".
import { Mail } from "lucide-react";
import { useState } from "react";
import { EmptyState, StateGlyph } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { meCopy } from "@/copy/me";
import { copyText } from "@/features/auth/copy-link";
import { cn } from "@/lib/utils";

const copy = meCopy.contact;

type CopyState = "idle" | "done" | "failed";

export function ContactCard({
  email,
  mailto,
}: {
  email: string | null;
  mailto: string | null;
}) {
  const [state, setState] = useState<CopyState>("idle");

  if (!email || !mailto) {
    return (
      <EmptyState
        className="mt-10"
        title={copy.pending.title}
        body={copy.pending.body}
        visual={<StateGlyph icon={Mail} />}
      />
    );
  }

  async function onCopy() {
    if (!email) return;
    const ok = await copyText(email);
    setState(ok ? "done" : "failed");
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section
        className="flex flex-col gap-2"
        aria-labelledby="contact-address"
      >
        <h2 id="contact-address" className="type-caption text-muted-foreground">
          {copy.addressLabel}
        </h2>
        <div className="flex flex-col gap-5 border-y border-border py-5">
          {/* 주소는 본문 글꼴(Pretendard)로 크게. 세리프 제목체는 영문 주소에서 글자 구분이 흐려진다 */}
          <p className="type-numeric-md break-all select-all">{email}</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 desktop:flex-row">
              <button
                type="button"
                onClick={onCopy}
                className={cn(buttonClass("primary"), "w-full desktop:w-auto")}
              >
                {copy.copy}
              </button>
              <a
                href={mailto}
                className={cn(
                  buttonClass("secondary"),
                  "w-full desktop:w-auto",
                )}
              >
                {copy.openMail}
              </a>
            </div>
            <CopyStatus state={state} />
          </div>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.inAppHint}
          </p>
        </div>
      </section>

      <section
        className="flex flex-col gap-2"
        aria-labelledby="contact-include"
      >
        <h2 id="contact-include" className="type-caption text-muted-foreground">
          {copy.includeTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {copy.include.map((item) => (
            <li key={item} className="py-3 type-body-sm break-keep">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 type-caption break-keep text-muted-foreground">
          {copy.reply}
        </p>
      </section>
    </div>
  );
}

function CopyStatus({ state }: { state: CopyState }) {
  // 자리는 늘 두어 결과 문구가 나타날 때 아래 줄이 밀리지 않게 한다(스크린리더는 바뀐 문구만 읽는다)
  return (
    <p
      role="status"
      className={cn(
        "min-h-5 type-caption break-keep",
        state === "failed" ? "text-destructive" : "text-foreground",
      )}
    >
      {state === "done"
        ? copy.copied
        : state === "failed"
          ? copy.copyFailed
          : ""}
    </p>
  );
}
