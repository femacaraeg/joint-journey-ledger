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