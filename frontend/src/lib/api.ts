import {
  BudgetDashboard,
  SubsidyReport,
  Transaction,
  CreateTransactionRequest,
  CreateTransactionResponse,
  ShoppingItem,
  ShoppingList,
  GlobalItem,
  ItemPurchaseHistory,
  PurchaseStats,
  User,
  FixedExpense
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const budgetApi = {
  getDashboard: (month?: string) =>
    fetchApi<BudgetDashboard>(`/budget/dashboard${month ? `?month=${month}` : ''}`),

  getSubsidy: (month?: string) =>
    fetchApi<SubsidyReport>(`/budget/subsidy${month ? `?month=${month}` : ''}`),
};

export const transactionApi = {
  create: (data: CreateTransactionRequest) =>
    fetchApi<CreateTransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (month?: string) =>
    fetchApi<Transaction[]>(`/transactions${month ? `?month=${month}` : ''}`),

  getPenalties: (month?: string) =>
    fetchApi<{ takeaways: number; snacks: number; total: number }>(
      `/transactions/penalties${month ? `?month=${month}` : ''}`
    ),
};

export const shoppingApi = {
  // Shopping Lists
  getAllLists: () =>
    fetchApi<ShoppingList[]>('/shopping/lists'),

  createList: (data: { name: string; description?: string; sortOrder?: number; targetDate?: string }) =>
    fetchApi<ShoppingList>('/shopping/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateListOrder: (id: string, sortOrder: number) =>
    fetchApi<ShoppingList>(`/shopping/lists/${id}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ sortOrder }),
    }),

  deleteList: (id: string) =>
    fetchApi(`/shopping/lists/${id}`, { method: 'DELETE' }),

  // Shopping Items
  getActiveList: () =>
    fetchApi<ShoppingItem[]>('/shopping/list'),

  getAllItems: (listId?: string) =>
    fetchApi<ShoppingItem[]>(`/shopping/items${listId ? `?listId=${listId}` : ''}`),

  createItem: (data: Omit<ShoppingItem, '_id' | 'userId' | 'isActive' | 'globalItem'>) =>
    fetchApi<ShoppingItem>('/shopping/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (id: string, data: Partial<Omit<ShoppingItem, '_id' | 'userId' | 'isActive' | 'globalItem'>>) =>
    fetchApi<ShoppingItem>(`/shopping/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    fetchApi(`/shopping/items/${id}`, { method: 'DELETE' }),
};

export const globalItemsApi = {
  search: (query?: string, category?: string) =>
    fetchApi<GlobalItem[]>(`/global-items/search?${query ? `q=${encodeURIComponent(query)}&` : ''}${category ? `category=${category}` : ''}`),

  getById: (id: string) =>
    fetchApi<GlobalItem>(`/global-items/${id}`),

  create: (data: Omit<GlobalItem, '_id' | 'isActive' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<GlobalItem>('/global-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPurchaseHistory: (itemId: string, limit?: number) =>
    fetchApi<{ history: ItemPurchaseHistory[]; stats: PurchaseStats }>(
      `/global-items/${itemId}/history${limit ? `?limit=${limit}` : ''}`
    ),

  recordPurchase: (itemId: string, data: {
    price: number;
    quantity: number;
    purchaseDate: string;
    store?: string;
    notes?: string;
    transactionId?: string;
  }) =>
    fetchApi<ItemPurchaseHistory>(`/global-items/${itemId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const settingsApi = {
  getUser: () =>
    fetchApi<User>('/settings/user'),

  updateUser: (data: Partial<User>) =>
    fetchApi<User>('/settings/user', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getFixedExpenses: () =>
    fetchApi<FixedExpense[]>('/settings/fixed-expenses'),

  createFixedExpense: (data: { name: string; amount: number }) =>
    fetchApi<FixedExpense>('/settings/fixed-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteFixedExpense: (id: string) =>
    fetchApi(`/settings/fixed-expenses/${id}`, { method: 'DELETE' }),
};
