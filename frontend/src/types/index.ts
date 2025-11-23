export type Category = 'Essential' | 'NiceToHave' | 'WorkAI' | 'Startup' | 'Snack' | 'Takeaway';
export type Consumer = 'MeMom' | 'Household' | 'SisterBF';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';
export type UOM = 'L' | 'ml' | 'kg' | 'g' | 'units' | 'pack' | 'dozen' | 'box' | 'bag' | 'bottle' | 'can';
export type TransactionType = 'income' | 'expense';
export type IncomeSource = 'Salary' | 'Other';
export type WastageType = 'DeliveryFee' | 'Tip' | 'AppFee' | 'ServiceCharge' | 'Other';

export interface User {
  _id: string;
  penaltySystemEnabled: boolean;
  payday: number;
  sisterSubsidyCap: number;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  type: TransactionType;
  date: string;
  amount: number;
  description: string;
  // For expense transactions
  category?: Category;
  consumer?: Consumer;
  isPenaltyTrigger?: boolean;
  // For income transactions
  incomeSource?: IncomeSource;
  // Wastage tracking
  wastageAmount?: number;
  wastageType?: WastageType;
  wastageNotes?: string;
  createdAt: string;
}

export interface FixedExpense {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface ShoppingList {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  targetDate?: string;
  createdAt: string;
}

export interface GlobalItem {
  _id: string;
  name: string;
  category: ShoppingCategory;
  uom: UOM;
  packageSize?: number;
  packageType?: string;
  brand?: string;
  barcode?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  _id: string;
  userId: string;
  listId: string;
  globalItemId: string;
  quantity: number;
  cycle: ShoppingCycle;
  isDiabeticFriendly: boolean;
  isActive: boolean;
  globalItem?: GlobalItem | null;
}

export interface ItemPurchaseHistory {
  _id: string;
  userId: string;
  globalItemId: string;
  transactionId?: string;
  price: number;
  quantity: number;
  purchaseDate: string;
  store?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseStats {
  totalPurchases: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  lastPurchaseDate: string | null;
  lastPrice: number;
}

export interface BudgetDashboard {
  totalIncome: number;
  totalSpent: number;
  fixedExpenses: number;
  availableBalance: number;
  daysUntilPayday: number;
  totalWastage: number;
}

export interface SubsidyReport {
  totalSubsidized: number;
  cap: number;
  percentageUsed: number;
  breakdown: {
    sisterBFOnly: number;
    householdShared: number;
  };
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  description: string;
  date?: string;
  // For expense transactions
  category?: Category;
  consumer?: Consumer;
  // For income transactions
  incomeSource?: IncomeSource;
  // Wastage tracking
  wastageAmount?: number;
  wastageType?: WastageType;
  wastageNotes?: string;
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  penaltyTriggered: boolean;
}
