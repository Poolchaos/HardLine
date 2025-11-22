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

      {/* Income & Savings */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="income-heading"
      >
        <h2 id="income-heading" className="mb-4 text-lg font-semibold">
          Income & Savings
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="income" className="block text-sm font-medium mb-2">
              Monthly Income (R)
            </label>
            <input
              id="income"
              type="number"
              step="0.01"
              value={user.income}
              onChange={(e) => setUser({ ...user, income: parseFloat(e.target.value) })}
              onBlur={() => handleUserUpdate({ income: user.income })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="savingsGoal" className="block text-sm font-medium mb-2">
              Base Savings Goal (R)
            </label>
            <input
              id="savingsGoal"
              type="number"
              step="0.01"
              value={user.savingsBaseGoal}
              onChange={(e) => setUser({ ...user, savingsBaseGoal: parseFloat(e.target.value) })}
              onBlur={() => handleUserUpdate({ savingsBaseGoal: user.savingsBaseGoal })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="payday" className="block text-sm font-medium mb-2">
              Payday (Day of Month: 1-31)
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
              Determines your bi-weekly shopping cycles
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

      {/* Household Subsidy */}
      <section
        className="rounded-lg border border-border bg-secondary p-6"
        aria-labelledby="subsidy-heading"
      >
        <h2 id="subsidy-heading" className="mb-4 text-lg font-semibold">
          Household Subsidy
        </h2>

        <div>
          <label htmlFor="subsidyCap" className="block text-sm font-medium mb-2">
            Sister + BF Subsidy Cap (R)
          </label>
          <input
            id="subsidyCap"
            type="number"
            step="0.01"
            value={user.sisterSubsidyCap}
            onChange={(e) => setUser({ ...user, sisterSubsidyCap: parseFloat(e.target.value) })}
            onBlur={() => handleUserUpdate({ sisterSubsidyCap: user.sisterSubsidyCap })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={saving}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum monthly subsidy you're willing to provide
          </p>
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
