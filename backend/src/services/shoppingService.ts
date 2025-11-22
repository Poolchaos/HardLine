import { User } from '../models/User';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingCycle } from '../types';

/**
 * Determine current shopping cycle based on payday
 * MonthStart: Payday to Payday+13 days (Big shop: Cleaning + Groceries)
 * MidMonth: Payday+14 to end of month (Top-up: Fresh produce)
 */
export function getCurrentShoppingCycle(payday: number, currentDate: Date = new Date()): ShoppingCycle {
  const currentDay = currentDate.getDate();
  const midMonthDay = payday + 14;

  // Handle month wraparound
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  if (payday <= currentDay && currentDay < Math.min(midMonthDay, daysInMonth + 1)) {
    return 'MonthStart';
  } else {
    return 'MidMonth';
  }
}

/**
 * Get active shopping list for current cycle
 */
export async function getActiveShoppingList(userId: string): Promise<any[]> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const cycle = getCurrentShoppingCycle(user.payday);

  const items = await ShoppingItem.find({
    userId,
    isActive: true,
    $or: [
      { cycle: cycle },
      { cycle: 'Both' },
    ],
  });

  return items;
}
