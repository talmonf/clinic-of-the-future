import Link from "next/link";
import { ContactFilters } from "@/components/admin/contact-filters";
import { Flash } from "@/components/admin/ui";
import { applyContactList, contactListHref, contactListQuery, type ContactSort } from "@/lib/contacts-list";
import { getDb } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

const columns: { key: ContactSort; label: string }[] = [
  { key: "created", label: t.admin.createdOn },
  { key: "updated", label: t.admin.updatedOn },
  { key: "name", label: t.public.name },
  { key: "organization", label: t.admin.organization },
  { key: "category", label: t.public.category },
  { key: "status", label: t.admin.status },
  { key: "source", label: t.admin.source },
];

function nextDir(column: ContactSort, sort: ContactSort, dir: "asc" | "desc") {
  if (sort !== column) return column === "created" || column === "updated" ? "desc" : "asc";
  return dir === "asc" ? "desc" : "asc";
}

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const flash = await feedback(searchParams);
  const query = contactListQuery(params);
  const contactRows = await getDb()
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      organization: contacts.organization,
      category: contacts.category,
      contactStatus: contacts.contactStatus,
      source: contacts.source,
      message: contacts.message,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts);
  const rows = applyContactList(contactRows, query);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-ink">{t.nav.contacts}</h1>
        <Link href="/admin/contacts/new" className="inline-flex shrink-0 items-center justify-center rounded-md bg-olive px-3 py-1.5 text-sm text-paper hover:bg-olive-2">
          {t.admin.create}
        </Link>
      </div>
      <Flash {...flash} />
      <ContactFilters query={query} />
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              {columns.map((column) => {
                const active = query.sort === column.key;
                const dir = nextDir(column.key, query.sort, query.dir);
                const mark = active ? (query.dir === "asc" ? " ↑" : " ↓") : "";
                return (
                  <th key={column.key} className="px-4 py-3 text-start font-medium">
                    <Link href={contactListHref(query, { sort: column.key, dir })} className="hover:text-ink">
                      {column.label}
                      {mark}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = `/admin/contacts/${row.id}`;
              return (
                <tr key={row.id} className="group border-t border-line">
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {formatWhen(row.createdAt)}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {formatWhen(row.updatedAt)}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {row.name}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {row.organization || "—"}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {t.categories[row.category]}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 group-hover:bg-paper">
                      {t.contactStatus[row.contactStatus]}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 text-muted group-hover:bg-paper">
                      {t.contactSource[row.source]}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
    </div>
  );
}
