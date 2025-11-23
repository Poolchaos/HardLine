import { useState, useEffect, useRef } from 'react';
import { transactionApi, shoppingApi } from '../lib/api';
import type { Category, TransactionType, IncomeSource, ShoppingList, ShoppingItem } from '../types';

interface QuickAddProps {
  onClose: () => void;
}

// Regular expense categories
const EXPENSE_CATEGORIES: { value: Category; label: string; emoji: string; isWastage: boolean }[] = [
  { value: 'Essential', label: 'Essential', emoji: '🛒', isWastage: false },
  { value: 'NiceToHave', label: 'Nice to Have', emoji: '✨', isWastage: false },
  { value: 'WorkAI', label: 'Work/AI', emoji: '💻', isWastage: false },
  { value: 'Startup', label: 'Startup', emoji: '🚀', isWastage: false },
];

// Wastage categories
const WASTAGE_CATEGORIES: { value: Category; label: string; emoji: string; isWastage: boolean }[] = [
  { value: 'Snack', label: 'Snack', emoji: '🍪', isWastage: true },
  { value: 'Takeaway', label: 'Takeaway', emoji: '🍔', isWastage: true },
  { value: 'Discretionary', label: 'Delivery/Tips/Fees', emoji: '💸', isWastage: true },
];

const INCOME_SOURCES: { value: IncomeSource; label: string; emoji: string }[] = [
  { value: 'Salary', label: 'Salary', emoji: '💼' },
  { value: 'Other', label: 'Other Income', emoji: '💰' },
];

