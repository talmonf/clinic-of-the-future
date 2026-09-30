import Link from "next/link";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="font-serif text-lg leading-tight text-ink">
          {t.meta.title}
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-olive px-3 py-1.5 text-sm text-olive hover:bg-olive hover:text-card"
        >
          {t.nav.login}
        </Link>
      </div>
    </header>
  );
}
