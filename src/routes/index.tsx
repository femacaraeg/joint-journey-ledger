import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, PiggyBank, CreditCard, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" />
          </div>
          <span className="font-display text-lg">twohearts</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-24 md:pb-28">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            for couples who share money
          </p>
          <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">
            A calm, shared home for the finances you manage <span className="italic text-primary">together</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Set budgets, log credit card statements, and see where you stand — built for weekly
            check-ins between two people, not daily anxiety.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full">
                Start together <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={PiggyBank} title="Shared and individual budgets" body="Cash and credit allowances per partner, plus shared groceries, bills, and investments." />
          <FeatureCard icon={CreditCard} title="Statements, tracked" body="Log each SOA against its card and due date. See what's unpaid before it stings." />
          <FeatureCard icon={Wallet} title="Payday-aware income" body="Salaries, semi-monthly paydays, and one-off bonuses. See income vs. plan for the cycle." />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-muted-foreground">
        Made for two.
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
