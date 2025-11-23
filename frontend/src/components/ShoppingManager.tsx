import { useEffect, useState } from 'react';
import { shoppingApi } from '../lib/api';
import GlobalItemSelector from './GlobalItemSelector';
import ConfirmModal from './ConfirmModal';
import type { ShoppingItem, ShoppingList, ShoppingCategory, ShoppingCycle, GlobalItem } from '../types';

export default function ShoppingManager() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddListForm, setShowAddListForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'item' | 'list';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'item', id: '', name: '' });

  // List form state
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [listTargetDate, setListTargetDate] = useState('');

  // Item form state
  const [selectedGlobalItem, setSelectedGlobalItem] = useState<GlobalItem | null>(null);
  const [cycle, setCycle] = useState<ShoppingCycle>('MonthStart');
  const [quantity, setQuantity] = useState('1');
  const [isDiabeticFriendly, setIsDiabeticFriendly] = useState(false);
  const [itemListId, setItemListId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedListId) {
      loadItems(selectedListId);
    }
  }, [selectedListId]);

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity.toString());
      setCycle(editingItem.cycle);
      setIsDiabeticFriendly(editingItem.isDiabeticFriendly);
      setItemListId(editingItem.listId);
      setSelectedGlobalItem(editingItem.globalItem || null);
    }
  }, [editingItem]);

  async function loadLists() {
    try {
      setLoading(true);
      const data = await shoppingApi.getAllLists();
      // Sort lists by sortOrder
      const sortedLists = data.sort((a, b) => a.sortOrder - b.sortOrder);
      setLists(sortedLists);
      if (sortedLists.length > 0 && !selectedListId) {
        setSelectedListId(sortedLists[0]._id);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(listId: string) {
    try {
      const data = await shoppingApi.getAllItems(listId);
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddList(e: React.FormEvent) {
    e.preventDefault();

    if (!listName.trim()) {
      setError('Please enter a list name');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newList = await shoppingApi.createList({
        name: listName.trim(),
        description: listDescription.trim() || undefined,
        sortOrder: lists.length,
        targetDate: listTargetDate ? new Date(listTargetDate).toISOString() : undefined,
      });

      setListName('');
      setListDescription('');
      setListTargetDate('');
      setShowAddListForm(false);

      await loadLists();
      setSelectedListId(newList._id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGlobalItem || !quantity || parseInt(quantity) <= 0) {
      setError('Please select an item and enter a valid quantity');
      return;
    }

    const targetListId = itemListId || selectedListId;
    if (!targetListId) {
      setError('Please select a shopping list');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingItem) {
        // Update existing item
        await shoppingApi.updateItem(editingItem._id, {
          listId: targetListId,
          globalItemId: selectedGlobalItem._id,
          cycle,
          quantity: parseInt(quantity),
          isDiabeticFriendly,
        });
      } else {
        // Create new item
        await shoppingApi.createItem({
          listId: targetListId,
          globalItemId: selectedGlobalItem._id,
          cycle,
          quantity: parseInt(quantity),
          isDiabeticFriendly,
        });
      }

      // Reset form
      setSelectedGlobalItem(null);
      setQuantity('1');
      setIsDiabeticFriendly(false);
      setItemListId('');
      setShowAddItemForm(false);
      setEditingItem(null);

      // Reload items if viewing the target list
      if (targetListId === selectedListId) {
        await loadItems(targetListId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEditItem(item: ShoppingItem) {
    setEditingItem(item);
    setShowAddItemForm(true);
  }

  function handleDeleteItem(id: string, itemName: string) {
    setDeleteConfirm({
      isOpen: true,
      type: 'item',
      id,
      name: itemName,
    });
  }

  async function confirmDelete() {
    try {
      if (deleteConfirm.type === 'item') {
        await shoppingApi.deleteItem(deleteConfirm.id);
        if (selectedListId) {
          await loadItems(selectedListId);
        }
      } else if (deleteConfirm.type === 'list') {
        await shoppingApi.deleteList(deleteConfirm.id);
        await loadLists();
        setSelectedListId(null);
      }
      setDeleteConfirm({ isOpen: false, type: 'item', id: '', name: '' });
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleDeleteList(id: string, listName: string) {
    setDeleteConfirm({
      isOpen: true,
      type: 'list',
      id,
      name: listName,
    });
  }

  async function moveList(listId: string, direction: 'left' | 'right') {
    const currentIndex = lists.findIndex(l => l._id === listId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lists.length) return;

    const newLists = [...lists];
    [newLists[currentIndex], newLists[newIndex]] = [newLists[newIndex], newLists[currentIndex]];

    // Update sortOrder for swapped lists
    newLists.forEach((list, index) => {
      list.sortOrder = index;
    });

    setLists(newLists);

    // Update backend
    try {
      await Promise.all(
        [newLists[currentIndex], newLists[newIndex]].map(list =>
          shoppingApi.updateListOrder(list._id, list.sortOrder)
        )
      );
    } catch (err: any) {
      setError(err.message);
      await loadLists(); // Reload on error
    }
  }

  const categories: ShoppingCategory[] = ['Cleaning', 'Pantry', 'Fridge'];
  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(item => item.globalItem?.category === cat);
    return acc;
  }, {} as Record<ShoppingCategory, ShoppingItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Loading shopping items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Shopping Lists</h1>
          <p className="text-slate-400 mt-1">Manage your recurring shopping items</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddListForm(!showAddListForm)}
            className="rounded-lg border-2 border-teal-500 bg-teal-500/10 px-4 py-2 font-semibold text-teal-400 hover:bg-teal-500/20 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          >
            {showAddListForm ? 'Cancel' : '+ New List'}
          </button>
          <button
            onClick={() => setShowAddItemForm(!showAddItemForm)}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            {showAddItemForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>
      </div>

      {/* List Tabs */}
      {lists.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {lists.map((list, index) => {
            const isOverdue = list.targetDate && new Date(list.targetDate) < new Date();
            const daysUntil = list.targetDate ? Math.ceil((new Date(list.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div
                key={list._id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedListId === list._id
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {/* Move left button */}
                {index > 0 && (
                  <button
                    onClick={() => moveList(list._id, 'left')}
                    className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                    aria-label="Move left"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setSelectedListId(list._id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span>📋 {list.name}</span>
                    {isOverdue && <span className="text-red-400 text-xs">⚠️</span>}
                  </div>
                  {list.targetDate && (
                    <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                      {daysUntil !== null && daysUntil > 0 ? `${daysUntil}d` : 'Overdue'}
                    </span>
                  )}
                </button>

                {/* Move right button */}
                {index < lists.length - 1 && (
                  <button
                    onClick={() => moveList(list._id, 'right')}
                    className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                    aria-label="Move right"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {lists.length > 1 && (
                  <button
                    onClick={() => handleDeleteList(list._id, list.name)}
                    className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                    aria-label={`Delete ${list.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Add List Form */}
      {showAddListForm && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Create New Shopping List</h2>
          <form onSubmit={handleAddList} className="space-y-4">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-slate-200 mb-2">
                List Name *
              </label>
              <input
                id="listName"
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-500"
                placeholder="e.g., Weekly Groceries, Monthly Bulk"
                required
              />
            </div>

            <div>
              <label htmlFor="listDescription" className="block text-sm font-medium text-slate-200 mb-2">
                Description (optional)
              </label>
              <input
                id="listDescription"
                type="text"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-500"
                placeholder="What's this list for?"
              />
            </div>

            <div>
              <label htmlFor="listTargetDate" className="block text-sm font-medium text-slate-200 mb-2">
                Target Date (optional)
              </label>
              <input
                id="listTargetDate"
                type="date"
                value={listTargetDate}
                onChange={(e) => setListTargetDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddListForm(false)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 font-semibold text-white hover:shadow-lg hover:shadow-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Item Form */}
      {showAddItemForm && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">{editingItem ? 'Edit Shopping Item' : 'Add Shopping Item'}</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="itemList" className="block text-sm font-medium text-slate-200 mb-2">
                  Shopping List
                </label>
                <select
                  id="itemList"
                  value={itemListId}
                  onChange={(e) => setItemListId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="" className="bg-slate-900">
                    {selectedListId ? `Current: ${lists.find(l => l._id === selectedListId)?.name || 'Unknown'}` : 'Select a list...'}
                  </option>
                  {lists.map(list => (
                    <option key={list._id} value={list._id} className="bg-slate-900">
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-200 mb-2">
                  Quantity *
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-500"
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Search for Item *
              </label>
              {selectedGlobalItem ? (
                <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {selectedGlobalItem.brand && `${selectedGlobalItem.brand} `}
                      {selectedGlobalItem.name}
                      {selectedGlobalItem.packageSize && ` ${selectedGlobalItem.packageSize}${selectedGlobalItem.uom}`}
                    </div>
                    <div className="text-sm text-slate-400">
                      {selectedGlobalItem.category === 'Pantry' ? '🥫' : selectedGlobalItem.category === 'Fridge' ? '🧊' : '🧹'} {selectedGlobalItem.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGlobalItem(null)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <GlobalItemSelector
                  onSelect={setSelectedGlobalItem}
                  placeholder="Search for an item or create new..."
                />
              )}
            </div>

            <div>
              <label htmlFor="cycle" className="block text-sm font-medium text-slate-200 mb-2">
                Shopping Cycle *
              </label>
              <select
                id="cycle"
                value={cycle}
                onChange={(e) => setCycle(e.target.value as ShoppingCycle)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="MonthStart" className="bg-slate-900">Month Start</option>
                <option value="MidMonth" className="bg-slate-900">Mid Month</option>
                <option value="Both" className="bg-slate-900">Both</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="diabetic"
                type="checkbox"
                checked={isDiabeticFriendly}
                onChange={(e) => setIsDiabeticFriendly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800/50 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
              />
              <label htmlFor="diabetic" className="text-sm text-slate-300">
                Diabetic-friendly item
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddItemForm(false);
                  setEditingItem(null);
                  setSelectedGlobalItem(null);
                  setQuantity('1');
                  setIsDiabeticFriendly(false);
                  setItemListId('');
                }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
                disabled={saving}
              >
                {saving ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shopping Items by Category */}
      {items.length === 0 && !showAddItemForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-slate-400 mb-2">No shopping items yet</p>
          <p className="text-sm text-slate-500">Click "Add Item" to create your first shopping list item</p>
        </div>
      )}

      {categories.map((cat) => {
        const categoryItems = groupedItems[cat];
        if (categoryItems.length === 0) return null;

        return (
          <div key={cat} className="rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {cat === 'Pantry' ? '🥫' : cat === 'Fridge' ? '🧊' : '🧹'}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{cat}</h2>
                  <p className="text-sm text-slate-400">{categoryItems.length} items</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-700">
              {categoryItems.map((item) => {
                const globalItem = item.globalItem;
                const itemName = globalItem
                  ? `${globalItem.brand ? globalItem.brand + ' ' : ''}${globalItem.name}${globalItem.packageSize ? ` ${globalItem.packageSize}${globalItem.uom}` : ''}`
                  : 'Unknown Item';

                return (
                  <div key={item._id} className="p-4 hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{itemName}</h3>
                          {item.isDiabeticFriendly && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                              Diabetic-friendly
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                          <span>
                            {item.cycle === 'MonthStart' ? '📅 Month Start' :
                             item.cycle === 'MidMonth' ? '📅 Mid Month' :
                             '📅 Both'}
                          </span>
                          <span>•</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-slate-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                          aria-label={`Edit ${itemName}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id, itemName)}
                          className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                          aria-label={`Delete ${itemName}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: 'item', id: '', name: '' })}
        onConfirm={confirmDelete}
        title={deleteConfirm.type === 'item' ? 'Delete Item' : 'Delete Shopping List'}
        message={
          deleteConfirm.type === 'item'
            ? `Are you sure you want to delete "${deleteConfirm.name}"?`
            : `Are you sure you want to delete "${deleteConfirm.name}"? All items in this list will be permanently deleted.`
        }
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
