import { PriceHistory, IPriceHistory } from '../models/PriceHistory';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingPurchase } from '../models/ShoppingPurchase';
import { GlobalItem } from '../models/GlobalItem';

/**
 * Record a price for a shopping item
 */
export async function recordPrice(
  userId: string,
  shoppingItemId: string,
  price: number,
  source: 'purchase' | 'manual' | 'estimate' = 'manual',
  recordedDate: Date = new Date()
): Promise<IPriceHistory> {
  const priceRecord = new PriceHistory({
    userId,
    shoppingItemId,
    price,
    source,
    recordedDate,
  });

  await priceRecord.save();
  return priceRecord;
}

/**
 * Get price history for a specific item
 */
export async function getPriceHistory(
  userId: string,
  shoppingItemId: string,
  limit: number = 10
): Promise<IPriceHistory[]> {
  return await PriceHistory.find({ userId, shoppingItemId })
    .sort({ recordedDate: -1 })
    .limit(limit);
}

/**
 * Get price trend for an item (up, down, stable)
 */
export async function getPriceTrend(
  userId: string,
  shoppingItemId: string
): Promise<{
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  currentPrice: number | null;
  previousPrice: number | null;
  changePercent: number | null;
  avgPrice: number | null;
}> {
  const history = await PriceHistory.find({ userId, shoppingItemId })
    .sort({ recordedDate: -1 })
    .limit(5);

  if (history.length < 2) {
    return {
      trend: 'insufficient_data',
      currentPrice: history[0]?.price || null,
      previousPrice: null,
      changePercent: null,
      avgPrice: history[0]?.price || null,
    };
  }

  const currentPrice = history[0].price;
  const previousPrice = history[1].price;
  const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
  const avgPrice = history.reduce((sum, h) => sum + h.price, 0) / history.length;

  let trend: 'up' | 'down' | 'stable';
  if (changePercent > 5) {
    trend = 'up';
  } else if (changePercent < -5) {
    trend = 'down';
  } else {
    trend = 'stable';
  }

  return {
    trend,
    currentPrice,
    previousPrice,
    changePercent: Math.round(changePercent * 100) / 100,
    avgPrice: Math.round(avgPrice * 100) / 100,
  };
}

/**
 * Auto-record prices from purchases
 */
export async function recordPricesFromPurchases(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const query: any = { userId };
  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = startDate;
    if (endDate) query.purchaseDate.$lte = endDate;
  }

  const purchases = await ShoppingPurchase.find(query);
  let recordedCount = 0;

  for (const purchase of purchases) {
    // Check if price already recorded for this purchase
    const existing = await PriceHistory.findOne({
      userId,
      shoppingItemId: purchase.shoppingItemId,
      price: purchase.actualCost,
      recordedDate: purchase.purchaseDate,
      source: 'purchase',
    });

    if (!existing) {
      await recordPrice(
        userId,
        purchase.shoppingItemId,
        purchase.actualCost,
        'purchase',
        purchase.purchaseDate
      );
      recordedCount++;
    }
  }

  return recordedCount;
}

/**
 * Get price comparison for all items
 */
export async function getPriceComparison(userId: string): Promise<
  Array<{
    itemId: string;
    itemName: string;
    currentPrice: number;
    typicalCost: number;
    trend: 'up' | 'down' | 'stable' | 'insufficient_data';
    changePercent: number | null;
  }>
> {
  const items = await ShoppingItem.find({ userId, isActive: true });
  const comparisons = [];

  for (const item of items) {
    const trend = await getPriceTrend(userId, item._id!.toString());
    const globalItem = await GlobalItem.findById(item.globalItemId);
    comparisons.push({
      itemId: item._id!.toString(),
      itemName: globalItem?.name || 'Unknown',
      currentPrice: trend.currentPrice || 0,
      typicalCost: trend.currentPrice || 0,
      trend: trend.trend,
      changePercent: trend.changePercent,
    });
  }

  return comparisons;
}
