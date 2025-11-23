import { Transaction } from '../models/Transaction';
import { DebitOrder } from '../models/DebitOrder';
import { MonthlyStats, IMonthlyStats, ICategoryBreakdown, IShoppingItemStats } from '../models/MonthlyStats';
import { ShoppingPurchase } from '../models/ShoppingPurchase';
import { ShoppingItem } from '../models/ShoppingItem';
import { GlobalItem } from '../models/GlobalItem';

/**
 * Generate or update monthly stats for a specific user and month
 * Formula: Savings = Total Income - Total Debit Orders - Total Expenses
 */
export async function generateMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<IMonthlyStats> {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  // Get all transactions for the month
  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  // Calculate income and expenses
  const totalIncome = transactions
    .filter((txn) => txn.type === 'income')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const expenseTransactions = transactions.filter((txn) => txn.type === 'expense');
  const totalExpenses = expenseTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  // Calculate category breakdown
  const categoryBreakdown: ICategoryBreakdown = {
    Essential: 0,
    Discretionary: 0,
    WorkAI: 0,
    Startup: 0,
    Food: 0,
    Entertainment: 0,
  };

  expenseTransactions.forEach((txn) => {
    if (txn.category && txn.category in categoryBreakdown) {
      categoryBreakdown[txn.category as keyof ICategoryBreakdown] += txn.amount;
    }
  });

  // Get active debit orders for the month
  const debitOrders = await DebitOrder.find({ userId, status: 'active' });
  const totalDebitOrders = debitOrders.reduce((sum, order) => sum + order.amount, 0);

  // Calculate savings and savings rate
  const savings = totalIncome - totalDebitOrders - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Calculate average daily spending
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const avgDailySpending = totalExpenses / daysInMonth;

  // Calculate shopping stats
  const purchases = await ShoppingPurchase.find({
    userId,
    purchaseDate: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let shoppingStats;
  if (purchases.length > 0) {
    const itemMap = new Map<string, { quantity: number; totalSpent: number }>();

    // Aggregate by item
    for (const purchase of purchases) {
      const item = await ShoppingItem.findById(purchase.shoppingItemId);
      if (item) {
        const globalItem = await GlobalItem.findById(item.globalItemId);
        if (globalItem) {
          const existing = itemMap.get(globalItem.name) || { quantity: 0, totalSpent: 0 };
          itemMap.set(globalItem.name, {
            quantity: existing.quantity + 1,
            totalSpent: existing.totalSpent + purchase.actualCost,
          });
        }
      }
    }

    // Convert to array and calculate averages
    const topItems: IShoppingItemStats[] = Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        totalSpent: data.totalSpent,
        avgPrice: data.totalSpent / data.quantity,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 items by spend

    shoppingStats = {
      totalItems: purchases.length,
      totalSpent: purchases.reduce((sum, p) => sum + p.actualCost, 0),
      uniqueItems: itemMap.size,
      topItems,
    };
  }

  // Upsert monthly stats
  const stats = await MonthlyStats.findOneAndUpdate(
    { userId, year, month },
    {
      userId,
      year,
      month,
      totalIncome,
      totalExpenses,
      totalDebitOrders,
      savings,
      savingsRate: Math.max(0, Math.min(100, savingsRate)),
      categoryBreakdown,
      transactionCount: transactions.length,
      avgDailySpending,
      ...(shoppingStats && { shoppingStats }),
    },
    { upsert: true, new: true }
  );

  return stats;
}

/**
 * Get monthly stats for a specific month, generating if not exists
 */
export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<IMonthlyStats> {
  let stats = await MonthlyStats.findOne({ userId, year, month });

  if (!stats) {
    return await generateMonthlyStats(userId, year, month);
  }

  return stats.toObject() as IMonthlyStats;
}

/**
 * Get stats history for multiple months
 */
export async function getStatsHistory(
  userId: string,
  months: number = 6
): Promise<IMonthlyStats[]> {
  const today = new Date();
  const statsPromises: Promise<IMonthlyStats>[] = [];

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    statsPromises.push(getMonthlyStats(userId, targetDate.getFullYear(), targetDate.getMonth()));
  }

  const stats = await Promise.all(statsPromises);
  return stats.reverse(); // Oldest to newest
}

/**
 * Get year-to-date summary
 */
export async function getYearToDateSummary(userId: string, year: number) {
  const stats = await MonthlyStats.find({
    userId,
    year,
  }).sort({ month: 1 });

  const totalIncome = stats.reduce((sum, s) => sum + s.totalIncome, 0);
  const totalExpenses = stats.reduce((sum, s) => sum + s.totalExpenses, 0);
  const totalDebitOrders = stats.reduce((sum, s) => sum + s.totalDebitOrders, 0);
  const totalSavings = stats.reduce((sum, s) => sum + s.savings, 0);

  const avgSavingsRate = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.savingsRate, 0) / stats.length
    : 0;

  // Aggregate category totals
  const categoryTotals: ICategoryBreakdown = {
    Essential: 0,
    Discretionary: 0,
    WorkAI: 0,
    Startup: 0,
    Food: 0,
    Entertainment: 0,
  };

  stats.forEach((s) => {
    Object.keys(categoryTotals).forEach((category) => {
      const key = category as keyof ICategoryBreakdown;
      categoryTotals[key] += s.categoryBreakdown[key];
    });
  });

  return {
    year,
    monthsCovered: stats.length,
    totalIncome,
    totalExpenses,
    totalDebitOrders,
    totalSavings,
    avgSavingsRate,
    categoryTotals,
    monthlyStats: stats,
  };
}