export default function QuickAdd({ onClose }: QuickAddProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [isWastage, setIsWastage] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Essential');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('Salary');

  // Shopping list integration
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [listItems, setListItems] = useState<ShoppingItem[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<{ itemId: string; quantity: number; actualCost: number }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [penaltyTriggered, setPenaltyTriggered] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountInputRef.current?.focus();
    loadShoppingLists();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (selectedListId) {
      loadListItems(selectedListId);
    } else {
      setListItems([]);
      setPurchasedItems([]);
    }
  }, [selectedListId]);

  // Auto-set wastage based on category
  useEffect(() => {
    const selectedCategory = [...EXPENSE_CATEGORIES, ...WASTAGE_CATEGORIES].find(c => c.value === category);
    if (selectedCategory) {
      setIsWastage(selectedCategory.isWastage);
    }
  }, [category]);

  async function loadShoppingLists() {
    try {
      const lists = await shoppingApi.getAllLists();
      setShoppingLists(lists);
    } catch (err: any) {
      console.error('Failed to load shopping lists:', err);
    }
  }

  async function loadListItems(listId: string) {
    try {
      const items = await shoppingApi.getAllItems(listId);
      setListItems(items);
      setPurchasedItems([]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleItemToggle(itemId: string) {
    const existing = purchasedItems.find(p => p.itemId === itemId);
    if (existing) {
      setPurchasedItems(purchasedItems.filter(p => p.itemId !== itemId));
    } else {
      const item = listItems.find(i => i._id === itemId);
      if (item) {
        setPurchasedItems([...purchasedItems, { itemId, quantity: 1, actualCost: item.typicalCost }]);
      }
    }
  }

  function updatePurchasedItem(itemId: string, field: 'quantity' | 'actualCost', value: number) {
    setPurchasedItems(purchasedItems.map(p =>
      p.itemId === itemId ? { ...p, [field]: value } : p
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate wastage amount based on category
      const totalAmount = parseFloat(amount);
      const wastageAmount = isWastage ? totalAmount : 0;

      const response = await transactionApi.create({
        type,
        amount: totalAmount,
        description: description.trim(),
        ...(type === 'expense' && {
          category,
        }),
        ...(type === 'income' && {
          incomeSource,
        }),
        ...(wastageAmount > 0 && {
          wastageAmount,
          wastageType: category === 'Snack' ? 'Other' as any :
                       category === 'Takeaway' ? 'Other' as any :
                       'DeliveryFee' as any,
          wastageNotes: `${category} - ${description.trim()}`,
        }),
      });

      if (response.penaltyTriggered) {
        setPenaltyTriggered(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const allCategories = isWastage ? WASTAGE_CATEGORIES : EXPENSE_CATEGORIES;
  const totalPurchased = purchasedItems.reduce((sum, p) => sum + (p.quantity * p.actualCost), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickadd-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl transition-all ${
          penaltyTriggered
            ? 'border-red-500/50 bg-red-500/10 backdrop-blur-xl'
            : 'border-slate-700 bg-slate-900/95 backdrop-blur-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED HEADER */}
        <div className="border-b border-slate-700 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="quickadd-title" className="text-2xl font-bold text-white">
                Add Transaction
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Record income or expense
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors rounded-lg p-2 hover:bg-slate-800"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Alerts */}
          {penaltyTriggered && (
            <div className="mt-4 rounded-xl border-2 border-red-500 bg-red-500/20 p-4 animate-pulse" role="alert">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-400 text-lg">Penalty Applied!</p>
                  <p className="text-sm text-red-300">R500 added to penalties</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4" role="alert">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-5" id="transaction-form">
            {/* Type Toggle */}
            <div>
              <p className="block text-sm font-medium text-slate-200 mb-2">Transaction Type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    type === 'income'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50'
                  }`}
                >
                  💰 Income
                </button>
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    type === 'expense'
                      ? 'border-red-500 bg-red-500/20 text-red-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-red-500/50'
                  }`}
                >
                  💸 Expense
                </button>
              </div>
            </div>

            {/* Expense/Wastage Toggle (only for expenses) */}
            {type === 'expense' && (
              <div>
                <p className="block text-sm font-medium text-slate-200 mb-2">Expense Type</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsWastage(false); setCategory('Essential'); }}
                    className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      !isWastage
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-blue-500/50'
                    }`}
                  >
                    🛒 Regular Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsWastage(true); setCategory('Snack'); }}
                    className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      isWastage
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-amber-500/50'
                    }`}
                  >
                    💸 Wastage
                  </button>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-200 mb-2">
                Amount (R)
              </label>
              <input
                ref={amountInputRef}
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-200 mb-2">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder={type === 'income' ? 'Where is this from?' : 'What did you buy?'}
                required
              />
            </div>

            {/* Income Source */}
            {type === 'income' && (
              <div>
                <p className="block text-sm font-medium text-slate-200 mb-2">Income Source</p>
                <div className="grid grid-cols-2 gap-2">
                  {INCOME_SOURCES.map((src) => (
                    <button
                      key={src.value}
                      type="button"
                      onClick={() => setIncomeSource(src.value)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                        incomeSource === src.value
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50'
                      }`}
                    >
                      <span className="mr-2">{src.emoji}</span>
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category (for expenses) */}
            {type === 'expense' && (
              <div>
                <p className="block text-sm font-medium text-slate-200 mb-2">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {allCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                        category === cat.value
                          ? (isWastage ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-emerald-500 bg-emerald-500/20 text-emerald-400')
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50'
                      }`}
                    >
                      <span className="mr-2">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shopping List Integration (only for regular expenses, not wastage) */}
            {type === 'expense' && !isWastage && shoppingLists.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <label htmlFor="shopping-list" className="block text-sm font-medium text-slate-200 mb-2">
                  Link to Shopping List (optional)
                </label>
                <select
                  id="shopping-list"
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  <option value="" className="bg-slate-900">-- None --</option>
                  {shoppingLists.map((list) => (
                    <option key={list._id} value={list._id} className="bg-slate-900">{list.name}</option>
                  ))}
                </select>

                {selectedListId && listItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-slate-300 font-medium">Items Purchased:</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700">
                      {listItems.map((item) => {
                        const purchased = purchasedItems.find(p => p.itemId === item._id);
                        return (
                          <div key={item._id} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!!purchased}
                              onChange={() => handleItemToggle(item._id)}
                              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800/50 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-white">{item.name}</span>
                                <span className="text-xs text-slate-400">Est: R{item.typicalCost.toFixed(2)}</span>
                              </div>
                              {purchased && (
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <input
                                      type="number"
                                      min="1"
                                      value={purchased.quantity}
                                      onChange={(e) => updatePurchasedItem(item._id, 'quantity', parseInt(e.target.value) || 1)}
                                      className="w-full text-xs rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                                      placeholder="Qty"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={purchased.actualCost}
                                      onChange={(e) => updatePurchasedItem(item._id, 'actualCost', parseFloat(e.target.value) || 0)}
                                      className="w-full text-xs rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                                      placeholder="Cost"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {purchasedItems.length > 0 && (
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700">
                        <span className="text-slate-300">Items Total:</span>
                        <span className="font-bold text-emerald-400">R{totalPurchased.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* FIXED FOOTER */}
        <div className="border-t border-slate-700 p-6 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="transaction-form"
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
              disabled={loading}
            >
              {loading ? 'Adding...' : type === 'income' ? 'Add Income' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
