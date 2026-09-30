"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { fromJerusalemInput, textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { isAppointmentKind, optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveAppointment(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/appointments/${id}` : "/admin/appointments";
  const title = textValue(formData, "title");
  const kind = textValue(formData, "kind");
  if (!title || !isAppointmentKind(kind)) go(path, { error: "invalid" });
  const startsRaw = textValue(formData, "startsAt");
  const endsRaw = textValue(formData, "endsAt");
  const startsAt = startsRaw ? fromJerusalemInput(startsRaw) : null;
  const endsAt = endsRaw ? fromJerusalemInput(endsRaw) : null;
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) go(path, { error: "invalid" });
  const values = {
    title,
    kind,
    startsAt,
    endsAt,
    withWhom: textValue(formData, "withWhom"),
    location: textValue(formData, "location"),
    notes: textValue(formData, "notes"),
    contactId: optionalId(textValue(formData, "contactId")),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(appointments).set(values).where(eq(appointments.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "appointment.update",
        entityType: "appointment",
        entityId: id,
        summary: title,
      });
    } else {
      const [row] = await db.insert(appointments).values(values).returning({ id: appointments.id });
      await recordAudit({
        actorEmail: user.email,
        action: "appointment.create",
        entityType: "appointment",
        entityId: row?.id,
        summary: title,
      });
      revalidatePath("/admin/appointments");
      if (row?.id) go(`/admin/appointments/${row.id}`, { notice: "created" });
      go("/admin/appointments", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}
