"use client";

import { useId, useState } from "react";
import { normalizeMeetingDate } from "@/lib/format";
import { t } from "@/lib/i18n";

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

export function FilterDate({
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
