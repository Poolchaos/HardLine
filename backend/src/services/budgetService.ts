import { User } from '../models/User';
import { DebitOrder } from '../models/DebitOrder';
import { Transaction } from '../models/Transaction';
import { BudgetDashboard } from '../types';

interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalSpent: number;
  totalWastage: number;
  fixedExpenses: number;
  savings: number; // income - spent - fixed
  savingsRate: number; // (savings / income) * 100
}

interface SavingsOverview {
  monthlySummaries: MonthlySummary[];
  totalSavingsAllTime: number;
  averageSavings: number;
  averageSavingsRate: number;
  bestMonth: MonthlySummary | null;
  worstMonth: MonthlySummary | null;
}

/**
 * Get complete budget dashboard data
 * Formula: Available = Total Income - Active Debit Orders - Total Spent
 */
export async function getDashboard(
  userId: string,
  month: Date = new Date()
): Promise<BudgetDashboard> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  // Get all transactions for the month
  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  // Calculate total income and expenses
  const totalIncome = transactions
    .filter((txn: any) => txn.type === 'income')
    .reduce((sum: number, txn: any) => sum + txn.amount, 0);

  const totalSpent = transactions
    .filter((txn: any) => txn.type === 'expense')
    .reduce((sum: number, txn: any) => sum + txn.amount, 0);

  // Calculate total wastage
  const totalWastage = transactions
    .filter((txn: any) => txn.type === 'expense' && txn.wastageAmount)
    .reduce((sum: number, txn: any) => sum + (txn.wastageAmount || 0), 0);

  // Get active debit orders
  const debitOrders = await DebitOrder.find({ userId, status: 'active' });
  const totalDebitOrders = debitOrders.reduce((sum: number, order: any) => sum + order.amount, 0);

  // Calculate available balance
  const availableBalance = totalIncome - totalDebitOrders - totalSpent;

  // Calculate days until payday
  const today = new Date();
  const nextPayday = new Date(
    today.getFullYear(),
    today.getMonth() + (today.getDate() >= user.payday ? 1 : 0),
    user.payday
  );
  const daysUntilPayday = Math.ceil(
    (nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    totalIncome,
    totalSpent,
    fixedExpenses: totalDebitOrders,
    availableBalance: Math.max(0, availableBalance),
    daysUntilPayday,
    totalWastage,
  };
}

/**
 * Get monthly savings overview for the last N months
 */
export async function getSavingsOverview(
  userId: string,
  monthsBack: number = 12
): Promise<SavingsOverview> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const monthlySummaries: MonthlySummary[] = [];
  const today = new Date();

  // Calculate for each of the last N months
  for (let i = 0; i < monthsBack; i++) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = targetMonth.toISOString().slice(0, 7); // YYYY-MM

    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

    // Get all transactions for the month
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Calculate totals
    const totalIncome = transactions
      .filter((txn: any) => txn.type === 'income')
      .reduce((sum: number, txn: any) => sum + txn.amount, 0);

    const totalSpent = transactions
      .filter((txn: any) => txn.type === 'expense')
      .reduce((sum: number, txn: any) => sum + txn.amount, 0);

    const totalWastage = transactions
      .filter((txn: any) => txn.type === 'expense' && txn.wastageAmount)
      .reduce((sum: number, txn: any) => sum + (txn.wastageAmount || 0), 0);

    // Get fixed expenses for that month
    const debitOrders = await DebitOrder.find({ userId, status: 'active' });
    const fixedExpenses = debitOrders.reduce((sum: number, order: any) => sum + order.amount, 0);

    const savings = totalIncome - totalSpent - fixedExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    monthlySummaries.push({
      month: monthStr,
      totalIncome,
      totalSpent,
      totalWastage,
      fixedExpenses,
      savings,
      savingsRate,
    });
  }

  // Calculate overall statistics
  const totalSavingsAllTime = monthlySummaries.reduce((sum, m) => sum + m.savings, 0);
  const averageSavings = monthlySummaries.length > 0 ? totalSavingsAllTime / monthlySummaries.length : 0;
  const averageSavingsRate = monthlySummaries.length > 0
    ? monthlySummaries.reduce((sum, m) => sum + m.savingsRate, 0) / monthlySummaries.length
    : 0;

  // Find best and worst months
  const monthsWithIncome = monthlySummaries.filter(m => m.totalIncome > 0);
  const bestMonth = monthsWithIncome.length > 0
    ? monthsWithIncome.reduce((best, m) => m.savingsRate > best.savingsRate ? m : best)
    : null;
  const worstMonth = monthsWithIncome.length > 0
    ? monthsWithIncome.reduce((worst, m) => m.savingsRate < worst.savingsRate ? m : worst)
    : null;

  return {
    monthlySummaries: monthlySummaries.reverse(), // Oldest first
    totalSavingsAllTime,
    averageSavings,
    averageSavingsRate,
    bestMonth,
    worstMonth,
  };
}
