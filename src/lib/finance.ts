import { format, startOfMonth, addMonths, differenceInCalendarDays } from "date-fns";

export const CURRENCY = "PHP";

export function formatMoney(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function currentCycleMonth(d: Date = new Date()) {
  return format(startOfMonth(d), "yyyy-MM-dd");
}

export function cycleLabel(iso: string) {
  return format(new Date(iso + "T00:00:00"), "MMMM yyyy");
}

export function prevCycleMonth(iso: string) {
  return format(addMonths(new Date(iso + "T00:00:00"), -1), "yyyy-MM-dd");
}

export function daysUntil(dateISO: string) {
  return differenceInCalendarDays(new Date(dateISO), new Date());
}

export type BudgetStatus = "on_track" | "near" | "over";

export function budgetStatus(spend: number, budget: number): BudgetStatus {
  if (budget <= 0) return "on_track";
  const pct = spend / budget;
  if (pct >= 1) return "over";
  if (pct >= 0.8) return "near";
  return "on_track";
}

export function statusTone(s: BudgetStatus) {
  return s === "over"
    ? "text-destructive"
    : s === "near"
      ? "text-[color:var(--warning)]"
      : "text-[color:var(--success)]";
}

export function paydaysForCycle(cycleMonthISO: string, paydayDays: number[]): string[] {
  const base = new Date(cycleMonthISO + "T00:00:00");
  const y = base.getFullYear();
  const m = base.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const seen = new Set<number>();
  const days = paydayDays
    .filter((d) => Number.isFinite(d) && d >= 1 && d <= 31)
    .map((d) => Math.min(d, lastDay))
    .filter((d) => (seen.has(d) ? false : (seen.add(d), true)))
    .sort((a, b) => a - b);
  return days.map((d) => format(new Date(y, m, d), "yyyy-MM-dd"));
}

export function isPast(dateISO: string) {
  return differenceInCalendarDays(new Date(dateISO + "T00:00:00"), new Date()) < 0;
}