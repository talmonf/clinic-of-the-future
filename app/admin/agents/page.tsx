import { desc } from "drizzle-orm";
import { AgentForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { aiAgents } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function AgentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const rows = await getDb().select().from(aiAgents).orderBy(desc(aiAgents.createdAt));
  return (
    <div>
      <PageIntro title={t.nav.agents}>
        <p>{t.admin.aiHelp}</p>
      </PageIntro>
      <Flash {...flash} />
      <ul className="space-y-8">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-card p-4">
            <p className="mb-3 text-sm text-muted">
              {row.slug} · {row.active ? t.admin.agentActive : t.admin.agentInactive}
            </p>
            <AgentForm row={row} />
          </li>
        ))}
      </ul>
      <details className="mt-8 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4">
          <AgentForm />
        </div>
      </details>
    </div>
  );
}
