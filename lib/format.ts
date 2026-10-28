export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function formatWhen(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function toJerusalemInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Interprets a datetime-local value as Asia/Jerusalem wall time. */
export function fromJerusalemInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const hourPart = get("hour") === 24 ? 0 : get("hour");
  const asWall = Date.UTC(get("year"), get("month") - 1, get("day"), hourPart, get("minute"), get("second"));
  const offset = asWall - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset);
}

/** Empty string when blank, canonical DD/MM/YYYY when valid, null when not a real date. */
export function normalizeMeetingDate(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const digits = /^\d{8}$/.test(value) ? `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}` : value;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(digits);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
}

/** Empty string when blank, canonical HH:mm when valid, null otherwise. Four digits such as 1300 become 13:00. */
export function normalizeMeetingTime(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const digits = /^(\d{4})$/.exec(value);
  const clock = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hours = digits ? digits[1].slice(0, 2) : clock?.[1];
  const minutes = digits ? digits[1].slice(2) : clock?.[2];
  if (hours === undefined || minutes === undefined) return null;
  const hour = Number(hours);
  const minute = Number(minutes);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Null when both parts are empty, a Date for a valid Jerusalem wall time, or "invalid". */
export function meetingStartsAt(dateRaw: string, timeRaw: string): Date | null | "invalid" {
  const date = normalizeMeetingDate(dateRaw);
  const time = normalizeMeetingTime(timeRaw);
  if (date === null || time === null) return "invalid";
  if (!date && !time) return null;
  if (!date || !time) return "invalid";
  const [day, month, year] = date.split("/");
  return fromJerusalemInput(`${year}-${month}-${day}T${time}`) ?? "invalid";
}

export function meetingOtherNames(value: string) {
  const names: string[] = [];
  for (const part of value.split(/[\n,]/)) {
    const name = part.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function joinMeetingOtherNames(values: string[]) {
  return meetingOtherNames(values.join("\n"));
}

export function splitJerusalemWhen(value: Date | string | null | undefined) {
  const combined = toJerusalemInput(value);
  if (!combined) return { date: "", time: "" };
  const [isoDate, time] = combined.split("T");
  const [year, month, day] = isoDate.split("-");
  return { date: `${day}/${month}/${year}`, time };
}

export function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}
