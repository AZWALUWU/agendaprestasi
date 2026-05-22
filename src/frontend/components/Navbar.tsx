import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, GraduationCap, Trophy, Zap, Calendar, Menu, X, LogIn, LogOut, LayoutDashboard, User, Lock, FileText } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@frontend/hooks/use-auth";
import { useUserRole } from "@frontend/hooks/useUserRole";
import { can } from "@backend/auth/permissions";
import { useLogout } from "@frontend/hooks/useLogout";
import { Button } from "@frontend/components/ui/button";
import { UserAvatar } from "@frontend/components/ui/UserAvatar";
import { UserDropdown } from "@frontend/components/ui/UserDropdown";

const NAV_LINKS = [
  { to: "/", label: "Beranda", icon: Home, matchExact: true },
  { to: "/?category=scholarship", label: "Beasiswa", icon: GraduationCap, matchParam: "scholarship" },
  { to: "/?category=competition", label: "Lomba", icon: Trophy, matchParam: "competition" },
  { to: "/?category=event", label: "Event", icon: Zap, matchParam: "event" },
  { to: "/calendar", label: "Kalender", icon: Calendar, matchExact: false },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const hasAdminAccess = can.accessAdmin(role ?? "public");
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  const isLinkActive = (link: typeof NAV_LINKS[number]) => {
    if (link.to === "/calendar") return location.pathname === "/calendar";
    if ("matchParam" in link && link.matchParam) {
      return location.pathname === "/" && location.searchStr?.includes(`category=${link.matchParam}`);
    }
    if (link.matchExact && link.to === "/") {
      return location.pathname === "/" && !location.searchStr?.includes("category=");
    }
    return false;
  };

  const handleNavClick = (link: typeof NAV_LINKS[number]) => {
    setMobileOpen(false);

    if ("matchParam" in link && link.matchParam) {
      navigate({ to: "/", search: { category: link.matchParam } });
      return;
    }
    if (link.to === "/" && link.matchExact) {
      navigate({ to: "/" });
      return;
    }
    navigate({ to: link.to });
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await logout();
  };

  const handleDashboard = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate({ to: "/admin" });
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate({ to: "/profile" });
  };

  const userEmail = user?.email ?? "";

  return (
    <>
      <nav className="sticky top-0 z-50 h-16 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-bold text-primary">
            Agenda Prestasi
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link);
              if (link.to === "/calendar") {
                return (
                  <Link
                    key={link.label}
                    to="/calendar"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                  >
                    {link.label}
                    {!user && <Lock className="h-3 w-3" aria-label="Perlu login" />}
                  </Link>
                );
              }
              return (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Menu pengguna"
                  aria-expanded={dropdownOpen}
                >
                  <UserAvatar email={userEmail} />
                </button>
                {dropdownOpen && (
                  <UserDropdown
                    email={userEmail}
                    hasAdminAccess={hasAdminAccess}
                    onDashboard={handleDashboard}
                    onLogout={handleLogout}
                    onProfile={handleProfile}
                  />
                )}
              </div>
            ) : (
              <Link to="/login" className="hidden md:block">
                <Button variant="outline" size="sm">
                  <LogIn className="mr-1 h-4 w-4" />
                  Masuk
                </Button>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 z-40 bg-transparent"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed left-0 right-0 top-16 z-50 overflow-hidden border-b bg-card shadow-md transition-all duration-200 ease-in-out ${mobileOpen ? "max-h-full opacity-100" : "max-h-0 opacity-0 border-b-0"
          } md:hidden`}
      >
        <div className="flex flex-col">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link);
            const Icon = link.icon;

            const commonClass = `flex items-center gap-3 border-b border-border/30 px-6 py-4 text-base font-medium transition-colors ${active
                ? "bg-primary/5 text-primary border-l-[3px] border-l-primary"
                : "text-foreground hover:bg-secondary"
              }`;

            if (link.to === "/calendar") {
              return (
                <Link
                  key={link.label}
                  to="/calendar"
                  className={commonClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                  {!user && <Lock className="ml-auto h-3.5 w-3.5" aria-label="Perlu login" />}
                </Link>
              );
            }

            return (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={commonClass}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </button>
            );
          })}

          {/* Auth section */}
          <div className="px-6 py-4">
            {user ? (
              <div className="flex flex-col gap-3">
                {/* User info */}
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                  <UserAvatar email={userEmail} />
                  <span className="truncate text-sm font-medium text-foreground">
                    {userEmail}
                  </span>
                </div>

                <button
                  onClick={handleProfile}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <User className="h-4 w-4" />
                  Profil Saya
                </button>

                {hasAdminAccess && (
                  <button
                    onClick={handleDashboard}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">
                  <LogIn className="mr-1 h-4 w-4" />
                  Masuk
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
