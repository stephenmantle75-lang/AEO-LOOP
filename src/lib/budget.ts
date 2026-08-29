export function parseMonthlyProviderBudgetUsd(value = process.env.AEO_MONTHLY_PROVIDER_BUDGET_USD): number | undefined {
  if (!value?.trim()) return undefined;
  const budget = Number(value);
  return Number.isFinite(budget) && budget >= 0 ? budget : undefined;
}

export function utcMonthWindow(date: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function isMonthlyBudgetExhausted(spendUsd: number, budgetUsd: number): boolean {
  return spendUsd >= budgetUsd;
}
