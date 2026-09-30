import { eq } from "drizzle-orm";
import { RiskForm } from "@/components/admin/forms";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { risks } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function RiskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireUser();
  const { id } = await params;
  const flash = await feedback(searchParams);
  const [row] = await getDb().select().from(risks).where(eq(risks.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/risks" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/risks" />
      <PageIntro title={t.nav.risks} />
      <Flash {...flash} />
      <RiskForm row={row} />
    </div>
  );
}
