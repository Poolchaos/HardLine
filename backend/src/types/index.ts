export type Category = 'Essential' | 'NiceToHave' | 'WorkAI' | 'Startup' | 'Snack' | 'Takeaway';
export type Consumer = 'MeMom' | 'Household' | 'SisterBF';
export type ShoppingCycle = 'MonthStart' | 'MidMonth' | 'Both';
export type ShoppingCategory = 'Cleaning' | 'Pantry' | 'Fridge';

export interface IUser {
  _id?: string;
  income: number;
  savingsBaseGoal: number;
  penaltySystemEnabled: boolean;
  payday: number; // 1-31
  sisterSubsidyCap: number;
  createdAt?: Date;
}

export interface ITransaction {
  _id?: string;
  userId: string;
  date: Date;
  amount: number;
  description: string;
  category: Category;
  consumer: Consumer;
  isPenaltyTrigger: boolean;
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
