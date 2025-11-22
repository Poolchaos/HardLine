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
  const savingsProgress = dashboard.savingsGoal.total > 0
    ? (dashboard.savingsGoal.penalties / dashboard.savingsGoal.total) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Available to Spend - Hero Section */}
      <section
        className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-primary/20"
        aria-labelledby="available-heading"
      >
        <h2 id="available-heading" className="text-sm font-medium text-muted-foreground">
          Available to Spend
        </h2>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {formatCurrency(dashboard.availableToSpend)}
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

      {/* Savings Goal Progress */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="savings-heading"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="savings-heading" className="text-lg font-semibold">
            Savings Goal
          </h2>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(dashboard.savingsGoal.total)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            className="h-8 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Savings goal progress"
          >
            {/* Base Goal */}
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${100 - savingsProgress}%`,
                float: 'left'
              }}
              aria-label={`Base savings: ${formatCurrency(dashboard.savingsGoal.base)}`}
            />
            {/* Penalty Extension */}
            {hasActivePenalties && (
              <div
                className="h-full bg-destructive transition-all"
                style={{
                  width: `${savingsProgress}%`,
                  float: 'left',
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px)'
                }}
                aria-label={`Penalties: ${formatCurrency(dashboard.savingsGoal.penalties)}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
              <span>Base: {formatCurrency(dashboard.savingsGoal.base)}</span>
            </div>
            {hasActivePenalties && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" aria-hidden="true" />
                <span>Penalties: {formatCurrency(dashboard.savingsGoal.penalties)}</span>
              </div>
            )}
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
