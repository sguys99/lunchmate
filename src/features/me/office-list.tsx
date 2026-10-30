"use client";
// 사무실 목록 관리 (T4.23, SET-01): 최대 5곳, 기본 지정, 이름 바꾸기, 지우기, 추가(지도 화면으로).
// - 줄마다 이름 + "기본" 표시(1px 테두리 배지 대신 caption 글자, 색 면 없음), 아래에 작은 보조 버튼들.
// - 이름 바꾸기와 지우기는 가운데 대화상자. 지우기 최종 버튼은 destructive 테두리.
// - 기본을 지우면 서버가 가장 먼저 저장한 곳을 기본으로 올리고(offices.ts 결정), 토스트로 새 기본을 알린다.
// - 마지막 한 곳은 지울 수 없다(버튼 aria-disabled + 안내). 5곳이면 추가 버튼을 막고 안내.
// - 화면의 primary 면은 "사무실 추가" 하나.
import { MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { cn } from "@/lib/utils";
import {
  canAddOffice,
  canDeleteOffice,
  MAX_OFFICES,
  resolveDefaultOffice,
  sortOffices,
  type OfficeSummary,
} from "./offices";
import type {
  DeleteOfficeResult,
  OfficeIdRequest,
  RenameOfficeRequest,
  SettingsResult,
} from "./requests";
import { SaveNotes } from "./save-bar";
import { useSettingsSave } from "./use-settings-save";

const copy = meCopy.offices;
export const OFFICE_NEW_PATH = "/me/offices/new";

export type OfficeActions = {
  rename: (req: RenameOfficeRequest) => Promise<SettingsResult>;
  makeDefault: (req: OfficeIdRequest) => Promise<SettingsResult>;
  remove: (req: OfficeIdRequest) => Promise<DeleteOfficeResult>;
};

type Pending =
  | { kind: "rename"; office: OfficeSummary }
  | { kind: "delete"; office: OfficeSummary }
  | null;

export function OfficeList({
  offices: rows,
  actions,
}: {
  offices: OfficeSummary[];
  actions: OfficeActions;
}) {
  const offices = sortOffices(rows);
  const current = resolveDefaultOffice(offices);
  const [pending, setPending] = useState<Pending>(null);
  const { state, save, clearError } = useSettingsSave();
  const deletable = canDeleteOffice(offices.length);
  const addable = canAddOffice(offices.length);
  const lastId = useId();
  const limitId = useId();

  if (offices.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        title={copy.empty.title}
        body={copy.empty.body}
        visual={null}
        action={{ label: copy.add, href: OFFICE_NEW_PATH, variant: "primary" }}
      />
    );
  }

  const blocked = state.busy || !state.online;

  return (
    <>
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="type-caption text-muted-foreground">{copy.listLabel}</h2>
        <span className="type-caption text-muted-foreground tabular-nums">
          {copy.count(offices.length, MAX_OFFICES)}
        </span>
      </div>
      <ul
        aria-label={copy.listLabel}
        className="mt-2 flex flex-col divide-y divide-border border-y border-border"
      >
        {offices.map((o) => {
          const isDefault = current?.id === o.id;
          return (
            <li key={o.id} className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2.5">
                <MapPin
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    isDefault ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={1.75}
                />
                <span className="min-w-0 truncate type-body">{o.name}</span>
                {isDefault ? (
                  <span className="shrink-0 rounded-badge border border-border px-2 py-0.5 type-caption text-muted-foreground">
                    {copy.defaultMark}
                  </span>
                ) : null}
              </div>
              <div
                role="group"
                aria-label={copy.more(o.name)}
                className="flex flex-wrap gap-2 pl-6.5"
              >
                {!isDefault ? (
                  <button
                    type="button"
                    aria-disabled={blocked || undefined}
                    onClick={() => {
                      if (blocked) return;
                      void save(
                        () => actions.makeDefault({ id: o.id }),
                        () => copy.saved.default,
                      );
                    }}
                    className={buttonClass("secondary", "sm")}
                  >
                    {copy.makeDefault}
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-disabled={blocked || undefined}
                  onClick={() => {
                    if (blocked) return;
                    clearError();
                    setPending({ kind: "rename", office: o });
                  }}
                  className={buttonClass("ghost", "sm")}
                >
                  {copy.rename}
                </button>
                <button
                  type="button"
                  aria-disabled={blocked || !deletable || undefined}
                  aria-describedby={!deletable ? lastId : undefined}
                  onClick={() => {
                    if (blocked || !deletable) return;
                    clearError();
                    setPending({ kind: "delete", office: o });
                  }}
                  className={cn(buttonClass("ghost", "sm"), "text-destructive")}
                >
                  {copy.delete}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-3">
        {!deletable ? (
          <p
            id={lastId}
            className="type-caption break-keep text-muted-foreground"
          >
            {copy.lastOne}
          </p>
        ) : null}
        {pending === null ? <SaveNotes state={state} /> : null}
      </div>

      <div className="sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-8 flex flex-col gap-3 border-t border-border bg-background px-(--lm-layout-gutter) py-3 desktop:-mx-10 desktop:px-10">
        {!addable ? (
          <p
            id={limitId}
            className="type-caption break-keep text-muted-foreground"
          >
            {copy.limit}
          </p>
        ) : null}
        {addable ? (
          <Link
            href={OFFICE_NEW_PATH}
            className={cn(buttonClass("primary"), "w-full")}
          >
            <Plus aria-hidden strokeWidth={1.75} />
            {copy.add}
          </Link>
        ) : (
          <button
            type="button"
            aria-disabled
            aria-describedby={limitId}
            className={cn(buttonClass("primary"), "w-full")}
          >
            <Plus aria-hidden strokeWidth={1.75} />
            {copy.add}
          </button>
        )}
      </div>

      <RenameDialog
        office={pending?.kind === "rename" ? pending.office : null}
        state={state}
        onClose={() => setPending(null)}
        onSubmit={async (office, name) => {
          const ok = await save(
            () => actions.rename({ id: office.id, name }),
            () => copy.saved.renamed,
          );
          if (ok) setPending(null);
        }}
      />
      <DeleteDialog
        office={pending?.kind === "delete" ? pending.office : null}
        isDefault={
          pending?.kind === "delete" && pending.office.id === current?.id
        }
        state={state}
        onClose={() => setPending(null)}
        onConfirm={async (office) => {
          const ok = await save(
            () => actions.remove({ id: office.id }),
            (r) =>
              r.promoted ? copy.saved.promoted(r.promoted) : copy.saved.deleted,
          );
          if (ok) setPending(null);
        }}
      />
    </>
  );
}

function RenameDialog({
  office,
  state,
  onClose,
  onSubmit,
}: {
  office: OfficeSummary | null;
  state: ReturnType<typeof useSettingsSave>["state"];
  onClose: () => void;
  onSubmit: (office: OfficeSummary, name: string) => Promise<void>;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const name =
    draft && office && draft.id === office.id
      ? draft.name
      : (office?.name ?? "");
  const trimmed = name.trim();
  const blocked =
    state.busy || !state.online || !trimmed || trimmed === office?.name;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!office || blocked) return;
    void onSubmit(office, trimmed);
  }

  return (
    <Dialog
      open={office !== null}
      onOpenChange={(open) => {
        if (!open) {
          setDraft(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{copy.renameTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              {copy.nameLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label
              htmlFor={inputId}
              className="type-caption text-muted-foreground"
            >
              {copy.nameLabel}
            </label>
            <Input
              id={inputId}
              value={name}
              maxLength={20}
              enterKeyHint="done"
              placeholder={copy.namePlaceholder}
              onChange={(e) =>
                office &&
                setDraft({ id: office.id, name: e.currentTarget.value })
              }
            />
          </div>
          <SaveNotes state={state} />
          <DialogFooter className="mt-0">
            <button
              type="submit"
              aria-disabled={blocked || undefined}
              aria-busy={state.busy || undefined}
              className={buttonClass("primary")}
            >
              {state.busy ? meCopy.saving : meCopy.save}
            </button>
            <DialogClose className={buttonClass("secondary")}>
              {meCopy.cancel}
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  office,
  isDefault,
  state,
  onClose,
  onConfirm,
}: {
  office: OfficeSummary | null;
  isDefault: boolean;
  state: ReturnType<typeof useSettingsSave>["state"];
  onClose: () => void;
  onConfirm: (office: OfficeSummary) => Promise<void>;
}) {
  const blocked = state.busy || !state.online;
  return (
    <Dialog
      open={office !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {office ? copy.deleteTitle(office.name) : ""}
          </DialogTitle>
          <DialogDescription>
            {isDefault ? copy.deleteDefaultBody : copy.deleteBody}
          </DialogDescription>
        </DialogHeader>
        <SaveNotes state={state} />
        <DialogFooter className="mt-0">
          <button
            type="button"
            aria-disabled={blocked || undefined}
            aria-busy={state.busy || undefined}
            onClick={() => {
              if (office && !blocked) void onConfirm(office);
            }}
            className={buttonClass("destructive")}
          >
            {copy.delete}
          </button>
          <DialogClose className={buttonClass("secondary")}>
            {meCopy.cancel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
