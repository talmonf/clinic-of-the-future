"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { aiAgents } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveAgent(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = "/admin/agents";
  const name = textValue(formData, "name");
  const purpose = textValue(formData, "purpose");
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!name || !systemPrompt) go(path, { error: "invalid" });

  try {
    const db = getDb();
    if (id) {
      await db
        .update(aiAgents)
        .set({ name, purpose, systemPrompt, active, updatedAt: new Date() })
        .where(eq(aiAgents.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "agent.update",
        entityType: "agent",
        entityId: id,
        summary: name,
      });
    } else {
      const slug = textValue(formData, "slug");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) go(path, { error: "slug" });
      const [row] = await db
        .insert(aiAgents)
        .values({ slug, name, purpose, systemPrompt, active })
        .returning({ id: aiAgents.id });
      await recordAudit({
        actorEmail: user.email,
        action: "agent.create",
        entityType: "agent",
        entityId: row?.id,
        summary: `${slug}: ${name}`,
      });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: id ? "saved" : "created" });
}
