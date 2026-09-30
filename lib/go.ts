import { redirect, unstable_rethrow } from "next/navigation";

export function go(path: string, query?: Record<string, string | undefined>): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  redirect(search ? `${path}?${search}` : path);
}

export function rethrow(error: unknown) {
  unstable_rethrow(error);
}
