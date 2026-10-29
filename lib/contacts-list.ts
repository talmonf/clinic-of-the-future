import { isoDate, withinDayRange } from "@/lib/day-range";
import { one } from "@/lib/format";
import { t } from "@/lib/i18n";
import { isContactCategory, isContactStatus } from "@/lib/options";

export const contactSorts = ["created", "updated", "name", "organization", "category", "status", "source"] as const;
export type ContactSort = (typeof contactSorts)[number];
export type ContactSortDir = "asc" | "desc";

export type ContactListRow = {
  id: string;
  name: string;
  email: string | null;
  organization: string;
  category: string;
  contactStatus: string;
  source: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactListQuery = {
  sort: ContactSort;
  dir: ContactSortDir;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  category: string;
  status: string;
  q: string;
};

function label(kind: "category" | "status" | "source", value: string) {
  if (kind === "category" && value in t.categories) return t.categories[value as keyof typeof t.categories];
  if (kind === "status" && value in t.contactStatus) return t.contactStatus[value as keyof typeof t.contactStatus];
  if (kind === "source" && value in t.contactSource) return t.contactSource[value as keyof typeof t.contactSource];
  return value;
}

function sortText(row: ContactListRow, sort: Exclude<ContactSort, "created" | "updated">) {
  if (sort === "name") return row.name;
  if (sort === "organization") return row.organization;
  if (sort === "category") return label("category", row.category);
  if (sort === "status") return label("status", row.contactStatus);
  return label("source", row.source);
}

export function contactListQuery(params: Record<string, string | string[] | undefined>): ContactListQuery {
  const sort = one(params.sort);
  const dir = one(params.dir);
  const category = one(params.category) ?? "";
  const status = one(params.status) ?? "";
  return {
    sort: contactSorts.includes(sort as ContactSort) ? (sort as ContactSort) : "created",
    dir: dir === "asc" || dir === "desc" ? dir : "desc",
    createdFrom: isoDate(one(params.createdFrom)),
    createdTo: isoDate(one(params.createdTo)),
    updatedFrom: isoDate(one(params.updatedFrom)),
    updatedTo: isoDate(one(params.updatedTo)),
    category: isContactCategory(category) ? category : "",
    status: isContactStatus(status) ? status : "",
    q: (one(params.q) ?? "").trim(),
  };
}

export function applyContactList<T extends ContactListRow>(rows: T[], query: ContactListQuery) {
  const needle = query.q.toLowerCase();
  const filtered = rows.filter((row) => {
    if (query.category && row.category !== query.category) return false;
    if (query.status && row.contactStatus !== query.status) return false;
    if (!withinDayRange(row.createdAt, query.createdFrom, query.createdTo)) return false;
    if (!withinDayRange(row.updatedAt, query.updatedFrom, query.updatedTo)) return false;
    if (!needle) return true;
    const text = [row.name, row.organization, row.email ?? "", row.message].join("\n").toLowerCase();
    return text.includes(needle);
  });
  const factor = query.dir === "asc" ? 1 : -1;
  filtered.sort((left, right) => {
    if (query.sort === "created" || query.sort === "updated") {
      const key = query.sort === "created" ? "createdAt" : "updatedAt";
      return (left[key].getTime() - right[key].getTime()) * factor;
    }
    return sortText(left, query.sort).localeCompare(sortText(right, query.sort), "he") * factor;
  });
  return filtered;
}

export function contactListHref(query: ContactListQuery, patch: Partial<ContactListQuery> = {}) {
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
  if (next.category) params.set("category", next.category);
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  const search = params.toString();
  return search ? `/admin/contacts?${search}` : "/admin/contacts";
}
