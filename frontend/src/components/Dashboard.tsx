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
      <div className="flex items-center justify-center py-20" role="status">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 backdrop-blur-sm" role="alert">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-red-400">Error loading dashboard</p>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Available Balance - Hero Section */}
      <section
        className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/5 p-8 border border-emerald-500/20 shadow-lg"
        aria-labelledby="available-heading"
      >
        <h2 id="available-heading" className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Available Balance
        </h2>
        <p className="mt-3 text-5xl font-bold tracking-tight text-white">
          {formatCurrency(dashboard.availableBalance)}
        </p>
        <div className="mt-4 flex items-center gap-2 text-emerald-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">
            {dashboard.daysUntilPayday} days until payday
          </span>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-400">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(dashboard.totalIncome)}
          </p>
        </div>

        {/* Total Spent */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-400">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(dashboard.totalSpent)}
          </p>
        </div>

        {/* Debit Orders */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-400">Debit Orders</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(dashboard.fixedExpenses)}
          </p>
        </div>

        {/* Total Wastage - NEW */}
        <div className="rounded-xl bg-slate-800/50 border border-amber-500/50 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="text-xl">💸</span>
            </div>
            <span className="text-sm font-medium text-slate-400">Total Wastage</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(dashboard.totalWastage)}
          </p>
          <p className="text-xs text-amber-500/70 mt-1">
            Delivery fees, tips, app fees
          </p>
        </div>
      </div>

      {/* Monthly Summary */}
      <section className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Financial Summary
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Income</span>
            <span className="font-semibold text-emerald-400">+{formatCurrency(dashboard.totalIncome)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-slate-700">
            <span className="text-slate-400">Expenses</span>
            <span className="font-semibold text-red-400">-{formatCurrency(dashboard.totalSpent)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-slate-700">
            <span className="text-slate-400">Debit Orders</span>
            <span className="font-semibold text-blue-400">-{formatCurrency(dashboard.fixedExpenses)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-slate-700">
            <span className="text-slate-400">Wastage (fees & tips)</span>
            <span className="font-semibold text-amber-400">-{formatCurrency(dashboard.totalWastage)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-slate-600">
            <span className="font-semibold text-white">Available Balance</span>
            <span className={`text-xl font-bold ${
              dashboard.availableBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {formatCurrency(dashboard.availableBalance)}
            </span>
          </div>
        </div>
      </section>

      {/* Positive Message */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-400">Stay on Track!</p>
            <p className="text-sm text-slate-300 mt-1">
              {dashboard.availableBalance >= 0
                ? "You're doing great! Keep monitoring your spending to maintain financial discipline."
                : "Budget exceeded. Review your expenses and adjust spending to get back on track."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
