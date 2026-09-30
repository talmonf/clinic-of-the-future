import { saveAssumption, saveDecision, saveRisk } from "@/lib/actions/logs";
import { saveAppointment } from "@/lib/actions/appointments";
import { saveContact } from "@/lib/actions/contacts";
import { saveMeeting } from "@/lib/actions/meetings";
import { saveTask } from "@/lib/actions/tasks";
import { saveAgent } from "@/lib/actions/agents";
import { toJerusalemInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { appointmentKinds, contactCategories, contactStatuses, taskStatuses } from "@/lib/options";
import { SubmitButton } from "@/components/submit-button";
import { Field, LevelInput, inputClass } from "@/components/admin/ui";

type DocOption = { id: string; number: number | null; title: string };
type Named = { id: string; title: string };

function docLabel(doc: DocOption) {
  return `${doc.number ? String(doc.number).padStart(2, "0") + " · " : ""}${doc.title}`;
}

function DocSelect({ docs, selected }: { docs: DocOption[]; selected?: string | null }) {
  return (
    <select name="documentId" defaultValue={selected ?? ""} className={inputClass}>
      <option value="">{t.admin.none}</option>
      {docs.map((doc) => (
        <option key={doc.id} value={doc.id}>
          {docLabel(doc)}
        </option>
      ))}
    </select>
  );
}

function MeetingSelect({ meetings, selected }: { meetings: Named[]; selected?: string | null }) {
  return (
    <select name="meetingId" defaultValue={selected ?? ""} className={inputClass}>
      <option value="">{t.admin.none}</option>
      {meetings.map((meeting) => (
        <option key={meeting.id} value={meeting.id}>
          {meeting.title}
        </option>
      ))}
    </select>
  );
}

export function DecisionForm({
  decision,
  docs,
  meetings,
  preset,
}: {
  decision?: {
    id: string;
    decidedOn: string | null;
    subject: string;
    decision: string;
    rationale: string;
    implication: string;
    ownerName: string;
    meetingId: string | null;
    documentId: string | null;
  };
  docs: DocOption[];
  meetings: Named[];
  preset?: { meetingId?: string | null; documentId?: string | null };
}) {
  return (
    <form action={saveDecision} className="grid gap-4">
      {decision ? <input type="hidden" name="id" value={decision.id} /> : null}
      <Field label={t.admin.date}>
        <input name="decidedOn" type="date" defaultValue={decision?.decidedOn ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.subject}>
        <input name="subject" required defaultValue={decision?.subject ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.decision}>
        <textarea name="decision" required defaultValue={decision?.decision ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.rationale}>
        <textarea name="rationale" defaultValue={decision?.rationale ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.implication}>
        <textarea name="implication" defaultValue={decision?.implication ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.owner}>
        <input name="ownerName" defaultValue={decision?.ownerName ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.meeting}>
        <MeetingSelect meetings={meetings} selected={decision?.meetingId ?? preset?.meetingId} />
      </Field>
      <Field label={t.admin.document}>
        <DocSelect docs={docs} selected={decision?.documentId ?? preset?.documentId} />
      </Field>
      <SubmitButton>{decision ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function AssumptionForm({
  row,
  docs,
  presetDocumentId,
}: {
  row?: {
    id: string;
    statement: string;
    importance: string;
    certainty: string;
    howToTest: string;
    finding: string;
    decisionText: string;
    documentId: string | null;
  };
  docs: DocOption[];
  presetDocumentId?: string | null;
}) {
  return (
    <form action={saveAssumption} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.statement}>
        <textarea name="statement" required defaultValue={row?.statement ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.importance}>
        <LevelInput name="importance" defaultValue={row?.importance} />
      </Field>
      <Field label={t.admin.certainty}>
        <LevelInput name="certainty" defaultValue={row?.certainty} />
      </Field>
      <Field label={t.admin.howToTest}>
        <textarea name="howToTest" defaultValue={row?.howToTest ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.finding}>
        <textarea name="finding" defaultValue={row?.finding ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.decision}>
        <textarea name="decisionText" defaultValue={row?.decisionText ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.document}>
        <DocSelect docs={docs} selected={row?.documentId ?? presetDocumentId} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function RiskForm({
  row,
}: {
  row?: {
    id: string;
    risk: string;
    probability: string;
    impact: string;
    prevention: string;
    response: string;
    ownerName: string;
  };
}) {
  return (
    <form action={saveRisk} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.risk}>
        <textarea name="risk" required defaultValue={row?.risk ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.probability}>
        <LevelInput name="probability" defaultValue={row?.probability} />
      </Field>
      <Field label={t.admin.impact}>
        <LevelInput name="impact" defaultValue={row?.impact} />
      </Field>
      <Field label={t.admin.prevention}>
        <textarea name="prevention" defaultValue={row?.prevention ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.response}>
        <textarea name="response" defaultValue={row?.response ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.owner}>
        <input name="ownerName" defaultValue={row?.ownerName ?? ""} className={inputClass} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function MeetingForm({
  row,
  docs,
}: {
  row?: {
    id: string;
    title: string;
    startsAt: Date | null;
    documentId: string | null;
    agenda: string;
    prepQuestions: string;
    discussion: string;
    clarifications: string;
    gaps: string;
    summary: string;
  };
  docs: DocOption[];
}) {
  return (
    <form action={saveMeeting} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.title}>
        <input name="title" required defaultValue={row?.title ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.when}>
        <input name="startsAt" type="datetime-local" defaultValue={toJerusalemInput(row?.startsAt)} className={inputClass} />
      </Field>
      <Field label={t.admin.document}>
        <DocSelect docs={docs} selected={row?.documentId} />
      </Field>
      <Field label={t.admin.agenda}>
        <textarea name="agenda" defaultValue={row?.agenda ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.prep}>
        <textarea name="prepQuestions" defaultValue={row?.prepQuestions ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.discussion}>
        <textarea name="discussion" defaultValue={row?.discussion ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.clarifications}>
        <textarea name="clarifications" defaultValue={row?.clarifications ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.gaps}>
        <textarea name="gaps" defaultValue={row?.gaps ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.summary}>
        <textarea name="summary" defaultValue={row?.summary ?? ""} className={inputClass} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function AppointmentForm({
  row,
  contacts,
}: {
  row?: {
    id: string;
    title: string;
    startsAt: Date | null;
    endsAt: Date | null;
    kind: string;
    withWhom: string;
    location: string;
    notes: string;
    contactId: string | null;
  };
  contacts: { id: string; name: string }[];
}) {
  return (
    <form action={saveAppointment} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.title}>
        <input name="title" required defaultValue={row?.title ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.kind}>
        <select name="kind" defaultValue={row?.kind ?? "other"} className={inputClass}>
          {appointmentKinds.map((kind) => (
            <option key={kind} value={kind}>
              {t.appointmentKind[kind]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.admin.when}>
        <input name="startsAt" type="datetime-local" defaultValue={toJerusalemInput(row?.startsAt)} className={inputClass} />
      </Field>
      <Field label={t.admin.ends}>
        <input name="endsAt" type="datetime-local" defaultValue={toJerusalemInput(row?.endsAt)} className={inputClass} />
      </Field>
      <Field label={t.admin.withWhom}>
        <input name="withWhom" defaultValue={row?.withWhom ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.location}>
        <input name="location" defaultValue={row?.location ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.linkedContact}>
        <select name="contactId" defaultValue={row?.contactId ?? ""} className={inputClass}>
          <option value="">{t.admin.none}</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.admin.notes}>
        <textarea name="notes" defaultValue={row?.notes ?? ""} className={inputClass} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function ContactForm({
  row,
}: {
  row?: {
    id: string;
    name: string;
    email: string | null;
    organization: string;
    category: string;
    contactStatus: string;
    contribution: string;
    mutualValue: string;
    nextAction: string;
    message: string;
  };
}) {
  return (
    <form action={saveContact} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.public.name}>
        <input name="name" required defaultValue={row?.name ?? ""} className={inputClass} />
      </Field>
      <Field label={t.public.email}>
        <input name="email" type="email" defaultValue={row?.email ?? ""} className={inputClass} dir="ltr" />
      </Field>
      <Field label={t.admin.organization}>
        <input name="organization" defaultValue={row?.organization ?? ""} className={inputClass} />
      </Field>
      <Field label={t.public.category}>
        <select name="category" defaultValue={row?.category ?? "stakeholder"} className={inputClass}>
          {contactCategories.map((category) => (
            <option key={category} value={category}>
              {t.categories[category]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.admin.status}>
        <select name="contactStatus" defaultValue={row?.contactStatus ?? "new"} className={inputClass}>
          {contactStatuses.map((status) => (
            <option key={status} value={status}>
              {t.contactStatus[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.admin.contribution}>
        <textarea name="contribution" defaultValue={row?.contribution ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.mutualValue}>
        <textarea name="mutualValue" defaultValue={row?.mutualValue ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.nextAction}>
        <input name="nextAction" defaultValue={row?.nextAction ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.message}>
        <textarea name="message" defaultValue={row?.message ?? ""} className={inputClass} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function TaskForm({
  row,
  docs,
  meetings,
  preset,
}: {
  row?: {
    id: string;
    title: string;
    details: string;
    status: string;
    ownerName: string;
    dueOn: string | null;
    documentId: string | null;
    meetingId: string | null;
  };
  docs: DocOption[];
  meetings: Named[];
  preset?: { meetingId?: string | null; documentId?: string | null };
}) {
  return (
    <form action={saveTask} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.title}>
        <input name="title" required defaultValue={row?.title ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.details}>
        <textarea name="details" defaultValue={row?.details ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.status}>
        <select name="status" defaultValue={row?.status ?? "open"} className={inputClass}>
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {t.taskStatus[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.admin.owner}>
        <input name="ownerName" defaultValue={row?.ownerName ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.due}>
        <input name="dueOn" type="date" defaultValue={row?.dueOn ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.document}>
        <DocSelect docs={docs} selected={row?.documentId ?? preset?.documentId} />
      </Field>
      <Field label={t.admin.meeting}>
        <MeetingSelect meetings={meetings} selected={row?.meetingId ?? preset?.meetingId} />
      </Field>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}

export function AgentForm({
  row,
}: {
  row?: { id: string; slug: string; name: string; purpose: string; systemPrompt: string; active: boolean };
}) {
  return (
    <form action={saveAgent} className="grid gap-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Field label={t.admin.agentSlug}>
        <input name="slug" required={!row} readOnly={Boolean(row)} defaultValue={row?.slug ?? ""} className={inputClass} dir="ltr" />
      </Field>
      <Field label={t.admin.agentName}>
        <input name="name" required defaultValue={row?.name ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.agentPurpose}>
        <textarea name="purpose" defaultValue={row?.purpose ?? ""} className={inputClass} />
      </Field>
      <Field label={t.admin.agentPrompt}>
        <textarea name="systemPrompt" required defaultValue={row?.systemPrompt ?? ""} className={`${inputClass} min-h-40`} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={row?.active ?? true} />
        {t.admin.agentActive}
      </label>
      <SubmitButton>{row ? t.admin.save : t.admin.create}</SubmitButton>
    </form>
  );
}
