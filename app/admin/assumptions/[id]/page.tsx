import { asc, eq } from "drizzle-orm";
import { AssumptionForm } from "@/components/admin/forms";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { assumptions, documents } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function AssumptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireUser();
  const { id } = await params;
  const flash = await feedback(searchParams);
  const db = getDb();
  const [row] = await db.select().from(assumptions).where(eq(assumptions.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/assumptions" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  const docs = await db
    .select({ id: documents.id, number: documents.number, title: documents.title })
    .from(documents)
    .orderBy(asc(documents.number));
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/assumptions" />
      <PageIntro title={t.nav.assumptions} />
      <Flash {...flash} />
      <AssumptionForm row={row} docs={docs} />
    </div>
  );
}
