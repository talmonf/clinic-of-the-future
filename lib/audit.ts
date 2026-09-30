import { getDb } from "./db";
import { auditEvents } from "./db/schema";

export async function recordAudit(entry: {
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  try {
    const db = getDb();
    await db.insert(auditEvents).values({
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 500),
    });
  } catch {
    console.error("audit write failed");
  }
}
