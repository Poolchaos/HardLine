import { useState, useEffect, useRef } from 'react';
import { transactionApi } from '../lib/api';
import type { Category, Consumer, TransactionType, IncomeSource } from '../types';

interface QuickAddProps {
  onClose: () => void;
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'Essential', label: 'Essential', emoji: '🛒' },
  { value: 'NiceToHave', label: 'Nice to Have', emoji: '✨' },
  { value: 'WorkAI', label: 'Work/AI', emoji: '💻' },
  { value: 'Startup', label: 'Startup', emoji: '🚀' },
  { value: 'Snack', label: 'Snack', emoji: '🍪' },
  { value: 'Takeaway', label: 'Takeaway', emoji: '🍔' },
];

const CONSUMERS: { value: Consumer; label: string }[] = [
  { value: 'MeMom', label: 'Me + Mom' },
  { value: 'Household', label: 'Household (Shared)' },
  { value: 'SisterBF', label: 'Sister + BF' },
];

const INCOME_SOURCES: { value: IncomeSource; label: string; emoji: string }[] = [
  { value: 'Salary', label: 'Salary', emoji: '💼' },
  { value: 'Sister', label: 'Sister Payment', emoji: '👩' },
  { value: 'SideProject', label: 'Side Project', emoji: '🚀' },
  { value: 'Other', label: 'Other', emoji: '💰' },
];

export default function QuickAdd({ onClose }: QuickAddProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Essential');
  const [consumer, setConsumer] = useState<Consumer>('MeMom');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('Salary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [penaltyTriggered, setPenaltyTriggered] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus amount input when modal opens
    amountInputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Trap focus within modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

      const response = await transactionApi.create({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        ...(type === 'expense' && {
          category,
          consumer,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickadd-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-lg border bg-background p-6 shadow-xl transition-all ${
          penaltyTriggered ? 'border-destructive bg-destructive/10' : 'border-border'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 id="quickadd-title" className="text-2xl font-bold">
            Add Transaction
          </h2>
          <p className="text-sm text-muted-foreground">
            Record income or expense
          </p>
        </div>

        {/* Penalty Alert */}
        {penaltyTriggered && (
          <div
            className="mb-4 rounded-lg border-2 border-destructive bg-destructive/20 p-4 animate-pulse"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
              <div>
                <p className="font-bold text-destructive text-lg">Penalty Applied!</p>
                <p className="text-sm text-destructive">R500 added to penalties</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3" role="alert">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div>
            <p className="block text-sm font-medium mb-2" id="type-label">
              Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                  type === 'income'
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                    : 'border-border bg-secondary hover:border-green-500/50'
                }`}
              >
                💰 Income
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                  type === 'expense'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-border bg-secondary hover:border-red-500/50'
                }`}
              >
                💸 Expense
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-2">
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
              required
              aria-required="true"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={type === 'income' ? 'Where is this from?' : 'What did you buy?'}
              required
              aria-required="true"
            />
          </div>

          {/* Income Source (only for income) */}
          {type === 'income' && (
            <div>
              <p className="block text-sm font-medium mb-2" id="source-label">
                Income Source
              </p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="source-label">
                {INCOME_SOURCES.map((src) => (
                  <button
                    key={src.value}
                    type="button"
                    onClick={() => setIncomeSource(src.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                      incomeSource === src.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                        : 'border-border bg-secondary hover:border-green-500/50'
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

          {/* Category Pills (only for expense) */}
          {type === 'expense' && (
            <div>
              <p className="block text-sm font-medium mb-2" id="category-label">
                Category
              </p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="category-label">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                      category === cat.value
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border bg-secondary hover:border-primary/50'
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

          {/* Consumer (only for expense) */}
          {type === 'expense' && (
            <div>
              <label htmlFor="consumer" className="block text-sm font-medium mb-2">
                Who is this for?
              </label>
              <select
                id="consumer"
                value={consumer}
                onChange={(e) => setConsumer(e.target.value as Consumer)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CONSUMERS.map((cons) => (
                  <option key={cons.value} value={cons.value}>
                    {cons.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-secondary px-4 py-2 font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 rounded-md px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                type === 'income'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-primary hover:bg-primary/90'
              }`}
              disabled={loading}
            >
              {loading ? 'Adding...' : type === 'income' ? 'Add Income' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}