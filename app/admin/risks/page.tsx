import Link from "next/link";
import { desc } from "drizzle-orm";
import { RiskForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { risks } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function RisksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const rows = await getDb().select().from(risks).orderBy(desc(risks.createdAt));
  return (
    <div>
      <PageIntro title={t.nav.risks} />
      <Flash {...flash} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <RiskForm />
        </div>
      </details>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/risks/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span>{row.risk}</span>
              <span className="mt-1 block text-sm text-muted">
                {t.admin.probability}: {row.probability || "—"} · {t.admin.impact}: {row.impact || "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
