import { useState, useEffect, useRef } from 'react';
import { transactionApi, shoppingApi } from '../lib/api';
import CurrencyInput from './CurrencyInput';
import type { Category, TransactionType, IncomeSource, ShoppingList, ShoppingItem, ShoppingCategory } from '../types';

interface QuickAddProps {
  onClose: () => void;
}

// Map shopping categories to transaction categories
function mapShoppingCategoryToTransactionCategory(shoppingCategory: ShoppingCategory): Category {
  switch (shoppingCategory) {
    case 'Fridge':
    case 'Pantry':
      return 'Essential';
    case 'Cleaning':
      return 'Essential';
    default:
      return 'Essential';
  }
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'Essential', label: 'Essential', emoji: '🛒' },
  { value: 'NiceToHave', label: 'Nice to Have', emoji: '✨' },
  { value: 'WorkAI', label: 'Work/AI', emoji: '💻' },
  { value: 'Startup', label: 'Startup', emoji: '🚀' },
  { value: 'Snack', label: 'Snack', emoji: '🍪' },
  { value: 'Takeaway', label: 'Takeaway', emoji: '🍔' },
];

const INCOME_SOURCES: { value: IncomeSource; label: string; emoji: string }[] = [
  { value: 'Salary', label: 'Salary', emoji: '💼' },
  { value: 'Other', label: 'Other Income', emoji: '💰' },
];

