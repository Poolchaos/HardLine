import { useEffect, useState } from 'react';
import { budgetApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { BudgetDashboard } from '../types';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<BudgetDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await budgetApi.getDashboard();
      setDashboard(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4" role="alert">
        <p className="font-medium text-destructive">Error loading dashboard</p>
        <p className="text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  if (!dashboard) return null;

  const hasActivePenalties = dashboard.currentPenalties.total > 0;
  const savingsAmount = dashboard.availableBalance;

  return (
    <div className="space-y-6">
      {/* Available Balance - Hero Section */}
      <section
        className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-primary/20"
        aria-labelledby="available-heading"
      >
        <h2 id="available-heading" className="text-sm font-medium text-muted-foreground">
          Available Balance
        </h2>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {formatCurrency(dashboard.availableBalance)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.daysUntilPayday} days until payday
        </p>
      </section>

      {/* Penalty Alert */}
      {hasActivePenalties && (
        <div
          className="rounded-lg border-2 border-destructive bg-destructive/10 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-destructive">Active Penalties</h3>
              <p className="mt-1 text-sm text-destructive/90">
                You have {formatCurrency(dashboard.currentPenalties.total)} in penalties this month
              </p>
              {dashboard.currentPenalties.takeaways > 0 && (
                <p className="mt-1 text-sm">
                  Takeaways: {formatCurrency(dashboard.currentPenalties.takeaways)}
                </p>
              )}
              {dashboard.currentPenalties.snacks > 0 && (
                <p className="mt-1 text-sm">
                  Excess Snacks: {formatCurrency(dashboard.currentPenalties.snacks)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Income vs Expenses Summary */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="summary-heading"
      >
        <h2 id="summary-heading" className="text-lg font-semibold mb-4">
          This Month
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Total Income */}
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Total Income</p>
            <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(dashboard.totalIncome)}
            </p>
          </div>

          {/* Total Spent */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Total Spent</p>
            <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-100">
              {formatCurrency(dashboard.totalSpent)}
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fixed Expenses</span>
            <span className="font-medium">{formatCurrency(dashboard.fixedExpenses)}</span>
          </div>
          {hasActivePenalties && (
            <div className="flex justify-between text-destructive">
              <span>Penalties</span>
              <span className="font-medium">{formatCurrency(dashboard.penalties)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t font-medium">
            <span>Left to Save/Spend</span>
            <span className={savingsAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {formatCurrency(savingsAmount)}
            </span>
          </div>
        </div>
      </section>

      {/* No Penalties Encouragement */}
      {!hasActivePenalties && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">✅</span>
            <div>
              <p className="font-medium text-primary">Great job!</p>
              <p className="text-sm text-muted-foreground">
                No penalties this month. Keep up the discipline!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
