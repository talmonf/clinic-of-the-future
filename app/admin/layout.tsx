import { AdminNav } from "@/components/admin/nav";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="md:flex md:h-dvh">
      <AdminNav email={user.email} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-auto px-4 py-6 md:h-dvh md:min-h-0 md:px-8">
        {children}
      </div>
    </div>
  );
}
