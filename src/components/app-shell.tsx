import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, PiggyBank, CreditCard, Wallet, Settings, LogOut, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useProfile, useHousehold } from "@/hooks/useProfile";
import type { ReactNode } from "react";

const nav = [
  { to: "/app", label: "Check-in", icon: LayoutDashboard },
  { to: "/app/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/app/income", label: "Income", icon: Wallet },
  { to: "/app/cards", label: "Cards", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: household } = useHousehold();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-8 md:py-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-8">
            <Link to="/app" className="flex items-center gap-2 pb-8">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-lg leading-none">twohearts</div>
                <div className="text-xs text-muted-foreground">{household?.name ?? "Setting up..."}</div>
              </div>
            </Link>
            <nav className="flex flex-col gap-1">
              {nav.map((item) => {
                const active =
                  item.to === "/app"
                    ? location.pathname === "/app"
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-10 rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Signed in</div>
              <div className="mt-1 truncate text-sm font-medium">{profile?.display_name || profile?.email}</div>
              <button
                onClick={signOut}
                className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="md:hidden mb-6 flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Heart className="h-4 w-4" />
              </div>
              <span className="font-display text-lg">twohearts</span>
            </Link>
            <button onClick={signOut} className="text-xs text-muted-foreground">Sign out</button>
          </div>
          {children}
          <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl justify-between px-2 py-1.5">
              {nav.map((item) => {
                const active =
                  item.to === "/app"
                    ? location.pathname === "/app"
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] font-medium",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="h-16 md:hidden" />
        </main>
      </div>
    </div>
  );
}