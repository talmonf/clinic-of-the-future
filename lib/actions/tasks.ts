"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { isTaskStatus, optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function meetingReturn(value: string) {
  const id = value.startsWith("/admin/meetings/") ? optionalId(value.slice("/admin/meetings/".length)) : null;
  return id ? `/admin/meetings/${id}` : null;
}

export async function saveTask(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const returnTo = meetingReturn(textValue(formData, "returnTo"));
  const path = id ? `/admin/tasks/${id}` : (returnTo ?? "/admin/tasks");
  const title = textValue(formData, "title");
  const status = textValue(formData, "status") || "open";
  if (!title || !isTaskStatus(status)) go(path, { error: "invalid" });
  const values = {
    title,
    details: textValue(formData, "details"),
    status,
    ownerName: textValue(formData, "ownerName"),
    dueOn: day(textValue(formData, "dueOn")),
    documentId: optionalId(textValue(formData, "documentId")),
    meetingId: optionalId(textValue(formData, "meetingId")),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(tasks).set(values).where(eq(tasks.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "task.update",
        entityType: "task",
        entityId: id,
        summary: title,
      });
    } else {
      const [row] = await db.insert(tasks).values(values).returning({ id: tasks.id });
      await recordAudit({
        actorEmail: user.email,
        action: "task.create",
        entityType: "task",
        entityId: row?.id,
        summary: title,
      });
      revalidatePath("/admin/tasks");
      if (returnTo) revalidatePath(returnTo);
      go(returnTo ?? "/admin/tasks", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  revalidatePath("/admin/tasks");
  go(path, { notice: "saved" });
}

export async function setTaskStatus(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const status = textValue(formData, "status");
  const meetingId = optionalId(textValue(formData, "meeting"));
  const back = meetingId ? { meeting: meetingId } : {};
  if (!id || !isTaskStatus(status)) go("/admin/tasks", { ...back, error: "invalid" });
  try {
    const db = getDb();
    await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id));
    await recordAudit({
      actorEmail: user.email,
      action: "task.status",
      entityType: "task",
      entityId: id,
      summary: status,
    });
  } catch (error) {
    rethrow(error);
    if (isDbUnavailable(error)) go("/admin/tasks", { ...back, error: "unavailable" });
    go("/admin/tasks", { ...back, error: "generic" });
  }
  revalidatePath("/admin/tasks");
  if (meetingId) revalidatePath(`/admin/meetings/${meetingId}`);
  go("/admin/tasks", { ...back, notice: "saved" });
}
