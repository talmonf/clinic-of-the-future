"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { t } from "@/lib/i18n";

const links = [
  ["/admin", t.nav.index],
  ["/admin/decisions", t.nav.decisions],
  ["/admin/assumptions", t.nav.assumptions],
  ["/admin/risks", t.nav.risks],
  ["/admin/meetings", t.nav.meetings],
  ["/admin/appointments", t.nav.appointments],
  ["/admin/contacts", t.nav.contacts],
  ["/admin/tasks", t.nav.tasks],
  ["/admin/agents", t.nav.agents],
  ["/admin/audit", t.nav.audit],
] as const;

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-card px-4 py-5 md:min-h-screen md:w-56 md:border-b-0 md:border-s">
      <Link href="/" className="font-serif text-lg leading-6 text-ink">
        {t.meta.title}
      </Link>
      <p className="mt-2 break-all text-xs text-muted">{email}</p>
      <nav className="mt-6 flex flex-wrap gap-2 md:flex-col">
        {links.map(([href, label]) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-2 py-1 text-sm ${active ? "bg-olive text-paper" : "text-ink hover:bg-paper-2"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </aside>
  );
}
