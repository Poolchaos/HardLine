import { User } from '../models/User';
import { FixedExpense } from '../models/FixedExpense';
import { Transaction } from '../models/Transaction';
import { BudgetDashboard } from '../types';

/**
 * Get complete budget dashboard data
 * Formula: Available = Total Income - Fixed Expenses - Total Spent
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

  // Get fixed expenses
  const fixedExpenses = await FixedExpense.find({ userId, isActive: true });
  const totalFixed = fixedExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

  // Calculate available balance
  const availableBalance = totalIncome - totalFixed - totalSpent;

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
    fixedExpenses: totalFixed,
    availableBalance: Math.max(0, availableBalance),
    daysUntilPayday,
  };
}
