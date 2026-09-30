import Link from "next/link";
import { t } from "@/lib/i18n";

export const inputClass =
  "mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-base text-ink outline-none focus:border-olive";
export const buttonClass =
  "inline-flex items-center justify-center rounded-md bg-olive px-4 py-2 text-sm text-paper hover:bg-olive-2 disabled:opacity-60";
export const quietClass =
  "inline-flex items-center justify-center rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-paper-2";

export function Flash({ error, notice }: { error?: string; notice?: string }) {
  const errorText =
    error && error in t.errors ? t.errors[error as keyof typeof t.errors] : error ? t.errors.generic : null;
  const noticeText = notice && notice in t.notices ? t.notices[notice as keyof typeof t.notices] : null;
  if (!errorText && !noticeText) return null;
  return (
    <div className="mb-4 space-y-2">
      {errorText ? <p className="rounded-md border border-clay/40 bg-card px-3 py-2 text-sm text-clay">{errorText}</p> : null}
      {noticeText ? <p className="rounded-md border border-olive/30 bg-card px-3 py-2 text-sm text-olive">{noticeText}</p> : null}
    </div>
  );
}

export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-3xl text-ink">{title}</h1>
      {children ? <div className="mt-2 max-w-3xl text-sm leading-6 text-muted">{children}</div> : null}
    </header>
  );
}

export function Empty() {
  return <p className="text-sm text-muted">{t.admin.empty}</p>;
}

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-olive underline-offset-4 hover:underline">
      {t.admin.back}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      {label}
      {children}
    </label>
  );
}

export function LevelInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const listId = `${name}-levels`;
  return (
    <>
      <input name={name} list={listId} defaultValue={defaultValue ?? ""} className={inputClass} />
      <datalist id={listId}>
        <option value={t.levels.low} />
        <option value={t.levels.mid} />
        <option value={t.levels.high} />
      </datalist>
    </>
  );
}
