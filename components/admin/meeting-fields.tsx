"use client";

import { useId, useState, type ReactNode } from "react";
import { meetingOtherNames, normalizeMeetingDate, normalizeMeetingTime } from "@/lib/format";
import { t } from "@/lib/i18n";

const whenInput =
  "w-auto rounded-md border border-line bg-card px-3 py-2 text-base tabular-nums text-ink outline-none focus:border-olive [field-sizing:content]";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden className="h-5 w-5">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink">
      {children}
      <button type="button" className="text-muted hover:text-ink" aria-label={t.admin.remove} onClick={onRemove}>
        ×
      </button>
    </span>
  );
}

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
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor={dateId} className="block text-sm text-muted">
          {t.admin.date}
        </label>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            id={dateId}
            name="meetingDate"
            value={dateValue}
            size={10}
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            dir="ltr"
            autoComplete="off"
            onChange={(event) => commitDate(event.target.value)}
            onBlur={() => {
              const formatted = normalizeMeetingDate(dateValue);
              if (formatted) commitDate(formatted);
            }}
            className={whenInput}
          />
          <div className="relative inline-flex">
            <span
              aria-hidden
              className="inline-flex items-center justify-center rounded-md border border-line bg-card px-2 text-ink"
            >
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
                const [year, month, day] = event.target.value.split("-");
                setPickerValue(event.target.value);
                if (year && month && day) setDateValue(`${day}/${month}/${year}`);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
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
          size={5}
          inputMode="numeric"
          placeholder="HH:MM"
          dir="ltr"
          autoComplete="off"
          onChange={(event) => setTimeValue(applyTime(event.target.value))}
          onBlur={() => {
            const formatted = normalizeMeetingTime(timeValue);
            if (formatted) setTimeValue(formatted);
          }}
          className={`${whenInput} mt-1`}
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
  const otherId = useId();
  const [ids, setIds] = useState(selectedIds);
  const [others, setOthers] = useState(() => meetingOtherNames(other));
  const [draft, setDraft] = useState("");
  const available = contacts.filter((contact) => !ids.includes(contact.id));
  const names = new Map(contacts.map((contact) => [contact.id, contact.name]));

  function addOther() {
    const name = draft.trim();
    if (!name || others.includes(name)) {
      setDraft("");
      return;
    }
    setOthers((current) => [...current, name]);
    setDraft("");
  }

  return (
    <div>
      <p className="text-sm text-muted">{t.admin.attendees}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {ids.map((id) => (
          <Chip key={id} onRemove={() => setIds((current) => current.filter((item) => item !== id))}>
            <input type="hidden" name="contactId" value={id} />
            {names.get(id) ?? id}
          </Chip>
        ))}
        {others.map((name) => (
          <Chip key={name} onRemove={() => setOthers((current) => current.filter((item) => item !== name))}>
            <input type="hidden" name="attendeesOther" value={name} />
            {name}
          </Chip>
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
        <div className="inline-flex items-center gap-2">
          <label htmlFor={otherId} className="text-sm text-muted">
            {t.admin.other}
          </label>
          <input
            id={otherId}
            name="attendeesOther"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addOther();
            }}
            className="w-36 rounded-md border border-line bg-card px-3 py-2 text-base text-ink outline-none focus:border-olive"
          />
          <button
            type="button"
            aria-label={t.admin.addAttendee}
            onClick={addOther}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-card text-lg text-ink hover:bg-paper-2"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
