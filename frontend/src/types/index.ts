export type Category = 'Essential' | 'NiceToHave' | 'WorkAI' | 'Startup' | 'Snack' | 'Takeaway';
export type Consumer = 'MeMom' | 'Household' | 'SisterBF';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';

export interface User {
  _id: string;
  income: number;
  savingsBaseGoal: number;
  penaltySystemEnabled: boolean;
  payday: number;
  sisterSubsidyCap: number;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  category: Category;
  consumer: Consumer;
  isPenaltyTrigger: boolean;
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
  availableToSpend: number;
  savingsGoal: {
    base: number;
    penalties: number;
    total: number;
  };
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
  amount: number;
  description: string;
  category: Category;
  consumer: Consumer;
  date?: string;
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  penaltyTriggered: boolean;
}
