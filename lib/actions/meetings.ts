"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { fromJerusalemInput, textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveMeeting(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/meetings/${id}` : "/admin/meetings";
  const title = textValue(formData, "title");
  if (!title) go(path, { error: "invalid" });
  const startsRaw = textValue(formData, "startsAt");
  const values = {
    title,
    startsAt: startsRaw ? fromJerusalemInput(startsRaw) : null,
    documentId: optionalId(textValue(formData, "documentId")),
    agenda: textValue(formData, "agenda"),
    prepQuestions: textValue(formData, "prepQuestions"),
    discussion: textValue(formData, "discussion"),
    clarifications: textValue(formData, "clarifications"),
    gaps: textValue(formData, "gaps"),
    summary: textValue(formData, "summary"),
    updatedAt: new Date(),
  };
  if (startsRaw && !values.startsAt) go(path, { error: "invalid" });

  try {
    const db = getDb();
    if (id) {
      await db.update(meetings).set(values).where(eq(meetings.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "meeting.update",
        entityType: "meeting",
        entityId: id,
        summary: title,
      });
    } else {
      const [row] = await db.insert(meetings).values(values).returning({ id: meetings.id });
      await recordAudit({
        actorEmail: user.email,
        action: "meeting.create",
        entityType: "meeting",
        entityId: row?.id,
        summary: title,
      });
      revalidatePath("/admin/meetings");
      if (row?.id) go(`/admin/meetings/${row.id}`, { notice: "created" });
      go("/admin/meetings", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}
