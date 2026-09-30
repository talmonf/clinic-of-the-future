import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_NOT_CONFIGURED");
    this.name = "DbNotConfiguredError";
  }
}

let cached: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  if (!cached) {
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

export function isDbUnavailable(error: unknown) {
  if (error instanceof DbNotConfiguredError) return true;
  if (!(error instanceof Error)) return false;
  return /fetch failed|ECONN|ENOTFOUND|getaddrinfo|password authentication|DATABASE/i.test(
    error.message,
  );
}
