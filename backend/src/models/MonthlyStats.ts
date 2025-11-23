import mongoose from 'mongoose';

export interface ICategoryBreakdown {
  Essential: number;
  Discretionary: number;
  WorkAI: number;
  Startup: number;
  Food: number;
  Entertainment: number;
}

export interface IShoppingItemStats {
  name: string;
  quantity: number;
  totalSpent: number;
  avgPrice: number;
}

export interface IMonthlyStats {
  _id?: string;
  userId: string;
  year: number;
  month: number; // 0-11 (JavaScript month)
  totalIncome: number;
  totalExpenses: number;
  totalDebitOrders: number;
  savings: number;
  savingsRate: number; // Percentage
  categoryBreakdown: ICategoryBreakdown;
  transactionCount: number;
  avgDailySpending: number;
  shoppingStats?: {
    totalItems: number;
    totalSpent: number;
    uniqueItems: number;
    topItems: IShoppingItemStats[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const categoryBreakdownSchema = new mongoose.Schema<ICategoryBreakdown>(
  {
    Essential: { type: Number, default: 0 },
    Discretionary: { type: Number, default: 0 },
    WorkAI: { type: Number, default: 0 },
    Startup: { type: Number, default: 0 },
    Food: { type: Number, default: 0 },
    Entertainment: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlyStatsSchema = new mongoose.Schema<IMonthlyStats>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 0,
      max: 11,
    },
    totalIncome: {
      type: Number,
      required: true,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDebitOrders: {
      type: Number,
      required: true,
      default: 0,
    },
    savings: {
      type: Number,
      required: true,
      default: 0,
    },
    savingsRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    categoryBreakdown: {
      type: categoryBreakdownSchema,
      required: true,
      default: () => ({
        Essential: 0,
        Discretionary: 0,
        WorkAI: 0,
        Startup: 0,
        Food: 0,
        Entertainment: 0,
      }),
    },
    transactionCount: {
      type: Number,
      required: true,
      default: 0,
    },
    avgDailySpending: {
      type: Number,
      required: true,
      default: 0,
    },
    shoppingStats: {
      type: {
        totalItems: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        uniqueItems: { type: Number, default: 0 },
        topItems: [
          {
            name: String,
            quantity: Number,
            totalSpent: Number,
            avgPrice: Number,
          },
        ],
      },
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user/month combination
monthlyStatsSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export const MonthlyStats = mongoose.model<IMonthlyStats>('MonthlyStats', monthlyStatsSchema);
