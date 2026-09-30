import { getServerSession } from "next-auth";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { getDb, isDbUnavailable } from "./db";
import { users } from "./db/schema";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  try {
    const db = getDb();
    const rows = await db
      .select({ active: users.active, name: users.name })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (!rows[0]?.active) redirect("/login?error=AccessDenied");
    return { email, name: rows[0].name ?? session?.user?.name ?? email };
  } catch (error) {
    if (isDbUnavailable(error)) redirect("/login?error=Database");
    throw error;
  }
}
