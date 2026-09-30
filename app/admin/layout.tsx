import { AdminNav } from "@/components/admin/nav";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="md:flex">
      <AdminNav email={user.email} />
      <div className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
