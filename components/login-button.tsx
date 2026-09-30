"use client";

import { signIn } from "next-auth/react";
import { t } from "@/lib/i18n";
import { buttonClass } from "@/components/admin/ui";

export function LoginButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass}
      disabled={disabled}
      onClick={() => signIn("google", { callbackUrl: "/admin" })}
    >
      {t.login.google}
    </button>
  );
}
