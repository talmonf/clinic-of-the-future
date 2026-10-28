import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { buttonClass, Flash, inputClass } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { contacts, meetingAttendees, meetings } from "@/lib/db/schema";
import { formatWhen, meetingOtherNames } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  applyMeetingList,
  meetingListHref,
  meetingListQuery,
  type MeetingSort,
} from "@/lib/meetings-list";
import { feedback, type SearchParams } from "@/lib/page";
import { requireUser } from "@/lib/session";

const columns: { key: MeetingSort; label: string }[] = [
  { key: "created", label: t.admin.createdOn },
  { key: "updated", label: t.admin.updatedOn },
  { key: "subject", label: t.admin.subject },
  { key: "attendees", label: t.admin.attendees },
];

function nextDir(column: MeetingSort, sort: MeetingSort, dir: "asc" | "desc") {
  if (sort !== column) return column === "subject" || column === "attendees" ? "asc" : "desc";
  return dir === "asc" ? "desc" : "asc";
}

export default async function MeetingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const flash = await feedback(searchParams);
  const query = meetingListQuery(params);
  const db = getDb();
  const [meetingRows, attendeeRows, people] = await Promise.all([
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        summary: meetings.summary,
        detailedSummary: meetings.detailedSummary,
        createdAt: meetings.createdAt,
        updatedAt: meetings.updatedAt,
        attendeesOther: meetings.attendeesOther,
      })
      .from(meetings),
    db
      .select({
        meetingId: meetingAttendees.meetingId,
        contactId: meetingAttendees.contactId,
        name: contacts.name,
      })
      .from(meetingAttendees)
      .innerJoin(contacts, eq(contacts.id, meetingAttendees.contactId)),
    db.select({ id: contacts.id, name: contacts.name }).from(contacts).orderBy(asc(contacts.name)),
  ]);

  const namesByMeeting = new Map<string, string[]>();
  const contactsByMeeting = new Map<string, string[]>();
  for (const attendee of attendeeRows) {
    const names = namesByMeeting.get(attendee.meetingId) ?? [];
    names.push(attendee.name);
    namesByMeeting.set(attendee.meetingId, names);
    const ids = contactsByMeeting.get(attendee.meetingId) ?? [];
    ids.push(attendee.contactId);
    contactsByMeeting.set(attendee.meetingId, ids);
  }

  const rows = applyMeetingList(
    meetingRows.map((row) => {
      const names = [...(namesByMeeting.get(row.id) ?? [])].sort((left, right) => left.localeCompare(right, "he"));
      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        detailedSummary: row.detailedSummary,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        attendees: [...names, ...meetingOtherNames(row.attendeesOther)].join(", "),
        contactIds: contactsByMeeting.get(row.id) ?? [],
      };
    }),
    query,
  );
  const filtering = Boolean(
    query.q || query.contactId || query.createdFrom || query.createdTo || query.updatedFrom || query.updatedTo,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-ink">{t.nav.meetings}</h1>
        <Link href="/admin/meetings/new" className="inline-flex shrink-0 items-center justify-center rounded-md bg-olive px-3 py-1.5 text-sm text-paper hover:bg-olive-2">
          {t.admin.create}
        </Link>
      </div>
      <Flash {...flash} />
      <form method="get" action="/admin/meetings" className="mb-6 grid gap-4 rounded-lg border border-line bg-card p-4 md:grid-cols-2">
        {query.sort !== "created" || query.dir !== "desc" ? (
          <>
            <input type="hidden" name="sort" value={query.sort} />
            <input type="hidden" name="dir" value={query.dir} />
          </>
        ) : null}
        <div>
          <p className="text-sm text-muted">{t.admin.createdOn}</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <label className="block text-sm text-muted">
              {t.admin.rangeFrom}
              <input type="date" name="createdFrom" defaultValue={query.createdFrom} dir="ltr" className={inputClass} />
            </label>
            <label className="block text-sm text-muted">
              {t.admin.rangeTo}
              <input type="date" name="createdTo" defaultValue={query.createdTo} dir="ltr" className={inputClass} />
            </label>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">{t.admin.updatedOn}</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <label className="block text-sm text-muted">
              {t.admin.rangeFrom}
              <input type="date" name="updatedFrom" defaultValue={query.updatedFrom} dir="ltr" className={inputClass} />
            </label>
            <label className="block text-sm text-muted">
              {t.admin.rangeTo}
              <input type="date" name="updatedTo" defaultValue={query.updatedTo} dir="ltr" className={inputClass} />
            </label>
          </div>
        </div>
        <label className="block text-sm text-muted">
          {t.nav.contacts}
          <select name="contact" defaultValue={query.contactId} className={inputClass}>
            <option value="">{t.admin.all}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          {t.admin.description}
          <input name="q" defaultValue={query.q} className={inputClass} />
        </label>
        <div className="flex items-center gap-3 md:col-span-2">
          <button type="submit" className={buttonClass}>
            {t.admin.filter}
          </button>
          {filtering ? (
            <Link href={meetingListHref(query, { createdFrom: "", createdTo: "", updatedFrom: "", updatedTo: "", contactId: "", q: "" })} className="text-sm text-olive underline">
              {t.admin.clearFilters}
            </Link>
          ) : null}
        </div>
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              {columns.map((column) => {
                const active = query.sort === column.key;
                const dir = nextDir(column.key, query.sort, query.dir);
                const mark = active ? (query.dir === "asc" ? " ↑" : " ↓") : "";
                return (
                  <th key={column.key} className="px-4 py-3 text-start font-medium">
                    <Link href={meetingListHref(query, { sort: column.key, dir })} className="hover:text-ink">
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
              const href = `/admin/meetings/${row.id}`;
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
                      {row.title}
                    </Link>
                  </td>
                  <td>
                    <Link href={href} className="block px-4 py-3 text-muted group-hover:bg-paper">
                      {row.attendees || "—"}
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
