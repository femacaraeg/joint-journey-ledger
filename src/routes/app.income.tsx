import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useHouseholdMembers } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { formatMoney, currentCycleMonth, paydaysForCycle, isPast } from "@/lib/finance";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type IncomeSource = {
  id: string;
  user_id: string;
  label: string;
  baseline_amount: number;
  pay_frequency: "monthly" | "semi_monthly" | "biweekly" | "weekly";
  payday_days: number[];
};

type PaydayActual = {
  id: string;
  income_source_id: string;
  payday_date: string;
  actual_amount: number;
  note: string | null;
};

type OtherIncomeRow = {
  id: string;
  user_id: string;
  amount: number;
  received_on: string;
  source_label: string;
  note: string | null;
};

export const Route = createFileRoute("/app/income")({
  component: Income,
});

function Income() {
  const { data: profile } = useProfile();
  const session = useSession();
  const { data: members } = useHouseholdMembers();
  const hid = profile?.household_id;
  const qc = useQueryClient();

  const sources = useQuery({
    enabled: !!hid,
    queryKey: ["income_sources", hid],
    queryFn: async () => {
      const { data } = await supabase.from("income_sources").select("*").order("created_at");
      return (data ?? []) as IncomeSource[];
    },
  });

  const cycle = currentCycleMonth();
  const actuals = useQuery({
    enabled: !!hid,
    queryKey: ["payday_actuals", hid, cycle],
    queryFn: async () => {
      const { data } = await supabase
        .from("payday_actuals")
        .select("*")
        .gte("payday_date", cycle);
      return (data ?? []) as PaydayActual[];
    },
  });

  const other = useQuery({
    enabled: !!hid,
    queryKey: ["other_income", hid],
    queryFn: async () => {
      const { data } = await supabase.from("other_income").select("*").order("received_on", { ascending: false });
      return (data ?? []) as OtherIncomeRow[];
    },
  });

  const delSource = useMutation({
    mutationFn: async (id: string) => { await supabase.from("income_sources").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income_sources"] }),
  });
  const delOther = useMutation({
    mutationFn: async (id: string) => { await supabase.from("other_income").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["other_income"] }),
  });

  const nameFor = (uid: string) => members?.find((m) => m.id === uid)?.display_name ?? "—";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Regular income · {format(new Date(cycle + "T00:00:00"), "MMMM yyyy")}</p>
            <h1 className="mt-1 font-display text-3xl">Paydays</h1>
            <p className="mt-2 text-xs text-muted-foreground max-w-xl">
              Set a baseline per payday for planning. When each payday actually happens, log the amount you received — the check-in uses actuals when available and falls back to baseline (marked estimated) otherwise.
            </p>
          </div>
          <IncomeSourceDialog householdId={hid ?? undefined} userId={session?.user.id} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(sources.data ?? []).map((s) => {
            const paydays = paydaysForCycle(cycle, s.payday_days ?? []);
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{nameFor(s.user_id)}</div>
                  </div>
                  <div className="flex gap-1">
                    <IncomeSourceDialog householdId={hid ?? undefined} userId={s.user_id} source={s} trigger={
                      <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
                    } />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete "${s.label}"?`)) delSource.mutate(s.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-display text-2xl">{formatMoney(s.baseline_amount)}</div>
                  <div className="text-xs text-muted-foreground">baseline / payday</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.pay_frequency.replace("_", "-")} · paid on {s.payday_days.join(", ")}
                </div>
                <div className="mt-4 border-t border-border pt-3 space-y-1.5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">This cycle</div>
                  {paydays.map((d) => {
                    const actual = (actuals.data ?? []).find((a) => a.income_source_id === s.id && a.payday_date === d);
                    const past = isPast(d);
                    return (
                      <div key={d} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(d + "T00:00:00"), "MMM d")}</span>
                          {actual ? (
                            <span className="rounded-full bg-[color:var(--success)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--success)]">logged</span>
                          ) : past ? (
                            <span className="rounded-full bg-[color:var(--warning)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--warning)]">estimated</span>
                          ) : (
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">upcoming</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("tabular-nums", !actual && "text-muted-foreground")}>
                            {formatMoney(actual?.actual_amount ?? s.baseline_amount)}
                          </span>
                          <PaydayActualDialog
                            householdId={hid ?? undefined}
                            source={s}
                            paydayDate={d}
                            existing={actual}
                            trigger={
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                {actual ? "Edit" : "Log"}
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                  {paydays.length === 0 && (
                    <div className="text-xs text-muted-foreground">No paydays configured.</div>
                  )}
                </div>
              </div>
            );
          })}
          {(sources.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No income sources yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">One-off & irregular</p>
            <h2 className="mt-1 font-display text-2xl">Other income</h2>
          </div>
          <OtherIncomeDialog householdId={hid ?? undefined} userId={session?.user.id} />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Who</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(other.data ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3">{format(new Date(o.received_on), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">
                    {o.source_label}
                    {o.note ? <div className="text-xs text-muted-foreground">{o.note}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{nameFor(o.user_id)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(o.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <OtherIncomeDialog householdId={hid ?? undefined} userId={o.user_id} existing={o} trigger={
                        <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
                      } />
                      <Button size="icon" variant="ghost" onClick={() => delOther.mutate(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(other.data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function IncomeSourceDialog({ householdId, userId, source, trigger }: { householdId?: string; userId?: string; source?: IncomeSource; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const days = String(fd.get("days") || "")
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
      const payload = {
        label: String(fd.get("label")),
        baseline_amount: Number(fd.get("amount")),
        pay_frequency: String(fd.get("frequency")) as "monthly" | "semi_monthly" | "biweekly" | "weekly",
        payday_days: days.length ? days : [15, 30],
      };
      if (source) {
        const { error } = await supabase.from("income_sources").update(payload).eq("id", source.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("income_sources").insert({
          household_id: householdId!,
          user_id: userId!,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income_sources"] });
      setOpen(false);
      toast.success(source ? "Income updated" : "Income added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-1 h-4 w-4" /> Add income</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{source ? "Edit income source" : "Add income source"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="label">Label</Label><Input id="label" name="label" defaultValue={source?.label ?? "Salary"} /></div>
          <div className="space-y-1.5"><Label htmlFor="amount">Baseline amount per payday (₱)</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={source?.baseline_amount ?? ""} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue={source?.pay_frequency ?? "semi_monthly"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="days">Payday(s)</Label><Input id="days" name="days" placeholder="15, 30" defaultValue={source?.payday_days?.join(", ") ?? "15, 30"} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Changes to baseline apply going forward. Logged actuals for past paydays are historical.</p>
          <DialogFooter><Button type="submit" disabled={save.isPending}>{source ? "Save changes" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaydayActualDialog({ householdId, source, paydayDate, existing, trigger }: {
  householdId?: string;
  source: IncomeSource;
  paydayDate: string;
  existing?: PaydayActual;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const payload = {
        household_id: householdId!,
        income_source_id: source.id,
        payday_date: paydayDate,
        actual_amount: Number(fd.get("amount")),
        note: String(fd.get("note") || "") || null,
      };
      if (existing) {
        const { error } = await supabase.from("payday_actuals").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payday_actuals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payday_actuals"] });
      setOpen(false);
      toast.success(existing ? "Updated" : "Logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase.from("payday_actuals").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payday_actuals"] });
      setOpen(false);
      toast.success("Removed");
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit actual" : "Log actual"} · {format(new Date(paydayDate + "T00:00:00"), "MMM d, yyyy")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="text-xs text-muted-foreground">{source.label} · baseline {formatMoney(source.baseline_amount)}</div>
          <div className="space-y-1.5"><Label htmlFor="amount">Actual received (₱)</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={existing?.actual_amount ?? source.baseline_amount} required />
          </div>
          <div className="space-y-1.5"><Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" placeholder="Holiday pay, bonus, etc." defaultValue={existing?.note ?? ""} />
          </div>
          <DialogFooter className="gap-2">
            {existing && (
              <Button type="button" variant="ghost" onClick={() => del.mutate()} className="mr-auto text-destructive">Remove</Button>
            )}
            <Button type="submit" disabled={save.isPending}>{existing ? "Save" : "Log actual"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OtherIncomeDialog({ householdId, userId, existing, trigger }: { householdId?: string; userId?: string; existing?: OtherIncomeRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const payload = {
        amount: Number(fd.get("amount")),
        received_on: String(fd.get("date")),
        source_label: String(fd.get("source")),
        note: String(fd.get("note") || "") || null,
      };
      if (existing) {
        const { error } = await supabase.from("other_income").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("other_income").insert({
          household_id: householdId!,
          user_id: userId!,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["other_income"] });
      setOpen(false);
      toast.success(existing ? "Updated" : "Logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Log other income</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit other income" : "Log other income"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Bonus, freelance, gift..." defaultValue={existing?.source_label ?? ""} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="amount">Amount (₱)</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={existing?.amount ?? ""} required /></div>
            <div className="space-y-1.5"><Label htmlFor="date">Received on</Label><Input id="date" name="date" type="date" defaultValue={existing?.received_on ?? format(new Date(), "yyyy-MM-dd")} required /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="note">Note (optional)</Label><Input id="note" name="note" defaultValue={existing?.note ?? ""} /></div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}