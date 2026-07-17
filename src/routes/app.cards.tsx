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
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formatMoney, currentCycleMonth, daysUntil } from "@/lib/finance";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/cards")({
  component: Cards,
});

type Category = { id: string; name: string };

function Cards() {
  const { data: profile } = useProfile();
  const session = useSession();
  const { data: members } = useHouseholdMembers();
  const hid = profile?.household_id;
  const qc = useQueryClient();

  const cards = useQuery({
    enabled: !!hid,
    queryKey: ["credit_cards", hid],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").order("created_at");
      return data ?? [];
    },
  });

  const cats = useQuery({
    enabled: !!hid,
    queryKey: ["categories-min", hid],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  const soas = useQuery({
    enabled: !!hid,
    queryKey: ["soas", hid],
    queryFn: async () => {
      const { data } = await supabase.from("soa_entries").select("*").order("due_date", { ascending: false });
      return data ?? [];
    },
  });

  const delCard = useMutation({
    mutationFn: async (id: string) => { await supabase.from("credit_cards").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit_cards"] }),
  });
  const markPaid = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "unpaid" }) => {
      await supabase.from("soa_entries").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soas"] }),
  });
  const delSoa = useMutation({
    mutationFn: async (id: string) => { await supabase.from("soa_entries").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soas"] }),
  });

  const nameFor = (uid: string) => members?.find((m) => m.id === uid)?.display_name ?? "—";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Credit cards</p>
            <h1 className="mt-1 font-display text-3xl">Cards & statements</h1>
          </div>
          <CardDialog householdId={hid ?? undefined} userId={session?.user.id} categories={cats.data ?? []} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(cards.data ?? []).map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{nameFor(c.user_id)}</div>
                </div>
                <div className="flex gap-1">
                  <SoaDialog householdId={hid ?? undefined} card={c} trigger={<Button size="sm" variant="outline">+ SOA</Button>} />
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete card "${c.name}"?`)) delCard.mutate(c.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><div className="uppercase tracking-wider">Cutoff</div><div className="mt-0.5 font-display text-lg text-foreground">{c.cutoff_day}</div></div>
                <div><div className="uppercase tracking-wider">Due</div><div className="mt-0.5 font-display text-lg text-foreground">{c.due_day}</div></div>
              </div>
            </div>
          ))}
          {(cards.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No cards yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Statements</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Card</th>
                <th className="px-4 py-3 text-left font-medium">Cycle</th>
                <th className="px-4 py-3 text-left font-medium">Due</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(soas.data ?? []).map((s) => {
                const cardName = (cards.data ?? []).find((c) => c.id === s.credit_card_id)?.name ?? "—";
                const d = daysUntil(s.due_date);
                const urgent = s.status === "unpaid" && d <= 3;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{cardName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(s.cycle_month), "MMM yyyy")}</td>
                    <td className={cn("px-4 py-3", urgent && "text-destructive")}>
                      {format(new Date(s.due_date), "MMM d")}
                      {s.status === "unpaid" && <span className="ml-1 text-xs text-muted-foreground">({d}d)</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(s.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        s.status === "paid" ? "bg-secondary text-secondary-foreground" : "bg-[color:var(--warning)]/20 text-[color:var(--warning)]"
                      )}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost"
                          onClick={() => markPaid.mutate({ id: s.id, status: s.status === "paid" ? "unpaid" : "paid" })}>
                          <CheckCircle2 className={cn("h-4 w-4", s.status === "paid" && "text-primary")} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => delSoa.mutate(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(soas.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No statements logged.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CardDialog({ householdId, userId, categories }: { householdId?: string; userId?: string; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("credit_cards").insert({
        household_id: householdId!,
        user_id: userId!,
        name: String(fd.get("name")),
        cutoff_day: Number(fd.get("cutoff")),
        due_day: Number(fd.get("due")),
        linked_category_id: String(fd.get("category") || "") || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_cards"] });
      setOpen(false);
      toast.success("Card added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Card</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add credit card</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="name">Card name</Label><Input id="name" name="name" placeholder="BPI Signature" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="cutoff">Cutoff day</Label><Input id="cutoff" name="cutoff" type="number" min="1" max="31" required /></div>
            <div className="space-y-1.5"><Label htmlFor="due">Due day</Label><Input id="due" name="due" type="number" min="1" max="31" required /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Linked category (optional)</Label>
            <Select name="category" defaultValue="">
              <SelectTrigger><SelectValue placeholder="Choose a credit category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>Add card</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SoaDialog({ householdId, card, trigger }: { householdId?: string; card: { id: string; due_day: number }; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("soa_entries").insert({
        household_id: householdId!,
        credit_card_id: card.id,
        cycle_month: currentCycleMonth(),
        amount: Number(fd.get("amount")),
        due_date: String(fd.get("due_date")),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soas"] });
      setOpen(false);
      toast.success("Statement logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const defaultDue = (() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), Math.min(card.due_day, 28));
    return format(d, "yyyy-MM-dd");
  })();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log statement</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <div className="space-y-1.5"><Label htmlFor="amount">Statement amount (₱)</Label><Input id="amount" name="amount" type="number" min="0" required /></div>
          <div className="space-y-1.5"><Label htmlFor="due_date">Due date</Label><Input id="due_date" name="due_date" type="date" defaultValue={defaultDue} required /></div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}