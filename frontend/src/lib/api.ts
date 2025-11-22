import {
  BudgetDashboard,
  SubsidyReport,
  Transaction,
  CreateTransactionRequest,
  CreateTransactionResponse,
  ShoppingItem,
  User,
  FixedExpense
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
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
  getActiveList: () =>
    fetchApi<ShoppingItem[]>('/shopping/list'),

  getAllItems: () =>
    fetchApi<ShoppingItem[]>('/shopping/items'),

  createItem: (data: Omit<ShoppingItem, '_id' | 'userId' | 'isActive'>) =>
    fetchApi<ShoppingItem>('/shopping/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    fetchApi(`/shopping/items/${id}`, { method: 'DELETE' }),
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
