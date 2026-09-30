import Link from "next/link";
import { desc } from "drizzle-orm";
import { ContactForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const rows = await getDb().select().from(contacts).orderBy(desc(contacts.createdAt));
  return (
    <div>
      <PageIntro title={t.nav.contacts} />
      <Flash {...flash} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <ContactForm />
        </div>
      </details>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/contacts/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span>{row.name}</span>
              <span className="mt-1 block text-sm text-muted">
                {t.categories[row.category]} · {t.contactStatus[row.contactStatus]} · {t.contactSource[row.source]}
                {row.organization ? ` · ${row.organization}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
