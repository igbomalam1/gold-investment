import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Coins, History, User, LogOut, Bell, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/invest", label: "Invest", icon: Coins },
  { to: "/dashboard/history", label: "History", icon: History },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

export function DashboardShell() {
  const loc = useLocation();
  const path = loc.pathname;
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/dashboard"><Logo size={36} withText={false} /></Link>
          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => {
              const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary/15 text-primary" : "text-foreground/75 hover:text-primary"
                  }`}
                >
                  <n.icon size={15} /> {n.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-full border border-border/70 hover:border-primary">
              <Bell size={15} />
            </button>
            <button
              onClick={handleSignOut}
              className="hidden h-9 items-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-medium hover:border-destructive hover:text-destructive sm:inline-flex"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((n) => {
            const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`grid h-10 w-10 place-items-center rounded-2xl transition-all ${active ? "bg-primary/15" : ""}`}>
                  <n.icon size={18} />
                </div>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
