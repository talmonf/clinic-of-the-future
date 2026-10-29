import { fromJerusalemInput, normalizeMeetingDate } from "@/lib/format";

export function isoDate(value: string | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const display = normalizeMeetingDate(value);
  if (!display) return "";
  const [day, month, year] = display.split("/");
  return `${year}-${month}-${day}`;
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

export function withinDayRange(value: Date, from: string, to: string) {
  const start = from ? jerusalemDayStart(from) : null;
  const end = to ? jerusalemDayStart(nextIsoDate(to)) : null;
  if (from && !start) return false;
  if (to && !end) return false;
  if (start && value.getTime() < start.getTime()) return false;
  if (end && value.getTime() >= end.getTime()) return false;
  return true;
}
