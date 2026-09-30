"use client";

import { useActionState } from "react";
import { submitInterest, type InterestState } from "@/lib/actions/interest";
import { t } from "@/lib/i18n";
import { publicCategories } from "@/lib/options";
import { Field, inputClass } from "@/components/admin/ui";

const initial: InterestState = { ok: false };

export function InterestForm() {
  const [state, action, pending] = useActionState(submitInterest, initial);
  if (state.ok) {
    return <p className="rounded-md border border-olive/30 bg-card px-3 py-3 text-sm">{t.public.thanks}</p>;
  }
  const values = state.values;
  return (
    <form action={action} className="grid gap-4">
      {state.error ? (
        <p className="rounded-md border border-clay/40 bg-card px-3 py-2 text-sm text-clay">{t.errors[state.error]}</p>
      ) : null}
      <Field label={t.public.name}>
        <input name="name" required maxLength={120} defaultValue={values?.name} className={inputClass} />
      </Field>
      <Field label={t.public.email}>
        <input name="email" type="email" required maxLength={200} defaultValue={values?.email} className={inputClass} dir="ltr" />
      </Field>
      <Field label={t.public.organization}>
        <input name="organization" maxLength={200} defaultValue={values?.organization} className={inputClass} />
      </Field>
      <Field label={t.public.category}>
        <select name="category" required defaultValue={values?.category || "partner"} className={inputClass}>
          {publicCategories.map((category) => (
            <option key={category} value={category}>
              {t.categories[category]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.public.message}>
        <textarea name="message" required maxLength={4000} defaultValue={values?.message} className={inputClass} />
      </Field>
      <p className="text-sm leading-6 text-muted">{t.public.disclaimer}</p>
      <button type="submit" disabled={pending} className="inline-flex w-fit items-center rounded-md bg-olive px-4 py-2 text-sm text-paper disabled:opacity-60">
        {pending ? t.public.sending : t.public.send}
      </button>
    </form>
  );
}
