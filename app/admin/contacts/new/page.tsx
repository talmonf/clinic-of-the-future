import { ContactForm } from "@/components/admin/forms";
import { BackLink, Flash, PageIntro } from "@/components/admin/ui";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

export default async function NewContactPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const flash = await feedback(searchParams);
  return (
    <div className="max-w-2xl">
      <BackLink href="/admin/contacts" />
      <PageIntro title={t.admin.create} />
      <Flash {...flash} />
      <ContactForm />
    </div>
  );
}
