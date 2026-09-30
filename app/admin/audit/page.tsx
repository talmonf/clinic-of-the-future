import { desc } from "drizzle-orm";
import { PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function AuditPage() {
  await requireUser();
  const rows = await getDb().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200);
  return (
    <div>
      <PageIntro title={t.nav.audit} />
      {rows.length === 0 ? <p className="text-sm text-muted">{t.admin.empty}</p> : null}
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <p className="text-sm">{row.summary}</p>
            <p className="mt-1 text-xs text-muted">
              {formatWhen(row.createdAt)} · {row.action}
              {row.actorEmail ? ` · ${row.actorEmail}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
