"use client";

import { signIn } from "next-auth/react";
import { t } from "@/lib/i18n";

export function SignInButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => signIn("google", { callbackUrl: "/admin" })}
      className="rounded-md bg-olive px-4 py-2 text-sm text-card hover:bg-olive-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {t.login.google}
    </button>
  );
}
