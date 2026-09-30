import { and, desc, eq } from "drizzle-orm";
import { saveDocument } from "@/lib/actions/documents";
import { AgentPanel } from "@/components/admin/agent-panel";
import { NotesPanel } from "@/components/admin/notes-panel";
import { BackLink, Field, Flash, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/lib/db";
import { aiAgents, aiRuns, documentSources, documentVersions, documents, notes } from "@/lib/db/schema";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { documentStatuses } from "@/lib/options";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function DocumentPage({
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
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc) {
    return (
      <div>
        <BackLink href="/admin" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }

  const sources = await db
    .select({ id: documents.id, title: documents.title, number: documents.number })
    .from(documentSources)
    .innerJoin(documents, eq(documents.id, documentSources.sourceDocumentId))
    .where(eq(documentSources.documentId, id));
  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.version))
    .limit(8);
  const noteRows = await db.select().from(notes).where(eq(notes.documentId, id)).orderBy(desc(notes.createdAt));
  const agents = await db.select().from(aiAgents).where(eq(aiAgents.active, true)).orderBy(aiAgents.name);
  const runs = await db
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
    .where(and(eq(aiRuns.targetType, "document"), eq(aiRuns.targetId, id)))
    .orderBy(desc(aiRuns.createdAt))
    .limit(5);

  return (
    <div className="max-w-3xl">
      <BackLink href="/admin" />
      <header className="mt-4 mb-6">
        <p className="text-sm text-muted">
          {doc.kind === "master" ? `${t.admin.masters} ${String(doc.number ?? "").padStart(2, "0")}` : t.admin.derivatives}
          {" · "}
          {t.admin.version} {doc.version}
          {" · "}
          {t.admin.updated} {formatWhen(doc.updatedAt)}
        </p>
        <h1 className="mt-1 font-serif text-3xl">{doc.title}</h1>
      </header>
      <Flash {...flash} />
      {sources.length > 0 ? (
        <p className="mb-4 text-sm text-muted">
          {t.admin.derivedFrom}: {sources.map((source) => source.title).join(" · ")}
        </p>
      ) : null}
      <form action={saveDocument} className="grid gap-4">
        <input type="hidden" name="id" value={doc.id} />
        <Field label={t.admin.title}>
          <input name="title" required defaultValue={doc.title} className={inputClass} />
        </Field>
        <Field label={t.admin.keyQuestion}>
          <input name="keyQuestion" defaultValue={doc.keyQuestion} className={inputClass} />
        </Field>
        <Field label={t.admin.purpose}>
          <textarea name="purpose" defaultValue={doc.purpose} className={inputClass} />
        </Field>
        <Field label={t.admin.audience}>
          <input name="audience" defaultValue={doc.audience} className={inputClass} />
        </Field>
        <Field label={t.admin.owner}>
          <input name="ownerName" defaultValue={doc.ownerName} className={inputClass} />
        </Field>
        <Field label={t.admin.prior}>
          <input name="priorDocuments" defaultValue={doc.priorDocuments} className={inputClass} />
        </Field>
        <Field label={t.admin.sources}>
          <textarea name="sources" defaultValue={doc.sources} className={inputClass} />
        </Field>
        <Field label={t.admin.status}>
          <select name="status" defaultValue={doc.status} className={inputClass}>
            {documentStatuses.map((status) => (
              <option key={status} value={status}>
                {t.status[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.admin.decisionNeeded}>
          <input name="decisionNeeded" defaultValue={doc.decisionNeeded} className={inputClass} />
        </Field>
        <Field label={t.admin.nextAction}>
          <input name="nextAction" defaultValue={doc.nextAction} className={inputClass} />
        </Field>
        <Field label={t.admin.body}>
          <textarea name="body" defaultValue={doc.body} className={`${inputClass} min-h-64`} />
        </Field>
        <p className="text-sm text-muted">{t.admin.manualSave}</p>
        <SubmitButton>{t.admin.save}</SubmitButton>
      </form>
      <AgentPanel
        targetType="document"
        targetId={doc.id}
        agents={agents}
        runs={runs}
        draftLocked={doc.status === "approved"}
      />
      <NotesPanel back={`/admin/documents/${doc.id}`} hidden={{ documentId: doc.id }} rows={noteRows} />
      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t.admin.history}</h2>
        <ul className="mt-3 space-y-2">
          {versions.map((version) => (
            <li key={version.id}>
              <details className="rounded-lg border border-line bg-card px-4 py-3">
                <summary className="cursor-pointer text-sm">
                  {t.admin.version} {version.version} · {t.status[version.status]} · {formatWhen(version.createdAt)}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6">{version.body}</pre>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
