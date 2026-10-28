"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { buttonClass, inputClass, quietClass } from "@/components/admin/ui";
import { normalizeMeetingDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { meetingListHref, type MeetingListQuery } from "@/lib/meetings-list";

const dateInput =
  "w-auto rounded-md border bg-card px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-olive [field-sizing:content]";

function isoToDisplay(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function displayToIso(value: string) {
  const canonical = normalizeMeetingDate(value);
  if (!canonical) return "";
  const [day, month, year] = canonical.split("/");
  return `${year}-${month}-${day}`;
}

function applyDate(value: string) {
  if (!/^\d{8}$/.test(value.trim())) return value;
  return normalizeMeetingDate(value) ?? value;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden className="h-4 w-4">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

function FilterDate({
  name,
  label,
  defaultIso,
  attempted,
}: {
  name: string;
  label: string;
  defaultIso: string;
  attempted: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(() => isoToDisplay(defaultIso));
  const [pickerValue, setPickerValue] = useState(defaultIso);
  const iso = displayToIso(value);
  const invalid = Boolean(value.trim()) && !iso;

  function commit(next: string) {
    const formatted = applyDate(next);
    setValue(formatted);
    const canonical = normalizeMeetingDate(formatted);
    if (!canonical) {
      if (!formatted.trim()) setPickerValue("");
      return;
    }
    const [day, month, year] = canonical.split("/");
    setPickerValue(`${year}-${month}-${day}`);
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-muted">
        {label}
      </label>
      <div className="mt-1 flex items-stretch gap-1">
        {iso ? <input type="hidden" name={name} value={iso} /> : null}
        <input
          id={id}
          value={value}
          size={10}
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          dir="ltr"
          autoComplete="off"
          aria-invalid={attempted && invalid}
          data-date-invalid={invalid ? "1" : "0"}
          onChange={(event) => commit(event.target.value)}
          onBlur={() => {
            const formatted = normalizeMeetingDate(value);
            if (formatted) commit(formatted);
          }}
          className={`${dateInput} ${attempted && invalid ? "border-clay" : "border-line"}`}
        />
        <div className="relative inline-flex">
          <span aria-hidden className="inline-flex items-center justify-center rounded-md border border-line bg-card px-1.5 text-ink">
            <CalendarIcon />
          </span>
          <input
            type="date"
            aria-label={t.admin.calendar}
            value={pickerValue}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker();
              } catch {
                // The click still opens the picker where showPicker is not allowed.
              }
            }}
            onChange={(event) => {
              const next = event.target.value;
              setPickerValue(next);
              if (!next) {
                setValue("");
                return;
              }
              const [year, month, day] = next.split("-");
              if (year && month && day) setValue(`${day}/${month}/${year}`);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}

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
