import { useState, useEffect } from 'react';
import { transactionApi } from '../lib/api';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import type { Transaction, WastageType, Category } from '../types';

interface GroupedTransactions {
  [date: string]: Transaction[];
}

type GroupingMode = 'day' | 'week' | 'month';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    wastageAmount: '',
    wastageType: '' as WastageType | '',
    wastageNotes: '',
    category: '' as Category | '',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
  }>({ isOpen: false, transaction: null });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth]);

  useEffect(() => {
    if (editingTransaction) {
      setEditForm({
        description: editingTransaction.description,
        amount: editingTransaction.amount.toString(),
        wastageAmount: editingTransaction.wastageAmount?.toString() || '',
        wastageType: editingTransaction.wastageType || '',
        wastageNotes: editingTransaction.wastageNotes || '',
        category: editingTransaction.category || '',
      });
    }
  }, [editingTransaction]);

  async function loadTransactions() {
    try {
      setLoading(true);
      const data = await transactionApi.list(selectedMonth);
      setTransactions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTransaction() {
    if (!editingTransaction) return;

    try {
      setSaving(true);
      setError(null);

      const updates: any = {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category || undefined,
      };

      // Handle wastage
      if (editForm.wastageAmount && parseFloat(editForm.wastageAmount) > 0) {
        updates.wastageAmount = parseFloat(editForm.wastageAmount);
        updates.wastageType = editForm.wastageType || 'ShouldntBuy';
        updates.wastageNotes = editForm.wastageNotes || '';
      } else {
        // Clear wastage if amount is 0 or empty
        updates.wastageAmount = 0;
        updates.wastageType = undefined;
        updates.wastageNotes = undefined;
      }

      await transactionApi.update(editingTransaction._id, updates);
      setEditingTransaction(null);
      await loadTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction() {
    if (!deleteConfirm.transaction) return;

    try {
      await transactionApi.delete(deleteConfirm.transaction._id);
      setDeleteConfirm({ isOpen: false, transaction: null });
      await loadTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function groupTransactions(): GroupedTransactions {
    const grouped: GroupedTransactions = {};

    transactions.forEach((txn) => {
      const date = new Date(txn.date);
      let key: string;

      switch (groupingMode) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = date.toISOString().slice(0, 7); // YYYY-MM
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(txn);
    });

    return grouped;
  }

  function formatGroupLabel(dateStr: string): string {
    const date = new Date(dateStr);

    switch (groupingMode) {
      case 'day':
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  function getCategoryEmoji(category?: Category): string {
    switch (category) {
      case 'Essential': return '🛒';
      case 'NiceToHave': return '✨';
      case 'WorkAI': return '💻';
      case 'Startup': return '🚀';
      case 'Snack': return '🍪';
      case 'Takeaway': return '🍔';
      default: return '💰';
    }
  }

  const groupedData = groupTransactions();
  const sortedKeys = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-slate-400 mt-1">View and edit your purchase history</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setGroupingMode('day')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              groupingMode === 'day'
                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
            }`}
          >
            By Day
          </button>
          <button
            onClick={() => setGroupingMode('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              groupingMode === 'week'
                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
            }`}
          >
            By Week
          </button>
          <button
            onClick={() => setGroupingMode('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              groupingMode === 'month'
                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
            }`}
          >
            By Month
          </button>
        </div>

        <div>
          <label htmlFor="month-select" className="text-sm text-slate-400 mr-2">
            Month:
          </label>
          <input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Transactions */}
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-400">No transactions found for this period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedKeys.map((dateKey) => {
            const items = groupedData[dateKey];
            const totalIncome = items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const totalWastage = items.reduce((sum, t) => sum + (t.wastageAmount || 0), 0);

            return (
              <div key={dateKey} className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-slate-700 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">{formatGroupLabel(dateKey)}</h2>
                    <div className="flex gap-4 text-sm">
                      {totalIncome > 0 && (
                        <span className="text-emerald-400">Income: R{totalIncome.toFixed(2)}</span>
                      )}
                      {totalExpense > 0 && (
                        <span className="text-red-400">Expenses: R{totalExpense.toFixed(2)}</span>
                      )}
                      {totalWastage > 0 && (
                        <span className="text-amber-400">Wastage: R{totalWastage.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-700">
                  {items.map((txn) => (
                    <div key={txn._id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getCategoryEmoji(txn.category)}</span>
                            <div>
                              <h3 className="font-semibold text-white">{txn.description}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                <span>{new Date(txn.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                {txn.category && <span>• {txn.category}</span>}
                                {txn.wastageAmount && txn.wastageAmount > 0 && (
                                  <span className="text-amber-400">• 💸 R{txn.wastageAmount.toFixed(2)} wastage</span>
                                )}
                              </div>
                              {txn.wastageNotes && (
                                <p className="text-xs text-slate-500 mt-1">{txn.wastageNotes}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`text-lg font-bold ${txn.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {txn.type === 'income' ? '+' : '-'}R{txn.amount.toFixed(2)}
                          </span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTransaction(txn)}
                              className="text-slate-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                              title="Edit transaction"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, transaction: txn })}
                              className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                              title="Delete transaction"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Edit Transaction"
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setEditingTransaction(null)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateTransaction}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white hover:shadow-lg disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Amount (R)</label>
            <CurrencyInput
              value={editForm.amount}
              onChange={(value) => setEditForm({ ...editForm, amount: value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-4">Wastage Tracking</h3>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Wastage Amount (R)</label>
              <CurrencyInput
                value={editForm.wastageAmount}
                onChange={(value) => setEditForm({ ...editForm, wastageAmount: value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:ring-2 focus:ring-amber-500"
                placeholder="0.00"
              />
              <p className="text-xs text-slate-400 mt-1">Leave as 0 to remove wastage tracking</p>
            </div>

            {editForm.wastageAmount && parseFloat(editForm.wastageAmount) > 0 && (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-200 mb-2">Wastage Type</label>
                  <select
                    value={editForm.wastageType}
                    onChange={(e) => setEditForm({ ...editForm, wastageType: e.target.value as WastageType })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ShouldntBuy">Shouldn't Buy (Wasteful Purchase)</option>
                    <option value="DeliveryFee">Delivery Fee</option>
                    <option value="Tip">Tip</option>
                    <option value="AppFee">App Fee</option>
                    <option value="ServiceCharge">Service Charge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-200 mb-2">Wastage Notes</label>
                  <textarea
                    value={editForm.wastageNotes}
                    onChange={(e) => setEditForm({ ...editForm, wastageNotes: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:ring-2 focus:ring-amber-500"
                    rows={2}
                    placeholder="e.g., Takeaway, snacks, sugar, or other items you shouldn't be buying"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, transaction: null })}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteConfirm.transaction?.description}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
