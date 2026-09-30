import Link from "next/link";
import { desc } from "drizzle-orm";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { feedback, type SearchParams } from "@/lib/page";
import { t } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

const clusters = ["א", "ב", "ג", "ד", "ה"] as const;

export default async function AdminIndexPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const db = getDb();
  const rows = await db.select().from(documents).orderBy(desc(documents.updatedAt));
  const masters = rows
    .filter((row) => row.kind === "master")
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const derivatives = rows.filter((row) => row.kind === "derivative").sort((a, b) => a.title.localeCompare(b.title, "he"));
  const counts = {
    draft: masters.filter((row) => row.status === "draft").length,
    in_progress: masters.filter((row) => row.status === "in_progress").length,
    pending_approval: masters.filter((row) => row.status === "pending_approval").length,
    approved: masters.filter((row) => row.status === "approved").length,
  };

  return (
    <div>
      <PageIntro title={t.nav.index}>
        <p>{t.admin.workOrder}</p>
      </PageIntro>
      <Flash {...flash} />
      <ul className="mb-8 flex flex-wrap gap-3 text-sm">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((status) => (
          <li key={status} className="rounded-full border border-line bg-card px-3 py-1">
            {t.status[status]} · {counts[status]}
          </li>
        ))}
      </ul>
      {clusters.map((cluster) => (
        <section key={cluster} className="mb-8">
          <h2 className="font-serif text-2xl">
            {cluster}. {t.clusters[cluster]}
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {masters
              .filter((row) => row.cluster === cluster)
              .map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/documents/${row.id}`} className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-paper">
                    <span>
                      <span className="text-muted">{String(row.number ?? 0).padStart(2, "0")}</span> {row.title}
                    </span>
                    <span className="text-sm text-muted">{t.status[row.status]}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="font-serif text-2xl">{t.admin.derivatives}</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
          {derivatives.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/documents/${row.id}`} className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-paper">
                <span>{row.title}</span>
                <span className="text-sm text-muted">{t.status[row.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
