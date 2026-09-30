import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { AppointmentForm } from "@/components/admin/forms";
import { Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { appointments, contacts } from "@/lib/db/schema";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const db = getDb();
  const [rows, people] = await Promise.all([
    db.select().from(appointments).orderBy(desc(appointments.startsAt)),
    db.select({ id: contacts.id, name: contacts.name }).from(contacts).orderBy(asc(contacts.name)),
  ]);
  return (
    <div>
      <PageIntro title={t.nav.appointments}>
        <p>{t.admin.appointmentHelp}</p>
      </PageIntro>
      <Flash {...flash} />
      <details className="mb-8 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer">{t.admin.create}</summary>
        <div className="mt-4 max-w-2xl">
          <AppointmentForm contacts={people} />
        </div>
      </details>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/appointments/${row.id}`} className="block px-4 py-3 hover:bg-paper">
              <span>{row.title}</span>
              <span className="mt-1 block text-sm text-muted">
                {t.appointmentKind[row.kind]} · {formatWhen(row.startsAt)}
                {row.withWhom ? ` · ${row.withWhom}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
