import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { DecisionForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { decisions, documents, meetings } from "@/lib/db/schema";
import { formatDay, one } from "@/lib/format";
import { t } from "@/lib/i18n";
import { type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function DecisionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const flash = { error: one(params.error), notice: one(params.notice) };
  const db = getDb();
  const [rows, docs, meetingRows] = await Promise.all([
    db.select().from(decisions).orderBy(desc(decisions.createdAt)),
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
    db.select({ id: meetings.id, title: meetings.title }).from(meetings).orderBy(desc(meetings.createdAt)),
  ]);

  return (
    <div>
      <PageIntro title={t.nav.decisions} />
      <Flash {...flash} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4" open={Boolean(one(params.meeting) || one(params.document))}>
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <DecisionForm
            docs={docs}
            meetings={meetingRows}
            preset={{ meetingId: one(params.meeting), documentId: one(params.document) }}
          />
        </div>
      </details>
      {rows.length === 0 ? <p className="text-sm text-muted">{t.admin.empty}</p> : null}
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/decisions/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span className="font-medium">{row.subject}</span>
              <span className="mt-1 block text-sm text-muted">
                {formatDay(row.decidedOn)}
                {row.ownerName ? ` · ${row.ownerName}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
