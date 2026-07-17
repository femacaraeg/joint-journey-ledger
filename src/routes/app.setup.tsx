import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/app/setup")({
  component: Setup,
});

function Setup() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.household_id) navigate({ to: "/app", replace: true });
  }, [profile, navigate]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.rpc("create_household", { _name: String(fd.get("name") || "") });
    setLoading(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries();
    navigate({ to: "/app", replace: true });
  }

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.rpc("join_household", { _code: String(fd.get("code") || "") });
    setLoading(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries();
    navigate({ to: "/app", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl">Set up your shared space</h1>
          <p className="text-sm text-muted-foreground">Create a household, or join your partner's.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={create} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg">Create a household</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Fe & partner" />
          </div>
          <Button className="w-full" disabled={loading}>Create household</Button>
          <p className="text-xs text-muted-foreground">
            We'll seed the usual categories (cash, credit, groceries, bills, investments). Edit anytime.
          </p>
        </form>

        <form onSubmit={join} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg">Join your partner</h2>
          <div className="space-y-1.5">
            <Label htmlFor="code">Invite code</Label>
            <Input id="code" name="code" placeholder="8-character code" className="uppercase tracking-widest" required />
          </div>
          <Button className="w-full" variant="outline" disabled={loading}>Join household</Button>
          <p className="text-xs text-muted-foreground">
            Ask your partner for their household's invite code (Settings page).
          </p>
        </form>
      </div>
    </div>
  );
}