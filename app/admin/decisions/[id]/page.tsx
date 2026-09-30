import { asc, desc, eq } from "drizzle-orm";
import { DecisionForm } from "@/components/admin/forms";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { decisions, documents, meetings } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function DecisionPage({
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
  const [row] = await db.select().from(decisions).where(eq(decisions.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/decisions" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  const [docs, meetingRows] = await Promise.all([
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
    db.select({ id: meetings.id, title: meetings.title }).from(meetings).orderBy(desc(meetings.createdAt)),
  ]);
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/decisions" />
      <PageIntro title={row.subject} />
      <Flash {...flash} />
      <DecisionForm decision={row} docs={docs} meetings={meetingRows} />
    </div>
  );
}
