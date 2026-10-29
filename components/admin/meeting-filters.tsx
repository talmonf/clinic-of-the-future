"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { FilterDate } from "@/components/admin/filter-date";
import { buttonClass, inputClass, quietClass } from "@/components/admin/ui";
import { t } from "@/lib/i18n";
import { meetingListHref, type MeetingListQuery } from "@/lib/meetings-list";

export function MeetingFilters({
  query,
  people,
}: {
  query: MeetingListQuery;
  people: { id: string; name: string }[];
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const filtering = Boolean(
    query.q || query.contactId || query.createdFrom || query.createdTo || query.updatedFrom || query.updatedTo,
  );
  const clearHref = meetingListHref(query, {
    createdFrom: "",
    createdTo: "",
    updatedFrom: "",
    updatedTo: "",
    contactId: "",
    q: "",
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const bad = event.currentTarget.querySelector("[data-date-invalid='1']");
    if (!bad) return;
    event.preventDefault();
    setAttempted(true);
    if (bad instanceof HTMLElement) bad.focus();
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`${quietClass} gap-2`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          {t.admin.filter}
          {filtering ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-olive" /> : null}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </button>
        {filtering && !open ? (
          <Link href={clearHref} className="text-sm text-olive underline">
            {t.admin.clearFilters}
          </Link>
        ) : null}
      </div>
      <form
        id={panelId}
        method="get"
        action="/admin/meetings"
        onSubmit={onSubmit}
        className={
          open
            ? "mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-line bg-card p-3"
            : "hidden"
        }
      >
        {query.sort !== "created" || query.dir !== "desc" ? (
          <>
            <input type="hidden" name="sort" value={query.sort} />
            <input type="hidden" name="dir" value={query.dir} />
          </>
        ) : null}
        <label className="block min-w-48 flex-1 text-sm text-muted">
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
        <label className="block min-w-48 flex-1 text-sm text-muted">
          {t.admin.description}
          <input name="q" defaultValue={query.q} className={inputClass} />
        </label>
        <div>
          <p className="text-sm text-muted">{t.admin.createdOn}</p>
          <div className="mt-1 flex gap-2">
            <FilterDate name="createdFrom" label={t.admin.rangeFrom} defaultIso={query.createdFrom} attempted={attempted} />
            <FilterDate name="createdTo" label={t.admin.rangeTo} defaultIso={query.createdTo} attempted={attempted} />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">{t.admin.updatedOn}</p>
          <div className="mt-1 flex gap-2">
            <FilterDate name="updatedFrom" label={t.admin.rangeFrom} defaultIso={query.updatedFrom} attempted={attempted} />
            <FilterDate name="updatedTo" label={t.admin.rangeTo} defaultIso={query.updatedTo} attempted={attempted} />
          </div>
        </div>
        <div className="flex w-full items-center gap-3">
          <button type="submit" className={buttonClass}>
            {t.admin.filter}
          </button>
          {filtering ? (
            <Link href={clearHref} className="text-sm text-olive underline">
              {t.admin.clearFilters}
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
