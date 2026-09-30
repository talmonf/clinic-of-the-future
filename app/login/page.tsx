import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/login-button";
import { authOptions, googleAuthConfigured } from "@/lib/auth";
import { getDb, isDbUnavailable } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { one } from "@/lib/format";
import { t } from "@/lib/i18n";
import { sql } from "drizzle-orm";

const loginErrors: Record<string, string> = {
  AccessDenied: t.login.accessDenied,
  Database: t.login.database,
  OAuthSignin: t.login.oauth,
  OAuthCallback: t.login.oauth,
  Configuration: t.login.missingConfig,
  Callback: t.login.oauth,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const errorCode = one((await searchParams).error);
  const configured = googleAuthConfigured();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (email && errorCode !== "Database" && process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const rows = await db
        .select({ active: users.active })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);
      if (rows[0]?.active) redirect("/admin");
    } catch (error) {
      if (!isDbUnavailable(error)) throw error;
    }
  }

  const message = !configured
    ? t.login.missingConfig
    : errorCode === "Database" || (!process.env.DATABASE_URL && email)
      ? t.login.database
      : errorCode
        ? (loginErrors[errorCode] ?? t.login.generic)
        : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-olive underline-offset-4 hover:underline">
        {t.nav.home}
      </Link>
      <h1 className="mt-6 font-serif text-4xl">{t.login.title}</h1>
      <p className="mt-3 leading-7 text-muted">{t.login.lead}</p>
      {message ? <p className="mt-6 rounded-md border border-clay/40 bg-card px-3 py-2 text-sm text-clay">{message}</p> : null}
      <div className="mt-6">
        <LoginButton disabled={!configured} />
      </div>
    </main>
  );
}
