import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import { FixedExpense } from '../../src/models/FixedExpense';
import { calculateAvailableToSpend, getDashboard, calculateSubsidy } from '../../src/services/budgetService';

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
      income: 20000,
      savingsBaseGoal: 5000,
      penaltySystemEnabled: true,
      payday: 25,
      sisterSubsidyCap: 2000,
    });
    await user.save();
    return user;
  };

  describe('calculateAvailableToSpend', () => {
    it('should calculate available spend correctly with no expenses', async () => {
      const user = await createTestUser();
      const available = await calculateAvailableToSpend(user._id!.toString());

      // Income 20000 - BaseSavings 5000 = 15000
      expect(available).toBe(15000);
    });

    it('should subtract fixed expenses from available spend', async () => {
      const user = await createTestUser();

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Hosting',
        amount: 500,
        isActive: true,
      });

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Medical',
        amount: 1000,
        isActive: true,
      });

      const available = await calculateAvailableToSpend(user._id!.toString());

      // Income 20000 - Fixed 1500 - Savings 5000 = 13500
      expect(available).toBe(13500);
    });

    it('should subtract penalties from available spend', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 50,
        description: 'McDonalds',
        category: 'Takeaway',
        consumer: 'MeMom',
        isPenaltyTrigger: true,
      });

      const available = await calculateAvailableToSpend(user._id!.toString(), testDate);

      // Income 20000 - Savings 5000 - Penalty 500 - Spent 50 = 14450
      expect(available).toBe(14450);
    });

    it('should subtract actual spend from available', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 500,
        description: 'Groceries',
        category: 'Essential',
        consumer: 'MeMom',
        isPenaltyTrigger: false,
      });

      const available = await calculateAvailableToSpend(user._id!.toString(), testDate);

      // Income 20000 - Savings 5000 - Spent 500 = 14500
      expect(available).toBe(14500);
    });

    it('should not go negative', async () => {
      const user = await createTestUser();
      user.income = 1000; // Very low income
      await user.save();

      const available = await calculateAvailableToSpend(user._id!.toString());

      expect(available).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDashboard', () => {
    it('should return complete dashboard data', async () => {
      const user = await createTestUser();
      const dashboard = await getDashboard(user._id!.toString());

      expect(dashboard).toHaveProperty('availableToSpend');
      expect(dashboard).toHaveProperty('savingsGoal');
      expect(dashboard.savingsGoal).toHaveProperty('base');
      expect(dashboard.savingsGoal).toHaveProperty('penalties');
      expect(dashboard.savingsGoal).toHaveProperty('total');
      expect(dashboard).toHaveProperty('daysUntilPayday');
      expect(dashboard).toHaveProperty('currentPenalties');
    });

    it('should calculate days until payday correctly', async () => {
      const user = await createTestUser();
      const dashboard = await getDashboard(user._id!.toString());

      expect(dashboard.daysUntilPayday).toBeGreaterThan(0);
      expect(dashboard.daysUntilPayday).toBeLessThanOrEqual(31);
    });
  });

  describe('calculateSubsidy', () => {
    it('should calculate SisterBF subsidy correctly', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 500,
        description: 'Sister groceries',
        category: 'Essential',
        consumer: 'SisterBF',
        isPenaltyTrigger: false,
      });

      const subsidy = await calculateSubsidy(user._id!.toString(), testDate);

      expect(subsidy.breakdown.sisterBFOnly).toBe(500);
      expect(subsidy.totalSubsidized).toBe(500);
    });

    it('should split household expenses 50/50', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 1000,
        description: 'Shared groceries',
        category: 'Essential',
        consumer: 'Household',
        isPenaltyTrigger: false,
      });

      const subsidy = await calculateSubsidy(user._id!.toString(), testDate);

      expect(subsidy.breakdown.householdShared).toBe(500);
      expect(subsidy.totalSubsidized).toBe(500);
    });

    it('should calculate percentage of cap used', async () => {
      const user = await createTestUser();
      user.sisterSubsidyCap = 1000;
      await user.save();

      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 500,
        description: 'Sister groceries',
        category: 'Essential',
        consumer: 'SisterBF',
        isPenaltyTrigger: false,
      });

      const subsidy = await calculateSubsidy(user._id!.toString(), testDate);

      expect(subsidy.cap).toBe(1000);
      expect(subsidy.totalSubsidized).toBe(500);
      expect(subsidy.percentageUsed).toBe(50);
    });

    it('should cap percentage at 100', async () => {
      const user = await createTestUser();
      user.sisterSubsidyCap = 500;
      await user.save();

      const testDate = new Date(2025, 10, 15);

      await Transaction.create({
        userId: user._id!.toString(),
        date: testDate,
        amount: 1000,
        description: 'Sister groceries',
        category: 'Essential',
        consumer: 'SisterBF',
        isPenaltyTrigger: false,
      });

      const subsidy = await calculateSubsidy(user._id!.toString(), testDate);

      expect(subsidy.percentageUsed).toBe(100);
    });
  });
});
