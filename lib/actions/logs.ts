"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { assumptions, decisions, risks } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function saveDecision(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/decisions/${id}` : "/admin/decisions";
  const subject = textValue(formData, "subject");
  const decision = textValue(formData, "decision");
  if (!subject || !decision) go(path, { error: "invalid" });
  const values = {
    decidedOn: day(textValue(formData, "decidedOn")),
    subject,
    decision,
    rationale: textValue(formData, "rationale"),
    implication: textValue(formData, "implication"),
    ownerName: textValue(formData, "ownerName"),
    meetingId: optionalId(textValue(formData, "meetingId")),
    documentId: optionalId(textValue(formData, "documentId")),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(decisions).set(values).where(eq(decisions.id, id));
    } else {
      const [row] = await db.insert(decisions).values(values).returning({ id: decisions.id });
      await recordAudit({
        actorEmail: user.email,
        action: "decision.create",
        entityType: "decision",
        entityId: row?.id,
        summary: subject,
      });
      revalidatePath("/admin/decisions");
      go("/admin/decisions", { notice: "created" });
    }
    await recordAudit({
      actorEmail: user.email,
      action: "decision.update",
      entityType: "decision",
      entityId: id,
      summary: subject,
    });
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}

export async function saveAssumption(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/assumptions/${id}` : "/admin/assumptions";
  const statement = textValue(formData, "statement");
  if (!statement) go(path, { error: "invalid" });
  const values = {
    statement,
    importance: textValue(formData, "importance"),
    certainty: textValue(formData, "certainty"),
    howToTest: textValue(formData, "howToTest"),
    finding: textValue(formData, "finding"),
    decisionText: textValue(formData, "decisionText"),
    documentId: optionalId(textValue(formData, "documentId")),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(assumptions).set(values).where(eq(assumptions.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "assumption.update",
        entityType: "assumption",
        entityId: id,
        summary: statement,
      });
    } else {
      const [row] = await db.insert(assumptions).values(values).returning({ id: assumptions.id });
      await recordAudit({
        actorEmail: user.email,
        action: "assumption.create",
        entityType: "assumption",
        entityId: row?.id,
        summary: statement,
      });
      revalidatePath("/admin/assumptions");
      go("/admin/assumptions", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}

export async function saveRisk(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/risks/${id}` : "/admin/risks";
  const risk = textValue(formData, "risk");
  if (!risk) go(path, { error: "invalid" });
  const values = {
    risk,
    probability: textValue(formData, "probability"),
    impact: textValue(formData, "impact"),
    prevention: textValue(formData, "prevention"),
    response: textValue(formData, "response"),
    ownerName: textValue(formData, "ownerName"),
    updatedAt: new Date(),
  };
  try {
    const db = getDb();
    if (id) {
      await db.update(risks).set(values).where(eq(risks.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "risk.update",
        entityType: "risk",
        entityId: id,
        summary: risk,
      });
    } else {
      const [row] = await db.insert(risks).values(values).returning({ id: risks.id });
      await recordAudit({
        actorEmail: user.email,
        action: "risk.create",
        entityType: "risk",
        entityId: row?.id,
        summary: risk,
      });
      revalidatePath("/admin/risks");
      go("/admin/risks", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}
