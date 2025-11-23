import { useEffect, useState } from 'react';
import { settingsApi } from '../lib/api';
import type { User } from '../types';

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const userData = await settingsApi.getUser();
      setUser(userData);
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
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your financial configuration and preferences</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-400 mb-1">Error</p>
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Settings */}
      <section className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          General Settings
        </h2>

        <div>
          <label htmlFor="payday" className="block text-sm font-semibold text-slate-300 mb-2">
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
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={saving}
          />
          <p className="mt-2 text-sm text-slate-400">
            Used to calculate shopping cycles and days until payday
          </p>
        </div>
      </section>

      {/* Penalty System */}
      <section className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-6">
        <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Penalty System
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold text-white mb-1">Enable Penalty Enforcement</p>
            <p className="text-sm text-slate-300">
              Automatically add R500 penalties for takeaways and excess snacks
            </p>
          </div>
          <button
            onClick={() => handleUserUpdate({ penaltySystemEnabled: !user.penaltySystemEnabled })}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
              user.penaltySystemEnabled ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={user.penaltySystemEnabled}
            aria-label="Toggle penalty system"
            disabled={saving}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                user.penaltySystemEnabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!user.penaltySystemEnabled && (
          <div className="mt-4 rounded-lg border border-orange-500/50 bg-orange-500/20 p-3 text-sm font-medium text-orange-300">
            ⚠️ Penalty system is currently disabled. Violations will not be tracked.
          </div>
        )}
      </section>

      {/* Wastage Tracking Guide */}
      <section className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">💸</span>
          Wastage Tracking
        </h2>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/20 p-4">
            <p className="font-semibold text-amber-300 mb-2">What is considered wastage?</p>
            <ul className="space-y-1.5 text-sm text-amber-200">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>Items you shouldn't be buying:</strong> Takeaways, snacks, sugar, or anything wasteful</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>Delivery fees and tips:</strong> Extra costs on food orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>App usage fees:</strong> Uber Eats, Mr D, etc.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>Service charges:</strong> Unnecessary fees</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><strong>Unneeded debit orders:</strong> Subscriptions you don't use</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="font-semibold text-slate-200 mb-3">How to track wastage:</p>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/50">1</span>
                <span>When adding an expense, mark items you shouldn't have bought as wastage</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/50">2</span>
                <span>Click "Add Wastage" to include delivery fees, tips, or app fees separately</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/50">3</span>
                <span>View wastage totals on your dashboard to track how much money you're wasting</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
