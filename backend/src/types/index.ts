export type Category = 'Essential' | 'Discretionary' | 'WorkAI' | 'Startup' | 'Food' | 'Entertainment';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';
export type TransactionType = 'income' | 'expense';
export type IncomeSource = 'Salary' | 'Sister' | 'SideProject' | 'Other';

export interface IUser {
  _id?: string;
  email: string;
  passwordHash: string;
  name: string;
  payday: number; // 1-31
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITransaction {
  _id?: string;
  userId: string;
  type: TransactionType;
  date: Date;
  amount: number;
  description: string;
  // For expense transactions
  category?: Category;
  // For income transactions
  incomeSource?: IncomeSource;
  createdAt?: Date;
}

export interface IFixedExpense {
  _id?: string;
  userId: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface IShoppingItem {
  _id?: string;
  userId: string;
  name: string;
  category: ShoppingCategory;
  cycle: ShoppingCycle;
  isDiabeticFriendly: boolean;
  typicalCost: number;
  isActive: boolean;
}

export interface IShoppingPurchase {
  _id?: string;
  userId: string;
  shoppingItemId: string;
  transactionId: string;
  cycle: ShoppingCycle;
  actualCost: number;
  purchaseDate: Date;
}

// API Response Types
export interface BudgetDashboard {
  totalIncome: number;
  totalSpent: number;
  fixedExpenses: number;
  availableBalance: number;
  daysUntilPayday: number;
}
