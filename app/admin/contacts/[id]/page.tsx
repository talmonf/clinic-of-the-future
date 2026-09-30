import { desc, eq } from "drizzle-orm";
import { ContactForm } from "@/components/admin/forms";
import { NotesPanel } from "@/components/admin/notes-panel";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { contacts, notes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function ContactPage({
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
  const [row] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!row) {
    return (
      <div>
        <BackLink href="/admin/contacts" />
        <p className="mt-4">{t.errors.not_found}</p>
      </div>
    );
  }
  const noteRows = await db.select().from(notes).where(eq(notes.contactId, id)).orderBy(desc(notes.createdAt));
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/contacts" />
      <PageIntro title={row.name}>
        <p>
          {t.contactSource[row.source]} · {t.categories[row.category]}
        </p>
      </PageIntro>
      <Flash {...flash} />
      <ContactForm row={row} />
      <NotesPanel back={`/admin/contacts/${row.id}`} hidden={{ contactId: row.id }} rows={noteRows} />
    </div>
  );
}
