import { fromJerusalemInput, one } from "@/lib/format";

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

function isoDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function nextIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

/** Start of a Jerusalem calendar day, or null when the value is not a date. */
export function jerusalemDayStart(value: string) {
  if (!isoDate(value)) return null;
  return fromJerusalemInput(`${value}T00:00`);
}

function withinRange(value: Date, from: string, to: string) {
  const start = from ? jerusalemDayStart(from) : null;
  const end = to ? jerusalemDayStart(nextIsoDate(to)) : null;
  if (from && !start) return false;
  if (to && !end) return false;
  if (start && value.getTime() < start.getTime()) return false;
  if (end && value.getTime() >= end.getTime()) return false;
  return true;
}

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
    if (!withinRange(row.createdAt, query.createdFrom, query.createdTo)) return false;
    if (!withinRange(row.updatedAt, query.updatedFrom, query.updatedTo)) return false;
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
