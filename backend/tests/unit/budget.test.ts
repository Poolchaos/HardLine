import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import { FixedExpense } from '../../src/models/FixedExpense';
import { getDashboard } from '../../src/services/budgetService';

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
  await FixedExpense.deleteMany({});
});

describe('BudgetService', () => {
  const createTestUser = async () => {
    const user = new User({
      email: 'test@hardline.com',
      passwordHash: '$2a$10$dummyhashfortest',
      name: 'Test User',
      payday: 25,
    });
    await user.save();
    return user;
  };

  describe('getDashboard', () => {
    it('should calculate available balance with income and expenses', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      // Add income transactions
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Add expense transactions
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: testDate,
        amount: 5000,
        description: 'Groceries',
        category: 'Food',
      });

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.totalIncome).toBe(20000);
      expect(dashboard.totalSpent).toBe(5000);
      expect(dashboard.availableBalance).toBe(15000);
    });

    it('should include fixed expenses in balance calculation', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      // Add income
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      // Add fixed expense
      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        isActive: true,
      });

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.fixedExpenses).toBe(8500);
      expect(dashboard.availableBalance).toBe(11500); // 20000 - 8500
    });

    it('should only include active fixed expenses', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        isActive: true,
      });

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Cancelled Gym',
        amount: 500,
        isActive: false,
      });

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.fixedExpenses).toBe(8500); // Only active
      expect(dashboard.availableBalance).toBe(11500);
    });

    it('should handle multiple income sources', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 3000,
        description: 'Sister rent',
        incomeSource: 'Sister',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 1500,
        description: 'Freelance project',
        incomeSource: 'SideProject',
      });

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.totalIncome).toBe(24500);
    });

    it('should handle multiple expense categories', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'Salary',
        incomeSource: 'Salary',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: testDate,
        amount: 2000,
        description: 'Groceries',
        category: 'Food',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: testDate,
        amount: 500,
        description: 'Electricity',
        category: 'Essential',
      });

      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: testDate,
        amount: 300,
        description: 'Netflix',
        category: 'Entertainment',
      });

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.totalSpent).toBe(2800);
      expect(dashboard.availableBalance).toBe(17200);
    });

    it('should return dashboard structure with all required fields', async () => {
      const user = await createTestUser();
      const dashboard = await getDashboard(user._id!.toString());

      expect(dashboard).toHaveProperty('totalIncome');
      expect(dashboard).toHaveProperty('totalSpent');
      expect(dashboard).toHaveProperty('fixedExpenses');
      expect(dashboard).toHaveProperty('availableBalance');
      expect(dashboard).toHaveProperty('daysUntilPayday');
    });

    it('should calculate days until payday correctly', async () => {
      const user = await createTestUser();
      const dashboard = await getDashboard(user._id!.toString());

      expect(dashboard.daysUntilPayday).toBeGreaterThan(0);
      expect(dashboard.daysUntilPayday).toBeLessThanOrEqual(31);
    });

    it('should handle zero income and expenses', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      const dashboard = await getDashboard(user._id!.toString(), testDate);

      expect(dashboard.totalIncome).toBe(0);
      expect(dashboard.totalSpent).toBe(0);
      expect(dashboard.fixedExpenses).toBe(0);
      expect(dashboard.availableBalance).toBe(0);
    });

    it('should filter transactions by month correctly', async () => {
      const user = await createTestUser();
      const novemberDate = new Date(2025, 10, 15); // November
      const decemberDate = new Date(2025, 11, 10); // December

      // November income
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: novemberDate,
        amount: 20000,
        description: 'November Salary',
        incomeSource: 'Salary',
      });

      // December income
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'income',
        date: decemberDate,
        amount: 22000,
        description: 'December Salary',
        incomeSource: 'Salary',
      });

      const novemberDashboard = await getDashboard(user._id!.toString(), novemberDate);
      const decemberDashboard = await getDashboard(user._id!.toString(), decemberDate);

      expect(novemberDashboard.totalIncome).toBe(20000);
      expect(decemberDashboard.totalIncome).toBe(22000);
    });

    it('should isolate data between different users', async () => {
      // Create two users
      const user1 = await createTestUser();
      
      const user2 = new User({
        email: 'user2@hardline.com',
        passwordHash: '$2a$10$dummyhashfortest2',
        name: 'Test User 2',
        payday: 1,
      });
      await user2.save();

      const testDate = new Date(2025, 10, 15);

      // User 1 income
      await Transaction.create({
        userId: user1._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 20000,
        description: 'User 1 Salary',
        incomeSource: 'Salary',
      });

      // User 2 income
      await Transaction.create({
        userId: user2._id!.toString(),
        type: 'income',
        date: testDate,
        amount: 15000,
        description: 'User 2 Salary',
        incomeSource: 'Salary',
      });

      const dashboard1 = await getDashboard(user1._id!.toString(), testDate);
      const dashboard2 = await getDashboard(user2._id!.toString(), testDate);

      expect(dashboard1.totalIncome).toBe(20000);
      expect(dashboard2.totalIncome).toBe(15000);
    });
  });
});
