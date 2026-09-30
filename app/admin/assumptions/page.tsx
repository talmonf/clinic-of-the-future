import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { AssumptionForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { assumptions, documents } from "@/lib/db/schema";
import { one } from "@/lib/format";
import { t } from "@/lib/i18n";
import { type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function AssumptionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const db = getDb();
  const [rows, docs] = await Promise.all([
    db.select().from(assumptions).orderBy(desc(assumptions.createdAt)),
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
  ]);
  return (
    <div>
      <PageIntro title={t.nav.assumptions} />
      <Flash error={one(params.error)} notice={one(params.notice)} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4" open={Boolean(one(params.document))}>
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <AssumptionForm docs={docs} presetDocumentId={one(params.document)} />
        </div>
      </details>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/assumptions/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span>{row.statement}</span>
              <span className="mt-1 block text-sm text-muted">
                {row.importance ? `${t.admin.importance}: ${row.importance}` : t.admin.empty}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
