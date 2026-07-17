import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useProfile, useHouseholdMembers } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { budgetStatus, cycleLabel, currentCycleMonth, daysUntil, formatMoney, paydaysForCycle, statusTone } from "@/lib/finance";
import { AlertCircle, TrendingUp, Wallet, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && profile && !profile.household_id) navigate({ to: "/app/setup", replace: true });
  }, [profile, isLoading, navigate]);

  const cycle = currentCycleMonth();
  const hid = profile?.household_id;

  const cats = useQuery({
    enabled: !!hid,
    queryKey: ["cats-cycle", hid, cycle],
    queryFn: async () => {
      const [{ data: categories }, { data: cycles }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("category_cycles").select("*").eq("cycle_month", cycle),
      ]);
      return (categories ?? []).map((c) => {
        const cyc = (cycles ?? []).find((x) => x.category_id === c.id);
        return { ...c, actual_spend: Number(cyc?.actual_spend ?? 0) };
      });
    },
  });

  const income = useQuery({
    enabled: !!hid,
    queryKey: ["income-summary", hid, cycle],
    queryFn: async () => {
      const [{ data: sources }, { data: actuals }, { data: other }] = await Promise.all([
        supabase.from("income_sources").select("id, baseline_amount, payday_days"),
        supabase.from("payday_actuals").select("income_source_id, payday_date, actual_amount"),
        supabase.from("other_income").select("amount, received_on").gte("received_on", cycle),
      ]);
      const regular = (sources ?? []).reduce((sum, src) => {
        const paydays = paydaysForCycle(cycle, src.payday_days ?? []);
        return sum + paydays.reduce((s, d) => {
          const a = (actuals ?? []).find((x) => x.income_source_id === src.id && x.payday_date === d);
          return s + Number(a?.actual_amount ?? src.baseline_amount ?? 0);
        }, 0);
      }, 0);
      const otherTotal = (other ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return { regular, otherTotal, total: regular + otherTotal };
    },
  });

  const soas = useQuery({
    enabled: !!hid,
    queryKey: ["soas-active", hid],
    queryFn: async () => {
      const { data } = await supabase
        .from("soa_entries")
        .select("*, credit_cards(name)")
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: members } = useHouseholdMembers();

  const totals = useMemo(() => {
    const list = cats.data ?? [];
    const budgeted = list.reduce((s, c) => s + Number(c.base_budget_amount), 0);
    const spent = list.reduce((s, c) => s + c.actual_spend, 0);
    const alerts = list.filter((c) => budgetStatus(c.actual_spend, Number(c.base_budget_amount)) !== "on_track");
    return { budgeted, spent, alerts };
  }, [cats.data]);

  const upcoming = (soas.data ?? []).filter((s) => s.status === "unpaid" && daysUntil(s.due_date) <= 7);

  if (!profile?.household_id) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{cycleLabel(cycle)} check-in</p>
        <h1 className="mt-1 font-display text-3xl md:text-4xl">
          {members && members.length >= 2 ? "How are you two doing?" : "Where you stand"}
        </h1>
      </header>

      <div className="grid grid-cols-6 gap-4">
        <Tile className="col-span-6 md:col-span-4 md:row-span-2 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <TrendingUp className="h-3.5 w-3.5" /> Cycle overview
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm opacity-80">Income this cycle</div>
              <div className="mt-1 font-display text-4xl">{formatMoney(income.data?.total ?? 0)}</div>
              <div className="mt-1 text-xs opacity-70">
                {formatMoney(income.data?.regular ?? 0)} salaries · {formatMoney(income.data?.otherTotal ?? 0)} other
              </div>
            </div>
            <div>
              <div className="text-sm opacity-80">Total budgeted</div>
              <div className="mt-1 font-display text-4xl">{formatMoney(totals.budgeted)}</div>
              <div className="mt-1 text-xs opacity-70">{formatMoney(totals.spent)} spent so far</div>
            </div>
          </div>
          <div className="mt-6 h-2 rounded-full bg-primary-foreground/20">
            <div
              className="h-2 rounded-full bg-primary-foreground"
              style={{ width: `${Math.min(100, totals.budgeted ? (totals.spent / totals.budgeted) * 100 : 0)}%` }}
            />
          </div>
        </Tile>

        <Tile className="col-span-6 md:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" /> Needs attention
          </div>
          {totals.alerts.length === 0 && upcoming.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" /> All quiet. Nice.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {totals.alerts.slice(0, 3).map((c) => {
                const st = budgetStatus(c.actual_spend, Number(c.base_budget_amount));
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    <span className={cn("font-medium", statusTone(st))}>{st === "over" ? "over" : "80%+"}</span>
                  </li>
                );
              })}
              {upcoming.slice(0, 3).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-[color:var(--warning)]">
                  <span className="truncate">
                    {(s as { credit_cards?: { name?: string } }).credit_cards?.name} due {daysUntil(s.due_date)}d
                  </span>
                  <span className="font-medium">{formatMoney(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile className="col-span-3 md:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Categories
          </div>
          <div className="mt-2 font-display text-3xl">{(cats.data ?? []).length}</div>
          <Link to="/app/budgets" className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">
            Manage budgets →
          </Link>
        </Tile>

        <Tile className="col-span-3 md:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" /> Unpaid statements
          </div>
          <div className="mt-2 font-display text-3xl">
            {(soas.data ?? []).filter((s) => s.status === "unpaid").length}
          </div>
          <Link to="/app/cards" className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">
            View cards →
          </Link>
        </Tile>
      </div>

      <section>
        <h2 className="font-display text-xl mb-3">Category status</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(cats.data ?? []).map((c) => {
            const budget = Number(c.base_budget_amount);
            const pct = budget > 0 ? Math.min(100, (c.actual_spend / budget) * 100) : 0;
            const st = budgetStatus(c.actual_spend, budget);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {c.owner.replace("_", " ")} · {c.rollover_setting}
                    </div>
                  </div>
                  <div className={cn("text-xs font-semibold", statusTone(st))}>
                    {st === "over" ? "over" : st === "near" ? "close" : "on track"}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="font-display text-lg">{formatMoney(c.actual_spend)}</span>
                  <span className="text-muted-foreground">of {formatMoney(budget)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      st === "over" ? "bg-destructive" : st === "near" ? "bg-[color:var(--warning)]" : "bg-primary",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {(cats.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>{children}</div>;
}