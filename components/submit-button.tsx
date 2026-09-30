"use client";

import { useFormStatus } from "react-dom";
import { t } from "@/lib/i18n";
import { buttonClass } from "@/components/admin/ui";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass} disabled={pending}>
      {pending ? t.admin.saving : children}
    </button>
  );
}
