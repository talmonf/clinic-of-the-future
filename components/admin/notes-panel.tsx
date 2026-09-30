import { addNote } from "@/lib/actions/documents";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/admin/ui";

export function NotesPanel({
  back,
  hidden,
  rows,
}: {
  back: string;
  hidden: Record<string, string>;
  rows: { id: string; body: string; createdAt: Date; createdBy: string | null }[];
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{t.admin.notes}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted">{t.admin.empty}</p> : null}
      <ul className="mt-4 space-y-3">
        {rows.map((note) => (
          <li key={note.id} className="rounded-lg border border-line bg-card px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
            <p className="mt-2 text-xs text-muted">
              {formatWhen(note.createdAt)}
              {note.createdBy ? ` · ${note.createdBy}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <form action={addNote} className="mt-4 grid gap-3">
        <input type="hidden" name="back" value={back} />
        {Object.entries(hidden).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <Field label={t.admin.addNote}>
          <textarea name="body" required className={inputClass} />
        </Field>
        <SubmitButton>{t.admin.addNote}</SubmitButton>
      </form>
    </section>
  );
}
