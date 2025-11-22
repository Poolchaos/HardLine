import { useEffect, useState } from 'react';
import { shoppingApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { ShoppingItem, ShoppingCategory } from '../types';

export default function ShoppingPlanner() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShoppingList();
  }, []);

  async function loadShoppingList() {
    try {
      setLoading(true);
      const data = await shoppingApi.getActiveList();
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <div className="text-muted-foreground">Loading shopping list...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4" role="alert">
        <p className="font-medium text-destructive">Error loading shopping list</p>
        <p className="text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  const categories: ShoppingCategory[] = ['Cleaning', 'Pantry', 'Fridge'];
  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(item => item.category === cat);
    return acc;
  }, {} as Record<ShoppingCategory, ShoppingItem[]>);

  const totalCost = items.reduce((sum, item) => sum + item.typicalCost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shopping List</h1>
          <p className="text-sm text-muted-foreground">Current cycle items</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Estimated Total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-border bg-secondary p-8 text-center">
          <p className="text-muted-foreground">No items in current shopping cycle</p>
        </div>
      )}

      {/* Category Sections */}
      {categories.map((category) => {
        const categoryItems = groupedItems[category];
        if (categoryItems.length === 0) return null;

        return (
          <section key={category} aria-labelledby={`${category}-heading`}>
            <details className="group rounded-lg border border-border bg-secondary" open>
              <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold hover:bg-accent">
                <div className="flex items-center gap-3">
                  <span id={`${category}-heading`}>{category}</span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    {categoryItems.length} items
                  </span>
                </div>
                <span className="transition-transform group-open:rotate-180" aria-hidden="true">
                  ▼
                </span>
              </summary>

              <div className="border-t border-border">
                <ul className="divide-y divide-border">
                  {categoryItems.map((item) => (
                    <li
                      key={item._id}
                      className="flex items-center gap-3 p-4 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        id={`item-${item._id}`}
                        className="h-5 w-5 rounded border-input focus:ring-2 focus:ring-ring"
                        aria-label={`Mark ${item.name} as purchased`}
                      />
                      <label
                        htmlFor={`item-${item._id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.isDiabeticFriendly && (
                            <span
                              className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
                              title="Diabetic-friendly"
                              aria-label="Diabetic-friendly item"
                            >
                              🩺 DF
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Typical: {formatCurrency(item.typicalCost)}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
