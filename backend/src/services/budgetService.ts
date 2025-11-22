import { User } from '../models/User';
import { FixedExpense } from '../models/FixedExpense';
import { Transaction } from '../models/Transaction';
import { calculateMonthlyPenalty, getPenaltyBreakdown } from './penaltyService';
import { BudgetDashboard, SubsidyReport } from '../types';

/**
 * Calculate available to spend
 * Formula: (Income - FixedExpenses) - (BaseSavings + Penalties)
 */
export async function calculateAvailableToSpend(
  userId: string,
  month: Date = new Date()
): Promise<number> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const fixedExpenses = await FixedExpense.find({ userId, isActive: true });
  const totalFixed = fixedExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

  const penalty = await calculateMonthlyPenalty(userId, month);

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const totalSpent = transactions.reduce((sum: number, txn: any) => sum + txn.amount, 0);

  const available = user.income - totalFixed - user.savingsBaseGoal - penalty - totalSpent;

  return Math.max(0, available);
}

/**
 * Get complete budget dashboard data
 */
export async function getDashboard(
  userId: string,
  month: Date = new Date()
): Promise<BudgetDashboard> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const available = await calculateAvailableToSpend(userId, month);
  const penalties = await getPenaltyBreakdown(userId, month);

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
    availableToSpend: available,
    savingsGoal: {
      base: user.savingsBaseGoal,
      penalties: penalties.total,
      total: user.savingsBaseGoal + penalties.total,
    },
    daysUntilPayday,
    currentPenalties: penalties,
  };
}

/**
 * Calculate household subsidy spend
 * Formula: Σ(SisterBF transactions) + (Σ(Household transactions) / 2)
 */
export async function calculateSubsidy(
  userId: string,
  month: Date = new Date()
): Promise<SubsidyReport> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const sisterBFOnly = transactions
    .filter((t: any) => t.consumer === 'SisterBF')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const householdTotal = transactions
    .filter((t: any) => t.consumer === 'Household')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const householdShared = householdTotal / 2;

  const totalSubsidized = sisterBFOnly + householdShared;
  const percentageUsed = user.sisterSubsidyCap > 0
    ? (totalSubsidized / user.sisterSubsidyCap) * 100
    : 0;

  return {
    totalSubsidized,
    cap: user.sisterSubsidyCap,
    percentageUsed: Math.min(100, percentageUsed),
    breakdown: {
      sisterBFOnly,
      householdShared,
    },
  };
}
