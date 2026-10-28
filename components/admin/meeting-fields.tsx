"use client";

import { useId, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";
import { normalizeMeetingDate, normalizeMeetingTime } from "@/lib/format";
import { t } from "@/lib/i18n";

const bareInput =
  "w-full min-w-0 rounded-md border border-line bg-card px-3 py-2 text-base text-ink outline-none focus:border-olive";

function applyDate(value: string) {
  if (!/^\d{8}$/.test(value.trim())) return value;
  return normalizeMeetingDate(value) ?? value;
}

function applyTime(value: string) {
  if (!/^\d{4}$/.test(value.trim())) return value;
  return normalizeMeetingTime(value) ?? value;
}

export function MeetingWhenFields({ date, time }: { date: string; time: string }) {
  const dateId = useId();
  const timeId = useId();
  const [dateValue, setDateValue] = useState(date);
  const [timeValue, setTimeValue] = useState(time);
  const picker = useRef<HTMLInputElement>(null);
  const [pickerValue, setPickerValue] = useState(() => {
    const formatted = normalizeMeetingDate(date);
    if (!formatted) return "";
    const [day, month, year] = formatted.split("/");
    return `${year}-${month}-${day}`;
  });

  function commitDate(next: string) {
    const formatted = applyDate(next);
    setDateValue(formatted);
    const canonical = normalizeMeetingDate(formatted);
    if (!canonical) {
      if (!formatted.trim()) setPickerValue("");
      return;
    }
    const [day, month, year] = canonical.split("/");
    setPickerValue(`${year}-${month}-${day}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={dateId} className="block text-sm text-muted">
          {t.admin.date}
        </label>
        <div className="relative mt-1">
          <div className="flex gap-2">
            <input
              id={dateId}
              name="meetingDate"
              value={dateValue}
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              dir="ltr"
              autoComplete="off"
              onChange={(event) => commitDate(event.target.value)}
              onBlur={() => {
                const formatted = normalizeMeetingDate(dateValue);
                if (formatted) commitDate(formatted);
              }}
              className={bareInput}
            />
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-card px-3 py-2 text-sm text-ink hover:bg-paper-2"
              onClick={() => {
                const input = picker.current;
                if (!input) return;
                try {
                  input.showPicker();
                } catch {
                  input.focus();
                }
              }}
            >
              {t.admin.calendar}
            </button>
          </div>
          <input
            ref={picker}
            type="date"
            tabIndex={-1}
            aria-hidden
            value={pickerValue}
            onChange={(event) => {
              const [year, month, day] = event.target.value.split("-");
              setPickerValue(event.target.value);
              if (year && month && day) setDateValue(`${day}/${month}/${year}`);
            }}
            className="sr-only"
          />
        </div>
      </div>
      <div>
        <label htmlFor={timeId} className="block text-sm text-muted">
          {t.admin.time}
        </label>
        <input
          id={timeId}
          name="meetingTime"
          value={timeValue}
          inputMode="numeric"
          placeholder="HH:MM"
          dir="ltr"
          autoComplete="off"
          onChange={(event) => setTimeValue(applyTime(event.target.value))}
          onBlur={() => {
            const formatted = normalizeMeetingTime(timeValue);
            if (formatted) setTimeValue(formatted);
          }}
          className={inputClass}
        />
      </div>
    </div>
  );
}

export function MeetingAttendees({
  contacts,
  selectedIds,
  other,
}: {
  contacts: { id: string; name: string }[];
  selectedIds: string[];
  other: string;
}) {
  const [ids, setIds] = useState(selectedIds);
  const available = contacts.filter((contact) => !ids.includes(contact.id));
  const names = new Map(contacts.map((contact) => [contact.id, contact.name]));

  return (
    <div>
      <p className="text-sm text-muted">{t.admin.attendees}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {ids.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
          >
            <input type="hidden" name="contactId" value={id} />
            {names.get(id) ?? id}
            <button
              type="button"
              className="text-muted hover:text-ink"
              aria-label={t.admin.remove}
              onClick={() => setIds((current) => current.filter((item) => item !== id))}
            >
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          aria-label={t.admin.addAttendee}
          disabled={available.length === 0}
          onChange={(event) => {
            const id = event.target.value;
            if (!id) return;
            setIds((current) => (current.includes(id) ? current : [...current, id]));
          }}
          className="w-44 shrink-0 rounded-md border border-line bg-card px-3 py-2 text-base text-ink outline-none focus:border-olive disabled:opacity-60"
        >
          <option value="">{t.admin.addAttendee}</option>
          {available.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
        <label className="flex min-w-40 flex-1 items-center gap-2 text-sm text-muted">
          <span className="shrink-0">{t.admin.other}</span>
          <input name="attendeesOther" defaultValue={other} className={bareInput} />
        </label>
      </div>
    </div>
  );
}
