export type Category = 'Essential' | 'Discretionary' | 'WorkAI' | 'Startup' | 'Food' | 'Entertainment';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';
export type UOM = 'L' | 'ml' | 'kg' | 'g' | 'units' | 'pack' | 'dozen' | 'box' | 'bag' | 'bottle' | 'can';
export type TransactionType = 'income' | 'expense';
export type IncomeSource = 'Salary' | 'Other';
export type WastageType = 'DeliveryFee' | 'Tip' | 'AppFee' | 'ServiceCharge' | 'ShouldntBuy' | 'Other';

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
  // Wastage tracking
  wastageAmount?: number;
  wastageType?: WastageType;
  wastageNotes?: string;
  createdAt?: Date;
}

export interface IFixedExpense {
  _id?: string;
  userId: string;
  name: string;
  amount: number;
  debitDay: number; // 1-31, day of month when expense is debited
  isActive: boolean;
  lastDebited?: Date; // Track when this expense was last auto-debited
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShoppingList {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  targetDate?: Date;
  createdAt?: Date;
}

export interface IGlobalItem {
  _id?: string;
  name: string;
  category: ShoppingCategory;
  uom: UOM;
  packageSize?: number;
  packageType?: string;
  brand?: string;
  barcode?: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShoppingItem {
  _id?: string;
  userId: string;
  listId: string; // References IShoppingList._id
  globalItemId: string; // References IGlobalItem._id
  quantity: number;
  cycle: ShoppingCycle;
  isDiabeticFriendly: boolean;
  isActive: boolean;
}

export interface IItemPurchaseHistory {
  _id?: string;
  userId: string;
  globalItemId: string; // References IGlobalItem._id
  transactionId?: string; // References ITransaction._id
  price: number;
  quantity: number;
  purchaseDate: Date;
  store?: string;
  notes?: string;
  createdAt?: Date;
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
  totalWastage: number;
}
