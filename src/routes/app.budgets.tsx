import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { formatMoney, currentCycleMonth, cycleLabel, budgetStatus, statusTone } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/budgets")({
  component: Budgets,
});

type Category = {
  id: string;
  name: string;
  owner: "partner_a" | "partner_b" | "shared";
  base_budget_amount: number;
  rollover_setting: "rollover" | "restart";
  sort_order: number;
};

function Budgets() {
  const { data: profile } = useProfile();
  const hid = profile?.household_id;
  const qc = useQueryClient();
  const cycle = currentCycleMonth();

  const catsQ = useQuery({
    enabled: !!hid,
    queryKey: ["categories", hid],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const cyclesQ = useQuery({
    enabled: !!hid,
    queryKey: ["category_cycles", hid, cycle],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_cycles").select("*").eq("cycle_month", cycle);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setSpend = useMutation({
    mutationFn: async ({ category_id, amount }: { category_id: string; amount: number }) => {
      const { error } = await supabase.from("category_cycles").upsert(
        { household_id: hid!, category_id, cycle_month: cycle, actual_spend: amount },
        { onConflict: "category_id,cycle_month" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category_cycles"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Budgets · {cycleLabel(cycle)}</p>
          <h1 className="mt-1 font-display text-3xl">Categories</h1>
        </div>
        <CategoryDialog householdId={hid} />
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Owner</th>
              <th className="px-4 py-3 text-right font-medium">Budget</th>
              <th className="px-4 py-3 text-right font-medium">Spent (this cycle)</th>
              <th className="px-4 py-3 text-left font-medium">Rollover</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(catsQ.data ?? []).map((c) => {
              const cyc = (cyclesQ.data ?? []).find((x) => x.category_id === c.id);
              const spend = Number(cyc?.actual_spend ?? 0);
              const st = budgetStatus(spend, Number(c.base_budget_amount));
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.owner.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(c.base_budget_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      defaultValue={spend}
                      className="w-28 rounded-md border border-input bg-background px-2 py-1 text-right"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== spend) setSpend.mutate({ category_id: c.id, amount: v });
                      }}
                    />
                    <div className={cn("mt-0.5 text-[10px] uppercase tracking-wider", statusTone(st))}>{st.replace("_", " ")}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.rollover_setting}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <CategoryDialog householdId={hid} existing={c} trigger={
                        <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
                      } />
                      <Button size="icon" variant="ghost" onClick={() => {
                        if (confirm(`Delete "${c.name}"?`)) del.mutate(c.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(catsQ.data ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No categories.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Rollover: unused (or over) amount carries into next cycle. Restart: budget resets each month.
      </p>
    </div>
  );
}

function CategoryDialog({ householdId, existing, trigger }: { householdId?: string; existing?: Category; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const payload = {
        household_id: householdId!,
        name: String(fd.get("name")),
        owner: String(fd.get("owner")) as Category["owner"],
        base_budget_amount: Number(fd.get("budget") || 0),
        rollover_setting: String(fd.get("rollover")) as Category["rollover_setting"],
      };
      if (existing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({ ...payload, sort_order: 100 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(existing ? "Updated" : "Category added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button><Plus className="mr-1 h-4 w-4" /> Category</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={existing?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select name="owner" defaultValue={existing?.owner ?? "shared"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner_a">Partner A</SelectItem>
                  <SelectItem value="partner_b">Partner B</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rollover</Label>
              <Select name="rollover" defaultValue={existing?.rollover_setting ?? "restart"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restart">Restart each cycle</SelectItem>
                  <SelectItem value="rollover">Roll over unused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">Monthly budget (₱)</Label>
            <Input id="budget" name="budget" type="number" min="0" step="1" defaultValue={existing?.base_budget_amount ?? 0} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>{existing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}