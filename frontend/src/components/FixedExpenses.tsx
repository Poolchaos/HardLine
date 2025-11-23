import { useEffect, useState } from 'react';
import { settingsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import CurrencyInput from './CurrencyInput';
import type { FixedExpense } from '../types';

export default function FixedExpenses() {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add/Edit form state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDebitDay, setExpenseDebitDay] = useState('25');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    expense: FixedExpense | null;
  }>({ isOpen: false, expense: null });

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      setLoading(true);
      const data = await settingsApi.getFixedExpenses();
      setFixedExpenses(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDebitDay('25');
    setEditingExpense(null);
    setShowAddExpense(true);
    setError(null);
  }

  function openEditModal(expense: FixedExpense) {
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount.toString());
    setExpenseDebitDay(expense.debitDay?.toString() || '25');
    setEditingExpense(expense);
    setShowAddExpense(true);
    setError(null);
  }

  function closeModal() {
    setShowAddExpense(false);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDebitDay('25');
    setEditingExpense(null);
    setError(null);
  }

  async function handleSaveExpense() {
    const debitDay = parseInt(expenseDebitDay);

    if (!expenseName.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0 || debitDay < 1 || debitDay > 31) {
      setError('Please enter valid name, amount, and debit day (1-31)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingExpense) {
        // Update existing expense
        const updated = await settingsApi.updateFixedExpense(editingExpense._id, {
          name: expenseName.trim(),
          amount: parseFloat(expenseAmount),
          debitDay,
        });
        setFixedExpenses(fixedExpenses.map(exp =>
          exp._id === updated._id ? updated : exp
        ));
      } else {
        // Create new expense
        const newExpense = await settingsApi.createFixedExpense({
          name: expenseName.trim(),
          amount: parseFloat(expenseAmount),
          debitDay,
        });
        setFixedExpenses([...fixedExpenses, newExpense]);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleExpense(id: string, isActive: boolean) {
    try {
      await settingsApi.toggleFixedExpense(id, isActive);
      setFixedExpenses(fixedExpenses.map(exp =>
        exp._id === id ? { ...exp, isActive } : exp
      ));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteExpense() {
    if (!deleteConfirm.expense) return;

    try {
      await settingsApi.deleteFixedExpense(deleteConfirm.expense._id);
      setFixedExpenses(fixedExpenses.filter(exp => exp._id !== deleteConfirm.expense!._id));
      setDeleteConfirm({ isOpen: false, expense: null });
    } catch (err: any) {
      setError(err.message);
    }
  }

  const totalActive = fixedExpenses
    .filter(exp => exp.isActive)
    .reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading fixed expenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Fixed Expenses (Debit Orders)</h1>
          <p className="text-slate-400">Manage your monthly recurring expenses like rent, insurance, and subscriptions</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="mb-6 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300 mb-1">Total Active Monthly Expenses</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalActive)}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-3 text-sm text-emerald-300">
          {fixedExpenses.filter(e => e.isActive).length} active • {fixedExpenses.filter(e => !e.isActive).length} inactive
        </p>
      </div>

      {/* Expenses List */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Your Fixed Expenses</h2>
        </div>

        {fixedExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium mb-2">No fixed expenses yet</p>
            <p className="text-sm text-slate-500">Click "Add Expense" to track your monthly debit orders</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {fixedExpenses.map((expense) => (
              <div
                key={expense._id}
                className="p-6 hover:bg-slate-700/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Toggle Checkbox */}
                    <button
                      onClick={() => handleToggleExpense(expense._id, !expense.isActive)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        expense.isActive
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-600 hover:border-emerald-500'
                      }`}
                      aria-label={expense.isActive ? 'Mark as inactive' : 'Mark as active'}
                    >
                      {expense.isActive && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Expense Details */}
                    <div className="flex-1">
                      <p className={`font-semibold text-lg ${expense.isActive ? 'text-white' : 'text-slate-500 line-through'}`}>
                        {expense.name}
                      </p>
                      <p className={`text-sm mt-0.5 ${expense.isActive ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {formatCurrency(expense.amount)}/month{expense.debitDay ? ` • Debits on day ${expense.debitDay}` : ''}
                      </p>
                      {expense.lastDebited && (
                        <p className="text-xs mt-1 text-slate-500">
                          Last debited: {new Date(expense.lastDebited).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      expense.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}>
                      {expense.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(expense)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      aria-label="Edit expense"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, expense })}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      aria-label="Delete expense"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        title={editingExpense ? 'Edit Fixed Expense' : 'Add Fixed Expense'}
        size="sm"
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Expense Name
            </label>
            <input
              type="text"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="e.g., Rent, Netflix, Gym Membership"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={saving}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Monthly Amount
            </label>
            <CurrencyInput
              value={expenseAmount}
              onChange={setExpenseAmount}
              placeholder="0.00"
              disabled={saving}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Debit Day (Day of Month)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={expenseDebitDay}
              onChange={(e) => setExpenseDebitDay(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-slate-500">Day of the month when this expense is automatically debited (1-31)</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={closeModal}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-700 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveExpense}
              disabled={saving || !expenseName.trim() || !expenseAmount || !expenseDebitDay}
              className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (editingExpense ? 'Updating...' : 'Adding...') : (editingExpense ? 'Update Expense' : 'Add Expense')}
            </button>
          </div>
        </div>
      </Modal>      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, expense: null })}
        title="Delete Fixed Expense"
        message={`Are you sure you want to delete "${deleteConfirm.expense?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteExpense}
      />
    </div>
  );
}
