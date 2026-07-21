import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function signInEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/app", replace: true });
  }

  async function signUpEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin + "/app",
        data: { display_name: String(fd.get("name") || "") },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're in.");
    navigate({ to: "/app", replace: true });
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) toast.error(res.error.message ?? "Google sign-in failed");
    if (!res.redirected && !res.error) navigate({ to: "/app", replace: true });
  }

  async function sendReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(fd.get("email")),
      { redirectTo: window.location.origin + "/reset-password" },
    );
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link.");
    setMode("auth");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 pb-8">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" />
          </div>
          <span className="font-display text-xl">twohearts</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {mode === "forgot" ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg">Reset your password</h2>
                <p className="text-sm text-muted-foreground">
                  We'll email you a link to set a new password.
                </p>
              </div>
              <form onSubmit={sendReset} className="space-y-4">
                <Field name="email" label="Email" type="email" required />
                <Button className="w-full" disabled={loading}>Send reset link</Button>
              </form>
              <button
                type="button"
                onClick={() => setMode("auth")}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Back to sign in
              </button>
            </div>
          ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={signInEmail} className="space-y-4">
                <Field name="email" label="Email" type="email" required />
                <Field name="password" label="Password" type="password" required />
                <Button className="w-full" disabled={loading}>Sign in</Button>
              </form>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Forgot password?
              </button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={signUpEmail} className="space-y-4">
                <Field name="name" label="Your name" placeholder="e.g. Fe" />
                <Field name="email" label="Email" type="email" required />
                <Field name="password" label="Password" type="password" required minLength={6} />
                <Button className="w-full" disabled={loading}>Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, name, ...rest } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}