import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { ShoppingItem } from '../../src/models/ShoppingItem';
import { ShoppingTemplate } from '../../src/models/ShoppingTemplate';
import { PriceHistory } from '../../src/models/PriceHistory';
import { ShoppingPurchase } from '../../src/models/ShoppingPurchase';
import {
  recordPrice,
  getPriceHistory,
  getPriceTrend,
  recordPricesFromPurchases,
  getPriceComparison,
} from '../../src/services/priceService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await ShoppingItem.deleteMany({});
  await ShoppingTemplate.deleteMany({});
  await PriceHistory.deleteMany({});
  await ShoppingPurchase.deleteMany({});
});

describe('Shopping Templates & Price Tracking', () => {
  const createTestUser = async () => {
    const user = new User({
      email: 'test@hardline.com',
      passwordHash: 'hash123',
      name: 'Test User',
      payday: 25,
    });
    await user.save();
    return user;
  };

  describe('Shopping Templates', () => {
    it('should create a template with items', async () => {
      const user = await createTestUser();

      const milk = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const bread = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Bread',
        category: 'Pantry',
        cycle: 'MonthStart',
        typicalCost: 25,
      });

      const template = await ShoppingTemplate.create({
        userId: user._id!.toString(),
        name: 'Weekly Essentials',
        description: 'Basic weekly shopping',
        items: [
          { shoppingItemId: milk._id!.toString(), quantity: 2 },
          { shoppingItemId: bread._id!.toString(), quantity: 1 },
        ],
        isActive: true,
      });

      expect(template.name).toBe('Weekly Essentials');
      expect(template.items).toHaveLength(2);
      expect(template.items[0].quantity).toBe(2);
    });

    it('should enforce unique template names per user', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await ShoppingTemplate.create({
        userId: user._id!.toString(),
        name: 'My Template',
        items: [{ shoppingItemId: item._id!.toString(), quantity: 1 }],
      });

      await expect(
        ShoppingTemplate.create({
          userId: user._id!.toString(),
          name: 'My Template',
          items: [{ shoppingItemId: item._id!.toString(), quantity: 1 }],
        })
      ).rejects.toThrow();
    });

    it('should allow same template name for different users', async () => {
      const user1 = await createTestUser();
      const user2 = await User.create({
        email: 'user2@example.com',
        passwordHash: 'hash',
        name: 'User 2',
        payday: 25,
      });

      const item1 = await ShoppingItem.create({
        userId: user1._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const item2 = await ShoppingItem.create({
        userId: user2._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const template1 = await ShoppingTemplate.create({
        userId: user1._id!.toString(),
        name: 'My Template',
        items: [{ shoppingItemId: item1._id!.toString(), quantity: 1 }],
      });

      const template2 = await ShoppingTemplate.create({
        userId: user2._id!.toString(),
        name: 'My Template',
        items: [{ shoppingItemId: item2._id!.toString(), quantity: 1 }],
      });

      expect(template1.name).toBe(template2.name);
      expect(template1.userId).not.toBe(template2.userId);
    });

    it('should require at least one item in template', async () => {
      const user = await createTestUser();

      await expect(
        ShoppingTemplate.create({
          userId: user._id!.toString(),
          name: 'Empty Template',
          items: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('Price History', () => {
    it('should record a price for an item', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const priceRecord = await recordPrice(user._id!.toString(), item._id!.toString(), 52);

      expect(priceRecord.price).toBe(52);
      expect(priceRecord.source).toBe('manual');
    });

    it('should get price history for an item', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      // Record multiple prices
      await recordPrice(user._id!.toString(), item._id!.toString(), 48, 'purchase', new Date('2025-10-01'));
      await recordPrice(user._id!.toString(), item._id!.toString(), 50, 'purchase', new Date('2025-10-15'));
      await recordPrice(user._id!.toString(), item._id!.toString(), 52, 'purchase', new Date('2025-11-01'));

      const history = await getPriceHistory(user._id!.toString(), item._id!.toString());

      expect(history).toHaveLength(3);
      expect(history[0].price).toBe(52); // Most recent first
      expect(history[2].price).toBe(48); // Oldest last
    });

    it('should limit price history results', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      // Record 5 prices
      for (let i = 1; i <= 5; i++) {
        await recordPrice(user._id!.toString(), item._id!.toString(), 50 + i);
      }

      const history = await getPriceHistory(user._id!.toString(), item._id!.toString(), 3);

      expect(history).toHaveLength(3);
    });
  });

  describe('Price Trends', () => {
    it('should detect upward price trend', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await recordPrice(user._id!.toString(), item._id!.toString(), 45, 'purchase', new Date('2025-10-01'));
      await recordPrice(user._id!.toString(), item._id!.toString(), 55, 'purchase', new Date('2025-11-01'));

      const trend = await getPriceTrend(user._id!.toString(), item._id!.toString());

      expect(trend.trend).toBe('up');
      expect(trend.currentPrice).toBe(55);
      expect(trend.previousPrice).toBe(45);
      expect(trend.changePercent).toBeGreaterThan(5);
    });

    it('should detect downward price trend', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await recordPrice(user._id!.toString(), item._id!.toString(), 55, 'purchase', new Date('2025-10-01'));
      await recordPrice(user._id!.toString(), item._id!.toString(), 45, 'purchase', new Date('2025-11-01'));

      const trend = await getPriceTrend(user._id!.toString(), item._id!.toString());

      expect(trend.trend).toBe('down');
      expect(trend.changePercent).toBeLessThan(-5);
    });

    it('should detect stable price trend', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await recordPrice(user._id!.toString(), item._id!.toString(), 50);
      await recordPrice(user._id!.toString(), item._id!.toString(), 51);

      const trend = await getPriceTrend(user._id!.toString(), item._id!.toString());

      expect(trend.trend).toBe('stable');
    });

    it('should handle insufficient data', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const trend = await getPriceTrend(user._id!.toString(), item._id!.toString());

      expect(trend.trend).toBe('insufficient_data');
      expect(trend.currentPrice).toBeNull();
    });

    it('should calculate average price', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await recordPrice(user._id!.toString(), item._id!.toString(), 45);
      await recordPrice(user._id!.toString(), item._id!.toString(), 50);
      await recordPrice(user._id!.toString(), item._id!.toString(), 55);

      const trend = await getPriceTrend(user._id!.toString(), item._id!.toString());

      expect(trend.avgPrice).toBe(50);
    });
  });

  describe('Auto-record from Purchases', () => {
    it('should sync prices from purchases', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await ShoppingPurchase.create([
        {
          userId: user._id!.toString(),
          shoppingItemId: item._id!.toString(),
          transactionId: 'txn1',
          cycle: 'Both',
          actualCost: 48,
          purchaseDate: new Date('2025-10-01'),
        },
        {
          userId: user._id!.toString(),
          shoppingItemId: item._id!.toString(),
          transactionId: 'txn2',
          cycle: 'Both',
          actualCost: 52,
          purchaseDate: new Date('2025-11-01'),
        },
      ]);

      const recordedCount = await recordPricesFromPurchases(user._id!.toString());

      expect(recordedCount).toBe(2);

      const history = await getPriceHistory(user._id!.toString(), item._id!.toString());
      expect(history).toHaveLength(2);
      expect(history.every((h) => h.source === 'purchase')).toBe(true);
    });

    it('should not duplicate price records', async () => {
      const user = await createTestUser();

      const item = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      await ShoppingPurchase.create({
        userId: user._id!.toString(),
        shoppingItemId: item._id!.toString(),
        transactionId: 'txn1',
        cycle: 'Both',
        actualCost: 48,
        purchaseDate: new Date('2025-10-01'),
      });

      // Sync twice
      await recordPricesFromPurchases(user._id!.toString());
      const secondSync = await recordPricesFromPurchases(user._id!.toString());

      expect(secondSync).toBe(0); // No new records

      const history = await getPriceHistory(user._id!.toString(), item._id!.toString());
      expect(history).toHaveLength(1);
    });
  });

  describe('Price Comparison', () => {
    it('should get price comparison for all items', async () => {
      const user = await createTestUser();

      const milk = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
      });

      const bread = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Bread',
        category: 'Pantry',
        cycle: 'MonthStart',
        typicalCost: 25,
      });

      // Record price for milk (went up)
      await recordPrice(user._id!.toString(), milk._id!.toString(), 45);
      await recordPrice(user._id!.toString(), milk._id!.toString(), 55);

      const comparison = await getPriceComparison(user._id!.toString());

      expect(comparison).toHaveLength(2);
      
      const milkComparison = comparison.find((c) => c.itemName === 'Milk');
      expect(milkComparison?.trend).toBe('up');
      expect(milkComparison?.currentPrice).toBe(55);

      const breadComparison = comparison.find((c) => c.itemName === 'Bread');
      expect(breadComparison?.trend).toBe('insufficient_data');
      expect(breadComparison?.currentPrice).toBe(25); // Falls back to typicalCost
    });
  });
});
