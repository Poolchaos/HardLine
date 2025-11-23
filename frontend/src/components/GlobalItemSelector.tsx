import { useState, useEffect, useRef } from 'react';
import { globalItemsApi } from '../lib/api';
import Modal from './Modal';
import type { GlobalItem, ShoppingCategory, UOM } from '../types';

interface GlobalItemSelectorProps {
  onSelect: (item: GlobalItem) => void;
  category?: ShoppingCategory;
  placeholder?: string;
  className?: string;
}

export default function GlobalItemSelector({
  onSelect,
  category,
  placeholder = "Search for an item...",
  className = ""
}: GlobalItemSelectorProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GlobalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Form state for creating new item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ShoppingCategory>(category || 'Pantry');
  const [newItemUOM, setNewItemUOM] = useState<UOM>('units');
  const [newItemPackageSize, setNewItemPackageSize] = useState('');
  const [newItemPackageType, setNewItemPackageType] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside a modal (portaled to body)
      const target = event.target as HTMLElement;
      if (target.closest('[role="dialog"]')) {
        return;
      }

      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchItems = async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const items = await globalItemsApi.search(search, category);
        setResults(items);
        setShowResults(true);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [search, category]);

  const handleSelect = (item: GlobalItem) => {
    onSelect(item);
    setSearch('');
    setResults([]);
    setShowResults(false);
  };

  const handleCreateNew = () => {
    setNewItemName(search);
    setShowCreateForm(true);
    setShowResults(false);
    setSearch(''); // Clear search when opening modal
  };

  const handleSubmitNew = async () => {
    if (!newItemName.trim() || !newItemUOM) {
      setError('Name and UOM are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const newItem = await globalItemsApi.create({
        name: newItemName.trim(),
        category: newItemCategory,
        uom: newItemUOM,
        packageSize: newItemPackageSize ? parseFloat(newItemPackageSize) : undefined,
        packageType: newItemPackageType.trim() || undefined,
        brand: newItemBrand.trim() || undefined,
      });

      handleSelect(newItem);
      resetCreateForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewItemName('');
    setNewItemPackageSize('');
    setNewItemPackageType('');
    setNewItemBrand('');
    setShowCreateForm(false);
  };

  const formatItemDisplay = (item: GlobalItem) => {
    let display = item.name;
    if (item.brand) display = `${item.brand} ${display}`;
    if (item.packageSize && item.uom) display += ` ${item.packageSize}${item.uom}`;
    if (item.packageType) display += ` ${item.packageType}`;
    return display;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => search && setShowResults(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-500"
      />

      {loading && (
        <div className="absolute right-3 top-3">
          <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item._id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{formatItemDisplay(item)}</div>
                  <div className="text-sm text-slate-400">
                    {item.category === 'Pantry' ? '🥫' : item.category === 'Fridge' ? '🧊' : '🧹'} {item.category}
                  </div>
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={handleCreateNew}
            className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition-colors border-t-2 border-emerald-500/30 text-emerald-400 font-medium"
          >
            + Create new item "{search}"
          </button>
        </div>
      )}

      {showResults && results.length === 0 && search.trim() && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          <button
            onClick={handleCreateNew}
            className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition-colors text-emerald-400 font-medium"
          >
            + Create new item "{search}"
          </button>
        </div>
      )}

      {/* Create New Item Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={resetCreateForm}
        title="Create New Item"
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetCreateForm}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitNew}
              disabled={creating}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Name *</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitNew()}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="e.g., Milk"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Category *</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as ShoppingCategory)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="Pantry">🥫 Pantry</option>
                <option value="Fridge">🧊 Fridge</option>
                <option value="Cleaning">🧹 Cleaning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">UOM *</label>
              <select
                value={newItemUOM}
                onChange={(e) => setNewItemUOM(e.target.value as UOM)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="units">Units</option>
                <option value="L">Liters (L)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="pack">Pack</option>
                <option value="dozen">Dozen</option>
                <option value="box">Box</option>
                <option value="bag">Bag</option>
                <option value="bottle">Bottle</option>
                <option value="can">Can</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Package Size</label>
              <input
                type="number"
                step="0.01"
                value={newItemPackageSize}
                onChange={(e) => setNewItemPackageSize(e.target.value)}
                placeholder="e.g., 2"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Package Type</label>
              <input
                type="text"
                value={newItemPackageType}
                onChange={(e) => setNewItemPackageType(e.target.value)}
                placeholder="e.g., Bottle"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Brand</label>
            <input
              type="text"
              value={newItemBrand}
              onChange={(e) => setNewItemBrand(e.target.value)}
              placeholder="e.g., Clover"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
