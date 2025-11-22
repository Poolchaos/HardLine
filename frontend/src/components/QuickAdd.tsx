import { useState, useEffect, useRef } from 'react';
import { transactionApi } from '../lib/api';
import type { Category, Consumer } from '../types';

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

export default function QuickAdd({ onClose }: QuickAddProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Essential');
  const [consumer, setConsumer] = useState<Consumer>('MeMom');
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
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        consumer,
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
            Add Expense
          </h2>
          <p className="text-sm text-muted-foreground">
            Record a new transaction
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
                <p className="text-sm text-destructive">R500 added to savings goal</p>
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
              placeholder="What did you buy?"
              required
              aria-required="true"
            />
          </div>

          {/* Category Pills */}
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

          {/* Consumer */}
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
              className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
