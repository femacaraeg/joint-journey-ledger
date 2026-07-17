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
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/finance";
import { format } from "date-fns";
import { toast } from "sonner";

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
      return data ?? [];
    },
  });

  const other = useQuery({
    enabled: !!hid,
    queryKey: ["other_income", hid],
    queryFn: async () => {
      const { data } = await supabase.from("other_income").select("*").order("received_on", { ascending: false });
      return data ?? [];
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
            <p className="text-sm text-muted-foreground">Regular income</p>
            <h1 className="mt-1 font-display text-3xl">Paydays</h1>
          </div>
          <IncomeSourceDialog householdId={hid} userId={session?.user.id} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(sources.data ?? []).map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{nameFor(s.user_id)}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => delSource.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 font-display text-2xl">{formatMoney(s.amount)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {s.pay_frequency.replace("_", "-")} · paid on {s.payday_days.join(", ")}
              </div>
            </div>
          ))}
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
          <OtherIncomeDialog householdId={hid} userId={session?.user.id} />
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
                    <Button size="icon" variant="ghost" onClick={() => delOther.mutate(o.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

function IncomeSourceDialog({ householdId, userId }: { householdId?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const days = String(fd.get("days") || "")
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
      const { error } = await supabase.from("income_sources").insert({
        household_id: householdId!,
        user_id: userId!,
        label: String(fd.get("label")),
        amount: Number(fd.get("amount")),
        pay_frequency: String(fd.get("frequency")) as "monthly" | "semi_monthly" | "biweekly" | "weekly",
        payday_days: days.length ? days : [15, 30],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income_sources"] });
      setOpen(false);
      toast.success("Income added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add income</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add income source</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="label">Label</Label><Input id="label" name="label" defaultValue="Salary" /></div>
          <div className="space-y-1.5"><Label htmlFor="amount">Amount per payday (₱)</Label><Input id="amount" name="amount" type="number" min="0" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue="semi_monthly">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="days">Payday(s)</Label><Input id="days" name="days" placeholder="15, 30" defaultValue="15, 30" /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OtherIncomeDialog({ householdId, userId }: { householdId?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("other_income").insert({
        household_id: householdId!,
        user_id: userId!,
        amount: Number(fd.get("amount")),
        received_on: String(fd.get("date")),
        source_label: String(fd.get("source")),
        note: String(fd.get("note") || "") || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["other_income"] });
      setOpen(false);
      toast.success("Logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Log other income</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log other income</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Bonus, freelance, gift..." required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="amount">Amount (₱)</Label><Input id="amount" name="amount" type="number" min="0" required /></div>
            <div className="space-y-1.5"><Label htmlFor="date">Received on</Label><Input id="date" name="date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="note">Note (optional)</Label><Input id="note" name="note" /></div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}