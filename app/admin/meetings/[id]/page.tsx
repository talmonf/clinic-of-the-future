import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { AgentPanel } from "@/components/admin/agent-panel";
import { MeetingForm, MeetingTaskForm, TranscriptImport } from "@/components/admin/forms";
import { NotesPanel } from "@/components/admin/notes-panel";
import { RecordingPanel } from "@/components/admin/recording-panel";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { aiAgents, aiRuns, documents, meetings, notes, tasks } from "@/lib/db/schema";
import { formatDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { S3NotConfiguredError, presignRecordingGet } from "@/lib/s3";
import { requireUser } from "@/lib/session";

export default async function MeetingPage({
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
  const [row] = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/meetings" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  const [docs, noteRows, agents, runs, taskRows] = await Promise.all([
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
    db.select().from(notes).where(eq(notes.meetingId, id)).orderBy(desc(notes.createdAt)),
    db.select().from(aiAgents).where(eq(aiAgents.active, true)).orderBy(aiAgents.name),
    db
      .select({
        id: aiRuns.id,
        output: aiRuns.output,
        model: aiRuns.model,
        appliedAt: aiRuns.appliedAt,
        createdAt: aiRuns.createdAt,
        slug: aiAgents.slug,
        name: aiAgents.name,
      })
      .from(aiRuns)
      .innerJoin(aiAgents, eq(aiAgents.id, aiRuns.agentId))
      .where(and(eq(aiRuns.targetType, "meeting"), eq(aiRuns.targetId, id)))
      .orderBy(desc(aiRuns.createdAt))
      .limit(5),
    db.select().from(tasks).where(eq(tasks.meetingId, id)).orderBy(desc(tasks.createdAt)),
  ]);
  let playbackUrl: string | null = null;
  let playbackError: string | null = null;
  if (row.recordingKey) {
    try {
      playbackUrl = await presignRecordingGet(row.recordingKey);
    } catch (error) {
      playbackError = error instanceof S3NotConfiguredError ? "s3_unconfigured" : "generic";
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink href="/admin/meetings" />
      <PageIntro title={row.title} />
      <Flash {...flash} />
      <p className="mb-4 flex flex-wrap gap-4 text-sm">
        <Link className="text-olive underline" href={`/admin/decisions?meeting=${row.id}`}>
          {t.nav.decisions}
        </Link>
        <Link className="text-olive underline" href={`/admin/tasks?meeting=${row.id}`}>
          {t.nav.tasks}
        </Link>
      </p>
      <MeetingForm row={row} docs={docs} />
      <TranscriptImport meetingId={row.id} />
      <RecordingPanel
        meetingId={row.id}
        recording={
          row.recordingKey
            ? {
                name: row.recordingName || row.recordingKey,
                type: row.recordingType || "audio/mpeg",
                bytes: row.recordingBytes,
                url: playbackUrl,
                playbackError,
              }
            : null
        }
      />
      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t.admin.actionItems}</h2>
        {taskRows.length === 0 ? <p className="mt-3 text-sm text-muted">{t.admin.empty}</p> : null}
        {taskRows.length > 0 ? (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {taskRows.map((task) => (
              <li key={task.id} className="px-4 py-3">
                <Link href={`/admin/tasks/${task.id}`} className="font-medium hover:underline">
                  {task.title}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {t.taskStatus[task.status]}
                  {task.ownerName ? ` · ${task.ownerName}` : ""}
                  {task.dueOn ? ` · ${formatDay(task.dueOn)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <MeetingTaskForm meetingId={row.id} />
      </section>
      <AgentPanel targetType="meeting" targetId={row.id} agents={agents} runs={runs} draftLocked={false} />
      <NotesPanel back={`/admin/meetings/${row.id}`} hidden={{ meetingId: row.id }} rows={noteRows} />
    </div>
  );
}
