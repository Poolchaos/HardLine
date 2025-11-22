import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

const PENALTY_AMOUNT = 500;
const SNACK_LIMIT = 2;

/**
 * Calculate total penalty for a given month
 * Rule 1: Every takeaway = R500
 * Rule 2: Snacks > 2 = R500 per extra snack
 */
export async function calculateMonthlyPenalty(
  userId: string,
  month: Date
): Promise<number> {
  const user = await User.findById(userId);
  if (!user || !user.penaltySystemEnabled) {
    return 0;
  }

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let penalty = 0;

  // Rule 1: Every takeaway = R500
  const takeaways = transactions.filter((t: any) => t.category === 'Takeaway');
  penalty += takeaways.length * PENALTY_AMOUNT;

  // Rule 2: Snacks > 2 = R500 per extra
  const snacks = transactions.filter((t: any) => t.category === 'Snack');
  if (snacks.length > SNACK_LIMIT) {
    penalty += (snacks.length - SNACK_LIMIT) * PENALTY_AMOUNT;
  }

  return penalty;
}

/**
 * Get penalty breakdown for display
 */
export async function getPenaltyBreakdown(
  userId: string,
  month: Date
): Promise<{ takeaways: number; snacks: number; total: number }> {
  const user = await User.findById(userId);
  if (!user || !user.penaltySystemEnabled) {
    return { takeaways: 0, snacks: 0, total: 0 };
  }

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const takeawayCount = transactions.filter((t: any) => t.category === 'Takeaway').length;
  const snackCount = transactions.filter((t: any) => t.category === 'Snack').length;

  let takeawayPenalty = takeawayCount * PENALTY_AMOUNT;
  let snackPenalty = 0;

  if (snackCount > SNACK_LIMIT) {
    snackPenalty = (snackCount - SNACK_LIMIT) * PENALTY_AMOUNT;
  }

  return {
    takeaways: takeawayPenalty,
    snacks: snackPenalty,
    total: takeawayPenalty + snackPenalty,
  };
}

/**
 * Check if adding a transaction would trigger a penalty
 */
export async function checkPenaltyTrigger(
  userId: string,
  category: string,
  date: Date
): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user || !user.penaltySystemEnabled) {
    return false;
  }

  // Takeaways always trigger penalty
  if (category === 'Takeaway') {
    return true;
  }

  // Snacks trigger penalty if over limit
  if (category === 'Snack') {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const snackCount = await Transaction.countDocuments({
      userId,
      category: 'Snack',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    return snackCount >= SNACK_LIMIT;
  }

  return false;
}
