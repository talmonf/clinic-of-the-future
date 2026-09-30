"use server";

import { isDbUnavailable } from "@/lib/db";
import { getDb } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit";
import { isPublicCategory } from "@/lib/options";

export type InterestState = {
  ok: boolean;
  error?: "invalid" | "unavailable" | "generic";
  values?: {
    name: string;
    email: string;
    organization: string;
    category: string;
    message: string;
  };
};

const empty: InterestState["values"] = {
  name: "",
  email: "",
  organization: "",
  category: "partner",
  message: "",
};

function read(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    organization: String(formData.get("organization") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    message: String(formData.get("message") ?? "").trim(),
  };
}

export async function submitInterest(_prev: InterestState, formData: FormData): Promise<InterestState> {
  const values = read(formData);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
  if (
    values.name.length < 2 ||
    values.name.length > 120 ||
    !emailOk ||
    values.email.length > 200 ||
    values.organization.length > 200 ||
    !isPublicCategory(values.category) ||
    values.message.length < 2 ||
    values.message.length > 4000
  ) {
    return { ok: false, error: "invalid", values };
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(contacts)
      .values({
        name: values.name,
        email: values.email,
        organization: values.organization,
        category: values.category,
        source: "inbound",
        contactStatus: "new",
        message: values.message,
      })
      .returning({ id: contacts.id });
    await recordAudit({
      actorEmail: values.email,
      action: "contact.inbound",
      entityType: "contact",
      entityId: row?.id,
      summary: `פנייה נכנסת: ${values.name} (${values.category})`,
    });
    return { ok: true, values: empty };
  } catch (error) {
    return { ok: false, error: isDbUnavailable(error) ? "unavailable" : "generic", values };
  }
}
