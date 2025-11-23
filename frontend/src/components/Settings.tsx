import { useEffect, useState } from 'react';
import { settingsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { User, FixedExpense } from '../types';

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const [userData, expensesData] = await Promise.all([
        settingsApi.getUser(),
        settingsApi.getFixedExpenses(),
      ]);
      setUser(userData);
      setFixedExpenses(expensesData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUserUpdate(updates: Partial<User>) {
    if (!user) return;

    try {
      setSaving(true);
      const updated = await settingsApi.updateUser(updates);
      setUser(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4" role="alert">
        <p className="font-medium text-destructive">Error loading settings</p>
        <p className="text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  if (!user) return null;

  const totalFixed = fixedExpenses
    .filter(exp => exp.isActive)
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your financial configuration</p>
      </div>

      {/* General Settings */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="general-heading"
      >
        <h2 id="general-heading" className="mb-4 text-lg font-semibold">
          General Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="payday" className="block text-sm font-medium mb-2">
              Payday (Day of Month)
            </label>
            <input
              id="payday"
              type="number"
              min="1"
              max="31"
              value={user.payday}
              onChange={(e) => setUser({ ...user, payday: parseInt(e.target.value) })}
              onBlur={() => handleUserUpdate({ payday: user.payday })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Used to calculate shopping cycles and days until payday
            </p>
          </div>
        </div>
      </section>

      {/* Penalty System */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="penalty-heading"
      >
        <h2 id="penalty-heading" className="mb-4 text-lg font-semibold">
          Penalty System
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Penalty Enforcement</p>
            <p className="text-sm text-muted-foreground">
              Automatically add R500 penalties for takeaways and excess snacks
            </p>
          </div>
          <button
            onClick={() => handleUserUpdate({ penaltySystemEnabled: !user.penaltySystemEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              user.penaltySystemEnabled ? 'bg-primary' : 'bg-muted'
            }`}
            role="switch"
            aria-checked={user.penaltySystemEnabled}
            aria-label="Toggle penalty system"
            disabled={saving}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                user.penaltySystemEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!user.penaltySystemEnabled && (
          <div className="mt-4 rounded-md bg-primary/10 p-3 text-sm text-primary" role="status">
            ⚠️ Penalty system is currently disabled. Violations will not be tracked.
          </div>
        )}
      </section>

      {/* Wastage Tracking */}
      <section
        className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-6"
        aria-labelledby="wastage-heading"
      >
        <h2 id="wastage-heading" className="mb-4 text-lg font-semibold flex items-center gap-2">
          <span>💸</span>
          Wastage Tracking
        </h2>

        <div className="space-y-4">
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-4">
            <p className="font-medium text-amber-900 dark:text-amber-200">What is considered wastage?</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-300">
              <li>• Takeaway orders (the transaction itself)</li>
              <li>• Snacks (the transaction itself)</li>
              <li>• Delivery fees and tips</li>
              <li>• App usage fees (Uber Eats, Mr D, etc.)</li>
              <li>• Service charges</li>
              <li>• Unneeded debit orders</li>
            </ul>
          </div>

          <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-4 border border-slate-300 dark:border-slate-700">
            <p className="font-medium text-slate-900 dark:text-slate-200 mb-2">How to track wastage:</p>
            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>When adding a Takeaway or Snack expense, click "Add Wastage" to include delivery fees, tips, or app fees</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>The wastage amount is tracked separately and included in your total wastage report on the dashboard</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Remember: The entire Takeaway/Snack transaction counts as wastage, plus any additional fees</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Fixed Expenses */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="fixed-heading"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="fixed-heading" className="text-lg font-semibold">
            Fixed Expenses
          </h2>
          <span className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalFixed)}
          </span>
        </div>

        {fixedExpenses.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No fixed expenses configured
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {fixedExpenses.map((expense) => (
              <li key={expense._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{expense.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  expense.isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {expense.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
