import { createFileRoute } from "@tanstack/react-router";
import { useProfile, useHousehold, useHouseholdMembers } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const { data: household } = useHousehold();
  const { data: members } = useHouseholdMembers();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: String(fd.get("display_name")) })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
    },
  });

  const saveHousehold = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase
        .from("households")
        .update({ name: String(fd.get("name")) })
        .eq("id", household!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household"] });
      toast.success("Saved");
    },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl">Settings</h1>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg">Household</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveHousehold.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Household name</Label>
            <Input id="name" name="name" defaultValue={household?.name ?? ""} />
          </div>
          <Button type="submit" disabled={saveHousehold.isPending}>
            Save
          </Button>
        </form>

        <div className="mt-6 rounded-xl bg-secondary/60 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Invite code</div>
          <div className="mt-1 flex items-center gap-3">
            <code className="font-display text-2xl tracking-widest">
              {household?.invite_code ?? "—"}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!household?.invite_code) return;
                navigator.clipboard.writeText(household.invite_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this with your partner. They enter it at set up to join.
          </p>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Members</div>
          <ul className="mt-2 space-y-1 text-sm">
            {(members ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md bg-background px-3 py-2"
              >
                <span>{m.display_name || m.email}</span>
                {m.id === profile?.id && <span className="text-xs text-muted-foreground">you</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg">You</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} disabled />
          </div>
          <Button type="submit" disabled={saveProfile.isPending}>
            Save
          </Button>
        </form>
      </section>
    </div>
  );
}
