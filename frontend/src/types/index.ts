export type Category = 'Essential' | 'NiceToHave' | 'WorkAI' | 'Startup' | 'Snack' | 'Takeaway';
export type Consumer = 'MeMom' | 'Household' | 'SisterBF';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';
export type TransactionType = 'income' | 'expense';
export type IncomeSource = 'Salary' | 'Sister' | 'SideProject' | 'Other';

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
  createdAt: string;
}

export interface FixedExpense {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface ShoppingItem {
  _id: string;
  userId: string;
  name: string;
  category: ShoppingCategory;
  cycle: ShoppingCycle;
  isDiabeticFriendly: boolean;
  typicalCost: number;
  isActive: boolean;
}

export interface BudgetDashboard {
  totalIncome: number;
  totalSpent: number;
  fixedExpenses: number;
  penalties: number;
  availableBalance: number;
  daysUntilPayday: number;
  currentPenalties: {
    takeaways: number;
    snacks: number;
    total: number;
  };
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
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  penaltyTriggered: boolean;
}
