export const documentStatuses = ["draft", "in_progress", "pending_approval", "approved"] as const;
export const taskStatuses = ["open", "done"] as const;
export const contactCategories = [
  "partner",
  "professional",
  "other",
  "referrer",
  "investor",
  "vendor",
  "stakeholder",
] as const;
export const publicCategories = ["partner", "professional", "other"] as const;
export const contactStatuses = ["new", "in_conversation", "active", "paused"] as const;
export const appointmentKinds = ["advisor", "site_visit", "vendor", "other"] as const;
export const levelValues = ["נמוכה", "בינונית", "גבוהה"] as const;

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

export const isDocumentStatus = (value: string) => includes(documentStatuses, value);
export const isTaskStatus = (value: string) => includes(taskStatuses, value);
export const isContactCategory = (value: string) => includes(contactCategories, value);
export const isPublicCategory = (value: string) => includes(publicCategories, value);
export const isContactStatus = (value: string) => includes(contactStatuses, value);
export const isAppointmentKind = (value: string) => includes(appointmentKinds, value);

export function optionalId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
