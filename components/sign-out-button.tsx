"use client";

import { signOut } from "next-auth/react";
import { t } from "@/lib/i18n";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="text-sm text-muted underline-offset-4 hover:underline"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      {t.nav.signOut}
    </button>
  );
}
