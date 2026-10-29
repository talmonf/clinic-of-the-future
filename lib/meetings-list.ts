import { isoDate, jerusalemDayStart, withinDayRange } from "@/lib/day-range";
import { one } from "@/lib/format";

export const meetingSorts = ["created", "updated", "subject", "attendees"] as const;
export type MeetingSort = (typeof meetingSorts)[number];
export type MeetingSortDir = "asc" | "desc";

export type MeetingListRow = {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  createdAt: Date;
  updatedAt: Date;
  attendees: string;
  contactIds: string[];
};

export type MeetingListQuery = {
  sort: MeetingSort;
  dir: MeetingSortDir;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  contactId: string;
  q: string;
};

export { jerusalemDayStart };

export function meetingListQuery(params: Record<string, string | string[] | undefined>): MeetingListQuery {
  const sort = one(params.sort);
  const dir = one(params.dir);
  return {
    sort: meetingSorts.includes(sort as MeetingSort) ? (sort as MeetingSort) : "created",
    dir: dir === "asc" || dir === "desc" ? dir : "desc",
    createdFrom: isoDate(one(params.createdFrom)),
    createdTo: isoDate(one(params.createdTo)),
    updatedFrom: isoDate(one(params.updatedFrom)),
    updatedTo: isoDate(one(params.updatedTo)),
    contactId: one(params.contact) ?? "",
    q: (one(params.q) ?? "").trim(),
  };
}

export function applyMeetingList(rows: MeetingListRow[], query: MeetingListQuery) {
  const needle = query.q.toLowerCase();
  const filtered = rows.filter((row) => {
    if (query.contactId && !row.contactIds.includes(query.contactId)) return false;
    if (!withinDayRange(row.createdAt, query.createdFrom, query.createdTo)) return false;
    if (!withinDayRange(row.updatedAt, query.updatedFrom, query.updatedTo)) return false;
    if (!needle) return true;
    const text = [row.title, row.summary, row.detailedSummary].join("\n").toLowerCase();
    return text.includes(needle);
  });
  const factor = query.dir === "asc" ? 1 : -1;
  filtered.sort((left, right) => {
    if (query.sort === "created" || query.sort === "updated") {
      const key = query.sort === "created" ? "createdAt" : "updatedAt";
      return (left[key].getTime() - right[key].getTime()) * factor;
    }
    const leftText = query.sort === "subject" ? left.title : left.attendees;
    const rightText = query.sort === "subject" ? right.title : right.attendees;
    return leftText.localeCompare(rightText, "he") * factor;
  });
  return filtered;
}

export function meetingListHref(query: MeetingListQuery, patch: Partial<MeetingListQuery> = {}) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.sort !== "created" || next.dir !== "desc") {
    params.set("sort", next.sort);
    params.set("dir", next.dir);
  }
  if (next.createdFrom) params.set("createdFrom", next.createdFrom);
  if (next.createdTo) params.set("createdTo", next.createdTo);
  if (next.updatedFrom) params.set("updatedFrom", next.updatedFrom);
  if (next.updatedTo) params.set("updatedTo", next.updatedTo);
  if (next.contactId) params.set("contact", next.contactId);
  if (next.q) params.set("q", next.q);
  const search = params.toString();
  return search ? `/admin/meetings?${search}` : "/admin/meetings";
}
