"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { isContactCategory, isContactStatus, optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveContact(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/contacts/${id}` : "/admin/contacts";
  const name = textValue(formData, "name");
  const category = textValue(formData, "category");
  const contactStatus = textValue(formData, "contactStatus");
  const email = textValue(formData, "email").toLowerCase();
  if (!name || !isContactCategory(category) || !isContactStatus(contactStatus)) {
    go(path, { error: "invalid" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) go(path, { error: "invalid" });
  const values = {
    name,
    email: email || null,
    organization: textValue(formData, "organization"),
    category,
    contactStatus,
    contribution: textValue(formData, "contribution"),
    mutualValue: textValue(formData, "mutualValue"),
    nextAction: textValue(formData, "nextAction"),
    message: textValue(formData, "message"),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(contacts).set(values).where(eq(contacts.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "contact.update",
        entityType: "contact",
        entityId: id,
        summary: name,
      });
    } else {
      const [row] = await db
        .insert(contacts)
        .values({ ...values, source: "manual" })
        .returning({ id: contacts.id });
      await recordAudit({
        actorEmail: user.email,
        action: "contact.create",
        entityType: "contact",
        entityId: row?.id,
        summary: name,
      });
      revalidatePath("/admin/contacts");
      if (row?.id) go(`/admin/contacts/${row.id}`, { notice: "created" });
      go("/admin/contacts", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}
