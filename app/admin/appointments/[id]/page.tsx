import { asc, desc, eq } from "drizzle-orm";
import { AppointmentForm } from "@/components/admin/forms";
import { NotesPanel } from "@/components/admin/notes-panel";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { appointments, contacts, notes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireUser();
  const { id } = await params;
  const flash = await feedback(searchParams);
  const db = getDb();
  const [row] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/appointments" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  const [people, noteRows] = await Promise.all([
    db.select({ id: contacts.id, name: contacts.name }).from(contacts).orderBy(asc(contacts.name)),
    db.select().from(notes).where(eq(notes.appointmentId, id)).orderBy(desc(notes.createdAt)),
  ]);
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/appointments" />
      <PageIntro title={row.title} />
      <Flash {...flash} />
      <AppointmentForm row={row} contacts={people} />
      <NotesPanel back={`/admin/appointments/${row.id}`} hidden={{ appointmentId: row.id }} rows={noteRows} />
    </div>
  );
}
