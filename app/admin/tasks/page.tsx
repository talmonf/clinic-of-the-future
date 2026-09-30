import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { TaskForm } from "@/components/admin/forms";
import { quietClass, Flash, PageIntro } from "@/components/admin/ui";
import { setTaskStatus } from "@/lib/actions/tasks";
import { getDb } from "@/lib/db";
import { documents, meetings, tasks } from "@/lib/db/schema";
import { formatDay, one } from "@/lib/format";
import { t } from "@/lib/i18n";
import { type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const db = getDb();
  const [rows, docs, meetingRows] = await Promise.all([
    db.select().from(tasks).orderBy(desc(tasks.createdAt)),
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
    db.select({ id: meetings.id, title: meetings.title }).from(meetings).orderBy(desc(meetings.createdAt)),
  ]);
  return (
    <div>
      <PageIntro title={t.nav.tasks} />
      <Flash error={one(params.error)} notice={one(params.notice)} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4" open={Boolean(one(params.meeting) || one(params.document))}>
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <TaskForm
            docs={docs}
            meetings={meetingRows}
            preset={{ meetingId: one(params.meeting), documentId: one(params.document) }}
          />
        </div>
      </details>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
            <div>
              <Link href={`/admin/tasks/${row.id}`} className="font-medium hover:underline">
                {row.title}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {t.taskStatus[row.status]}
                {row.ownerName ? ` · ${row.ownerName}` : ""}
                {row.dueOn ? ` · ${formatDay(row.dueOn)}` : ""}
              </p>
            </div>
            <form action={setTaskStatus}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value={row.status === "open" ? "done" : "open"} />
              <button className={quietClass}>{row.status === "open" ? t.admin.markDone : t.admin.reopen}</button>
            </form>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
