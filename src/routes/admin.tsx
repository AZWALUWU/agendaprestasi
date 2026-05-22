import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@frontend/hooks/use-auth";
import { useUserRole } from "@frontend/hooks/useUserRole";
import { can } from "@backend/auth/permissions";
import { toast } from "sonner";
import { useEffect } from "react";
import { signOut } from "@backend/auth/auth";
import { Button } from "@frontend/components/ui/button";
import { FullPageSpinner } from "@frontend/components/ui/FullPageSpinner";
import { LayoutDashboard, LogOut, FileQuestion, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const isLoading = loading || roleLoading;
  const hasAccess = can.accessAdmin(role ?? "public");

  useEffect(() => {
    if (isLoading) return; // wait for both auth and role
    if (!user) {
      navigate({ to: "/login" });
    } else if (!hasAccess) {
      toast.error("Akses ditolak");
      navigate({ to: "/" });
    }
  }, [isLoading, user, hasAccess, navigate]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user || !hasAccess) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-primary">Agenda Prestasi</Link>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {role === "super_admin" ? "Super Admin" : "Admin"}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/admin" className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Posts</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-1 h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