export default function QuickAdd({ onClose }: QuickAddProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Essential');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('Salary');
  const [isWastage, setIsWastage] = useState(false);

  // Shopping list integration
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [listItems, setListItems] = useState<ShoppingItem[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<{
    itemId: string;
    quantity: number;
    actualCost: number;
    isWastage: boolean;
  }[]>([]);

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

  // Auto-calculate total when using shopping list
  useEffect(() => {
    if (purchasedItems.length > 0) {
      const total = purchasedItems.reduce((sum, item) => sum + item.actualCost, 0);
      setAmount(total.toFixed(2));
    }
  }, [purchasedItems, listItems]);

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
        setPurchasedItems([...purchasedItems, {
          itemId,
          quantity: item.quantity || 1,
          actualCost: 0,
          isWastage: false,
        }]);
      }
    }
  }

  function updatePurchasedItem(itemId: string, field: 'quantity' | 'actualCost' | 'isWastage', value: number | boolean) {
    setPurchasedItems(purchasedItems.map(p =>
      p.itemId === itemId ? { ...p, [field]: value } : p
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If using shopping list, create transactions for each item
    if (type === 'expense' && purchasedItems.length > 0) {
      try {
        setLoading(true);
        setError(null);

        // Create a transaction for each purchased item
        const promises = purchasedItems.map(async (purchased) => {
          const item = listItems.find(i => i._id === purchased.itemId);
          if (!item || !item.globalItem) return;

          const itemTotal = purchased.actualCost;
          const itemName = item.globalItem.name;
          const itemCategory = mapShoppingCategoryToTransactionCategory(item.globalItem.category);

          const transactionData = {
            type: 'expense' as const,
            amount: itemTotal,
            description: `${itemName}${purchased.quantity > 1 ? ` x${purchased.quantity}` : ''}`,
            category: itemCategory,
            ...(purchased.isWastage && {
              wastageAmount: itemTotal,
              wastageType: 'ShouldntBuy' as any,
              wastageNotes: `Wastage: ${itemName}`,
            }),
          };

          console.log('Creating transaction:', transactionData);
          return transactionApi.create(transactionData);
        });

        await Promise.all(promises);

        onClose();
        window.location.reload();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular transaction (no shopping list)
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Only require description if not using shopping list
    if (!selectedListId && !description.trim()) {
      setError('Please enter a description');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const totalAmount = parseFloat(amount);

      const response = await transactionApi.create({
        type,
        amount: totalAmount,
        description: description.trim(),
        ...(type === 'expense' && {
          category,
          ...(isWastage && {
            wastageAmount: totalAmount,
            wastageType: 'ShouldntBuy' as any,
            wastageNotes: `Wastage: ${description.trim()}`,
          }),
        }),
        ...(type === 'income' && {
          incomeSource,
        }),
      });

      if (response.penaltyTriggered) {
        setPenaltyTriggered(true);
        setTimeout(() => {
          onClose();
          window.location.reload(); // Reload to update dashboard
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

          {/* Penalty Alert */}
          {penaltyTriggered && (
            <div
              className="mt-4 rounded-xl border-2 border-red-500 bg-red-500/20 p-4 animate-pulse"
              role="alert"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-400 text-lg">Penalty Applied!</p>
                  <p className="text-sm text-red-300">R500 added to penalties</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
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
            <p className="block text-sm font-medium text-slate-200 mb-2" id="type-label">
              Transaction Type
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  type === 'income'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'
                }`}
              >
                💰 Income
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  type === 'expense'
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-red-500/50 hover:text-red-400'
                }`}
              >
                💸 Expense
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-200 mb-2">
              Amount (R)
            </label>
            <CurrencyInput
              ref={amountInputRef}
              id="amount"
              value={amount}
              onChange={setAmount}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="0.00"
              required
              aria-required="true"
            />
          </div>

          {/* Description - hidden when using shopping list */}
          {!selectedListId && (
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
                aria-required="true"
              />
            </div>
          )}

          {/* Income Source (only for income) */}
          {type === 'income' && (
            <div>
              <p className="block text-sm font-medium text-slate-200 mb-2" id="source-label">
                Income Source
              </p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="source-label">
                {INCOME_SOURCES.map((src) => (
                  <button
                    key={src.value}
                    type="button"
                    onClick={() => setIncomeSource(src.value)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      incomeSource === src.value
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50'
                    }`}
                    role="radio"
                    aria-checked={incomeSource === src.value}
                  >
                    <span className="mr-2" aria-hidden="true">{src.emoji}</span>
                    {src.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Pills (only for expense and manual entry) */}
          {type === 'expense' && !selectedListId && (
            <div>
              <p className="block text-sm font-medium text-slate-200 mb-2" id="category-label">
                Category
              </p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="category-label">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      category === cat.value
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/50'
                    }`}
                    role="radio"
                    aria-checked={category === cat.value}
                  >
                    <span className="mr-2" aria-hidden="true">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shopping List Section (only for regular expenses) */}
          {type === 'expense' && shoppingLists.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <label htmlFor="shopping-list" className="block text-sm font-medium text-slate-200 mb-2">
                🛒 Use Shopping List (optional)
              </label>
              <select
                id="shopping-list"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="" className="bg-slate-900">-- Manual Entry --</option>
                {shoppingLists.map((list) => (
                  <option key={list._id} value={list._id} className="bg-slate-900">{list.name}</option>
                ))}
              </select>

              {selectedListId && listItems.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-300 font-medium">
                    Select items purchased from {shoppingLists.find(l => l._id === selectedListId)?.name}:
                  </p>
                  <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                    {listItems.map((item) => {
                      const purchased = purchasedItems.find(p => p.itemId === item._id);
                      const globalItem = item.globalItem;
                      const itemName = globalItem
                        ? `${globalItem.brand ? globalItem.brand + ' ' : ''}${globalItem.name}${globalItem.packageSize ? ` ${globalItem.packageSize}${globalItem.uom}` : ''}`
                        : 'Unknown Item';
                      const itemCategory = globalItem?.category || 'Unknown';

                      return (
                        <div key={item._id} className="space-y-2">
                          {/* Item header with checkbox */}
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={!!purchased}
                              onChange={() => handleItemToggle(item._id)}
                              className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-800/50 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">{itemName}</span>
                                <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                              </div>
                              <p className="text-xs text-slate-500">{itemCategory}</p>
                            </div>
                          </div>

                          {/* Item details when checked */}
                          {purchased && (
                            <div className="ml-8 grid grid-cols-3 gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={purchased.quantity}
                                  onChange={(e) => updatePurchasedItem(item._id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full text-sm rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-white focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Price (R)</label>
                                <CurrencyInput
                                  value={purchased.actualCost || ''}
                                  onChange={(value) => {
                                    const num = parseFloat(value.replace(',', '.')) || 0;
                                    updatePurchasedItem(item._id, 'actualCost', num);
                                  }}
                                  className="w-full text-sm rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-white focus:ring-2 focus:ring-emerald-500"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex items-end">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={purchased.isWastage}
                                    onChange={(e) => updatePurchasedItem(item._id, 'isWastage', e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-600 focus:ring-2 focus:ring-amber-500"
                                  />
                                  <span className="text-xs text-slate-400">Wastage</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {purchasedItems.length > 0 && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-emerald-400">Selected Items:</span>
                        <span className="text-lg font-bold text-emerald-400">
                          R{purchasedItems.reduce((sum, p) => sum + (p.quantity * p.actualCost), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-300">
                        {purchasedItems.length} item{purchasedItems.length !== 1 ? 's' : ''} selected
                        {purchasedItems.some(p => p.isWastage) && (
                          <span className="ml-2 text-amber-400">
                            (includes {purchasedItems.filter(p => p.isWastage).length} wastage)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual entry fields (only when NOT using shopping list) */}
          {type === 'expense' && !selectedListId && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWastage}
                  onChange={(e) => setIsWastage(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800/50 text-amber-600 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-200">
                  💸 This is wastage (Snack, Takeaway, delivery fees, tips, etc.)
                </span>
              </label>
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