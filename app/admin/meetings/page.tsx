import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { MeetingForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function MeetingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const db = getDb();
  const [rows, docs] = await Promise.all([
    db.select().from(meetings).orderBy(desc(meetings.startsAt)),
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
  ]);
  return (
    <div>
      <PageIntro title={t.nav.meetings} />
      <Flash {...flash} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <MeetingForm docs={docs} />
        </div>
      </details>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/meetings/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span>{row.title}</span>
              <span className="mt-1 block text-sm text-muted">{formatWhen(row.startsAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
