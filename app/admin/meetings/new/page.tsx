import { asc } from "drizzle-orm";
import { MeetingForm } from "@/components/admin/forms";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { contacts, documents } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function NewMeetingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  const db = getDb();
  const [docs, people] = await Promise.all([
    db.select({ id: documents.id, number: documents.number, title: documents.title }).from(documents).orderBy(asc(documents.number)),
    db.select({ id: contacts.id, name: contacts.name }).from(contacts).orderBy(asc(contacts.name)),
  ]);
  return (
    <div className="max-w-3xl">
      <BackLink href="/admin/meetings" />
      <PageIntro title={t.admin.create} />
      <Flash {...flash} />
      <MeetingForm docs={docs} contacts={people} />
    </div>
  );
}
