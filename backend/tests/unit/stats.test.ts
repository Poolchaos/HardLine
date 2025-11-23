import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import { DebitOrder } from '../../src/models/DebitOrder';
import { MonthlyStats } from '../../src/models/MonthlyStats';
import { ShoppingItem } from '../../src/models/ShoppingItem';
import { ShoppingPurchase } from '../../src/models/ShoppingPurchase';
import {
  generateMonthlyStats,
  getMonthlyStats,
  getStatsHistory,
  getYearToDateSummary,
} from '../../src/services/statsService';

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
  await Transaction.deleteMany({});
  await DebitOrder.deleteMany({});
  await MonthlyStats.deleteMany({});
  await ShoppingItem.deleteMany({});
  await ShoppingPurchase.deleteMany({});
});

describe('MonthlyStats Service', () => {
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

  describe('generateMonthlyStats', () => {
    it('should generate stats for a month with transactions', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10; // November

      // Create income transactions
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Create expense transactions
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: new Date(2025, 10, 10),
        amount: 2000,
        description: 'Groceries',
        category: 'Food',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: new Date(2025, 10, 15),
        amount: 500,
        description: 'Movie night',
        category: 'Entertainment',
      });

      // Create active debit order
      await DebitOrder.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDate: 1,
        priority: 'critical',
        status: 'active',
      });

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.totalIncome).toBe(20000);
      expect(stats.totalExpenses).toBe(2500);
      expect(stats.totalDebitOrders).toBe(8500);
      expect(stats.savings).toBe(9000); // 20000 - 8500 - 2500
      expect(stats.savingsRate).toBeCloseTo(45, 0); // 45%
      expect(stats.categoryBreakdown.Food).toBe(2000);
      expect(stats.categoryBreakdown.Entertainment).toBe(500);
      expect(stats.transactionCount).toBe(3);
      expect(stats.avgDailySpending).toBeGreaterThan(0);
    });

    it('should handle months with no transactions', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.totalIncome).toBe(0);
      expect(stats.totalExpenses).toBe(0);
      expect(stats.savings).toBe(0);
      expect(stats.savingsRate).toBe(0);
      expect(stats.transactionCount).toBe(0);
    });

    it('should only include active debit orders', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      await DebitOrder.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDate: 1,
        priority: 'critical',
        status: 'active',
      });

      await DebitOrder.create({
        userId: user._id!.toString(),
        name: 'Cancelled Gym',
        amount: 500,
        debitDate: 15,
        priority: 'optional',
        status: 'cancelled',
      });

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.totalDebitOrders).toBe(8500); // Only active
    });

    it('should calculate savings rate correctly', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 10000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: new Date(2025, 10, 10),
        amount: 3000,
        description: 'Expenses',
        category: 'Essential',
      });

      await DebitOrder.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 5000,
        debitDate: 1,
        priority: 'critical',
        status: 'active',
      });

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.savings).toBe(2000); // 10000 - 5000 - 3000
      expect(stats.savingsRate).toBe(20); // 20%
    });

    it('should update existing stats when regenerated', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      // Initial transaction
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 10000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      const initialStats = await generateMonthlyStats(user._id!.toString(), year, month);
      expect(initialStats.totalIncome).toBe(10000);

      // Add more income
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 15),
        amount: 5000,
        description: 'Bonus',
        incomeSource: 'Salary',
      });

      const updatedStats = await generateMonthlyStats(user._id!.toString(), year, month);
      expect(updatedStats.totalIncome).toBe(15000);
      expect(updatedStats._id!.toString()).toBe(initialStats._id!.toString()); // Same document
    });
  });

  describe('getMonthlyStats', () => {
    it('should retrieve existing stats', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Generate stats first
      await generateMonthlyStats(user._id!.toString(), year, month);

      // Retrieve them
      const stats = await getMonthlyStats(user._id!.toString(), year, month);
      expect(stats.totalIncome).toBe(20000);
    });

    it('should generate stats if they do not exist', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Get stats without generating first
      const stats = await getMonthlyStats(user._id!.toString(), year, month);
      expect(stats.totalIncome).toBe(20000);
    });
  });

  describe('getStatsHistory', () => {
    it('should get stats for multiple months', async () => {
      const user = await createTestUser();

      // Create transactions for 3 months
      for (let i = 0; i < 3; i++) {
        await Transaction.create({
          userId: user._id!.toString(),
          type: 'income',
          date: new Date(2025, 10 - i, 5),
          amount: 10000 + i * 1000,
          description: 'Salary',
          incomeSource: 'Salary',
        });
      }

      const history = await getStatsHistory(user._id!.toString(), 3);

      expect(history).toHaveLength(3);
      expect(history[0].month).toBe(8); // September (oldest)
      expect(history[2].month).toBe(10); // November (newest)
    });
  });

  describe('getYearToDateSummary', () => {
    it('should calculate year-to-date totals', async () => {
      const user = await createTestUser();
      const year = 2025;

      // Create transactions for multiple months
      await Transaction.create([
        {
          userId: user._id!.toString(),
          type: 'income',
          date: new Date(2025, 9, 5),
          amount: 20000,
          description: 'Salary',
          incomeSource: 'Salary',
        },
        {
          userId: user._id!.toString(),
          type: 'expense',
          date: new Date(2025, 9, 10),
          amount: 5000,
          description: 'Expenses',
          category: 'Food',
        },
        {
          userId: user._id!.toString(),
          type: 'income',
          date: new Date(2025, 10, 5),
          amount: 20000,
          description: 'Salary',
          incomeSource: 'Salary',
        },
        {
          userId: user._id!.toString(),
          type: 'expense',
          date: new Date(2025, 10, 10),
          amount: 3000,
          description: 'Expenses',
          category: 'Entertainment',
        },
      ]);

      await DebitOrder.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDate: 1,
        priority: 'critical',
        status: 'active',
      });

      // Generate stats for both months
      await generateMonthlyStats(user._id!.toString(), year, 9);
      await generateMonthlyStats(user._id!.toString(), year, 10);

      const summary = await getYearToDateSummary(user._id!.toString(), year);

      expect(summary.monthsCovered).toBe(2);
      expect(summary.totalIncome).toBe(40000);
      expect(summary.totalExpenses).toBe(8000);
      expect(summary.totalDebitOrders).toBe(17000); // 8500 * 2 months
      expect(summary.totalSavings).toBe(15000); // 40000 - 17000 - 8000
      expect(summary.categoryTotals.Food).toBe(5000);
      expect(summary.categoryTotals.Entertainment).toBe(3000);
    });

    it('should handle year with no data', async () => {
      const user = await createTestUser();
      const year = 2025;

      const summary = await getYearToDateSummary(user._id!.toString(), year);

      expect(summary.monthsCovered).toBe(0);
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
    });
  });

  describe('Category Breakdown', () => {
    it('should correctly categorize all expense types', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: new Date(2025, 10, 5),
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Create expenses in each category
      const categories = ['Essential', 'Discretionary', 'WorkAI', 'Startup', 'Food', 'Entertainment'];
      for (let i = 0; i < categories.length; i++) {
        await Transaction.create({
          userId: user._id!.toString(),
          type: 'expense',
          date: new Date(2025, 10, 10 + i),
          amount: (i + 1) * 100,
          description: `${categories[i]} expense`,
          category: categories[i],
        });
      }

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.categoryBreakdown.Essential).toBe(100);
      expect(stats.categoryBreakdown.Discretionary).toBe(200);
      expect(stats.categoryBreakdown.WorkAI).toBe(300);
      expect(stats.categoryBreakdown.Startup).toBe(400);
      expect(stats.categoryBreakdown.Food).toBe(500);
      expect(stats.categoryBreakdown.Entertainment).toBe(600);
    });
  });

  describe('Shopping Stats', () => {
    it('should calculate shopping item quantities and totals', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      // Create shopping items
      const milkItem = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Milk',
        category: 'Fridge',
        cycle: 'Both',
        typicalCost: 50,
        isActive: true,
      });

      const breadItem = await ShoppingItem.create({
        userId: user._id!.toString(),
        name: 'Bread',
        category: 'Pantry',
        cycle: 'MonthStart',
        typicalCost: 25,
        isActive: true,
      });

      // Create purchases
      await ShoppingPurchase.create([
        {
          userId: user._id!.toString(),
          shoppingItemId: milkItem._id!.toString(),
          transactionId: 'txn1',
          cycle: 'Both',
          actualCost: 52,
          purchaseDate: new Date(2025, 10, 5),
        },
        {
          userId: user._id!.toString(),
          shoppingItemId: milkItem._id!.toString(),
          transactionId: 'txn2',
          cycle: 'Both',
          actualCost: 48,
          purchaseDate: new Date(2025, 10, 15),
        },
        {
          userId: user._id!.toString(),
          shoppingItemId: breadItem._id!.toString(),
          transactionId: 'txn3',
          cycle: 'MonthStart',
          actualCost: 24,
          purchaseDate: new Date(2025, 10, 6),
        },
      ]);

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.shoppingStats).toBeDefined();
      expect(stats.shoppingStats!.totalItems).toBe(3);
      expect(stats.shoppingStats!.totalSpent).toBe(124); // 52 + 48 + 24
      expect(stats.shoppingStats!.uniqueItems).toBe(2); // Milk and Bread
      expect(stats.shoppingStats!.topItems).toHaveLength(2);

      // Milk should be first (higher total spend)
      expect(stats.shoppingStats!.topItems[0].name).toBe('Milk');
      expect(stats.shoppingStats!.topItems[0].quantity).toBe(2);
      expect(stats.shoppingStats!.topItems[0].totalSpent).toBe(100);
      expect(stats.shoppingStats!.topItems[0].avgPrice).toBe(50);

      // Bread second
      expect(stats.shoppingStats!.topItems[1].name).toBe('Bread');
      expect(stats.shoppingStats!.topItems[1].quantity).toBe(1);
      expect(stats.shoppingStats!.topItems[1].totalSpent).toBe(24);
    });

    it('should handle months with no shopping purchases', async () => {
      const user = await createTestUser();
      const year = 2025;
      const month = 10;

      const stats = await generateMonthlyStats(user._id!.toString(), year, month);

      expect(stats.shoppingStats).toBeUndefined();
    });
  });
});
