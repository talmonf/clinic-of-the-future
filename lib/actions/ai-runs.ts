"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AiNotConfiguredError, completeWithClaude, parseTaskList } from "@/lib/ai";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { aiAgents, aiRuns, documentVersions, documents, meetings, notes, tasks } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function targetPath(type: string, id: string) {
  return type === "meeting" ? `/admin/meetings/${id}` : `/admin/documents/${id}`;
}

export async function runAgent(formData: FormData) {
  const user = await requireUser();
  const targetType = textValue(formData, "targetType");
  const targetId = optionalId(textValue(formData, "targetId"));
  const agentId = optionalId(textValue(formData, "agentId"));
  if ((targetType !== "document" && targetType !== "meeting") || !targetId || !agentId) {
    go("/admin", { error: "invalid" });
  }
  const path = targetPath(targetType, targetId);

  try {
    const db = getDb();
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId)).limit(1);
    if (!agent?.active) go(path, { error: "not_found" });

    let promptInput = "";
    if (targetType === "document") {
      const [doc] = await db.select().from(documents).where(eq(documents.id, targetId)).limit(1);
      if (!doc) go(path, { error: "not_found" });
      promptInput = [
        `מסמך: ${doc.number ? String(doc.number).padStart(2, "0") + " " : ""}${doc.title}`,
        `סטטוס: ${doc.status}`,
        `שאלת מפתח: ${doc.keyQuestion}`,
        `מטרה: ${doc.purpose}`,
        `קהל: ${doc.audience}`,
        `מסמכים קודמים: ${doc.priorDocuments}`,
        `החלטה נדרשת: ${doc.decisionNeeded}`,
        `פעולה הבאה: ${doc.nextAction}`,
        "",
        doc.body,
      ].join("\n");
    } else {
      const [meeting] = await db.select().from(meetings).where(eq(meetings.id, targetId)).limit(1);
      if (!meeting) go(path, { error: "not_found" });
      promptInput = [
        `פגישה: ${meeting.title}`,
        `סדר יום: ${meeting.agenda}`,
        `שאלות: ${meeting.prepQuestions}`,
        `דיון: ${meeting.discussion}`,
        `בירורים: ${meeting.clarifications}`,
        `פערים: ${meeting.gaps}`,
        `סיכום נוכחי: ${meeting.summary}`,
      ].join("\n");
    }

    const result = await completeWithClaude(agent.systemPrompt, promptInput);
    if (!result.text) go(path, { error: "ai_failed" });
    await db.insert(aiRuns).values({
      agentId: agent.id,
      actorEmail: user.email,
      targetType,
      targetId,
      promptInput,
      output: result.text,
      model: result.model,
    });
    await recordAudit({
      actorEmail: user.email,
      action: "ai.run",
      entityType: targetType,
      entityId: targetId,
      summary: agent.name,
    });
  } catch (error) {
    rethrow(error);
    if (error instanceof AiNotConfiguredError) go(path, { error: "ai_unconfigured" });
    if (isDbUnavailable(error)) go(path, { error: "unavailable" });
    go(path, { error: "ai_failed" });
  }
  revalidatePath(path);
  go(path, { notice: "created" });
}

export async function applyRun(formData: FormData) {
  const user = await requireUser();
  const runId = optionalId(textValue(formData, "runId"));
  if (!runId) go("/admin", { error: "invalid" });

  try {
    const db = getDb();
    const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
    if (!run || run.appliedAt) go("/admin", { error: "not_found" });
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, run.agentId)).limit(1);
    if (!agent) go("/admin", { error: "not_found" });
    const path = targetPath(run.targetType, run.targetId);

    if (run.targetType === "document" && agent.slug === "draft-document") {
      const [doc] = await db.select().from(documents).where(eq(documents.id, run.targetId)).limit(1);
      if (!doc) go(path, { error: "not_found" });
      if (doc.status === "approved") go(path, { error: "approved_locked" });
      const version = doc.version + 1;
      const snapshot = {
        title: doc.title,
        purpose: doc.purpose,
        audience: doc.audience,
        ownerName: doc.ownerName,
        keyQuestion: doc.keyQuestion,
        sources: doc.sources,
        priorDocuments: doc.priorDocuments,
        status: doc.status,
        decisionNeeded: doc.decisionNeeded,
        nextAction: doc.nextAction,
        body: run.output,
      };
      await db.insert(documentVersions).values({
        documentId: doc.id,
        version,
        ...snapshot,
        savedBy: user.email,
      });
      await db
        .update(documents)
        .set({ ...snapshot, version, updatedAt: new Date() })
        .where(eq(documents.id, doc.id));
    } else if (run.targetType === "meeting" && agent.slug === "summarize-meeting") {
      const [meeting] = await db.select().from(meetings).where(eq(meetings.id, run.targetId)).limit(1);
      if (!meeting) go(path, { error: "not_found" });
      if (meeting.summary.trim()) {
        await db.insert(notes).values({
          meetingId: meeting.id,
          body: `סיכום קודם:\n${meeting.summary}`,
          createdBy: user.email,
        });
      }
      await db
        .update(meetings)
        .set({ summary: run.output, updatedAt: new Date() })
        .where(eq(meetings.id, meeting.id));
    } else if (agent.slug === "suggest-next-actions") {
      const parsed = parseTaskList(run.output);
      if (!parsed?.length) go(path, { error: "json_tasks" });
      await db.insert(tasks).values(
        parsed.map((task) => ({
          title: task.title,
          details: task.details,
          ownerName: task.owner,
          documentId: run.targetType === "document" ? run.targetId : null,
          meetingId: run.targetType === "meeting" ? run.targetId : null,
        })),
      );
    } else {
      await db.insert(notes).values({
        body: `${agent.name}:\n${run.output}`,
        createdBy: user.email,
        documentId: run.targetType === "document" ? run.targetId : null,
        meetingId: run.targetType === "meeting" ? run.targetId : null,
      });
    }

    await db
      .update(aiRuns)
      .set({ appliedAt: new Date() })
      .where(and(eq(aiRuns.id, run.id), isNull(aiRuns.appliedAt)));
    await recordAudit({
      actorEmail: user.email,
      action: "ai.apply",
      entityType: run.targetType,
      entityId: run.targetId,
      summary: agent.name,
    });
    revalidatePath(path);
    revalidatePath("/admin/tasks");
    go(path, { notice: "applied" });
  } catch (error) {
    rethrow(error);
    if (isDbUnavailable(error)) go("/admin", { error: "unavailable" });
    go("/admin", { error: "generic" });
  }
}
