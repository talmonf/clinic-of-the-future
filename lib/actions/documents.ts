"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { documentVersions, documents, notes } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { isDocumentStatus, optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function fail(id: string, error: unknown): never {
  const path = `/admin/documents/${id}`;
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveDocument(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  if (!id) go("/admin", { error: "not_found" });
  const status = textValue(formData, "status");
  const title = textValue(formData, "title");
  if (!title || !isDocumentStatus(status)) go(`/admin/documents/${id}`, { error: "invalid" });

  const snapshot = {
    title,
    purpose: textValue(formData, "purpose"),
    audience: textValue(formData, "audience"),
    ownerName: textValue(formData, "ownerName"),
    keyQuestion: textValue(formData, "keyQuestion"),
    sources: textValue(formData, "sources"),
    priorDocuments: textValue(formData, "priorDocuments"),
    status,
    decisionNeeded: textValue(formData, "decisionNeeded"),
    nextAction: textValue(formData, "nextAction"),
    body: String(formData.get("body") ?? ""),
  };

  try {
    const db = getDb();
    const [current] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!current) go("/admin", { error: "not_found" });
    const version = current.version + 1;
    await db.insert(documentVersions).values({
      documentId: id,
      version,
      ...snapshot,
      savedBy: user.email,
    });
    await db
      .update(documents)
      .set({ ...snapshot, version, updatedAt: new Date() })
      .where(eq(documents.id, id));
    await recordAudit({
      actorEmail: user.email,
      action: "document.save",
      entityType: "document",
      entityId: id,
      summary: `גרסה ${version}: ${title}`,
    });
  } catch (error) {
    rethrow(error);
    fail(id, error);
  }
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/admin");
  go(`/admin/documents/${id}`, { notice: "saved" });
}

export async function addNote(formData: FormData) {
  const user = await requireUser();
  const body = textValue(formData, "body");
  const documentId = optionalId(textValue(formData, "documentId"));
  const meetingId = optionalId(textValue(formData, "meetingId"));
  const contactId = optionalId(textValue(formData, "contactId"));
  const appointmentId = optionalId(textValue(formData, "appointmentId"));
  const targets = [documentId, meetingId, contactId, appointmentId].filter(Boolean);
  const back = textValue(formData, "back") || "/admin";
  if (!body || targets.length !== 1) go(back, { error: "invalid" });

  try {
    const db = getDb();
    const [row] = await db
      .insert(notes)
      .values({
        body,
        documentId,
        meetingId,
        contactId,
        appointmentId,
        createdBy: user.email,
      })
      .returning({ id: notes.id });
    await recordAudit({
      actorEmail: user.email,
      action: "note.create",
      entityType: "note",
      entityId: row?.id,
      summary: body.slice(0, 160),
    });
  } catch (error) {
    rethrow(error);
    if (isDbUnavailable(error)) go(back, { error: "unavailable" });
    go(back, { error: "generic" });
  }
  revalidatePath(back);
  go(back, { notice: "noted" });
}
