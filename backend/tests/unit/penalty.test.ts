import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import { calculateMonthlyPenalty, getPenaltyBreakdown, checkPenaltyTrigger } from '../../src/services/penaltyService';

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
});

describe('PenaltyService', () => {
  const createTestUser = async (penaltyEnabled = true) => {
    const user = new User({
      income: 20000,
      savingsBaseGoal: 5000,
      penaltySystemEnabled: penaltyEnabled,
      payday: 25,
      sisterSubsidyCap: 2000,
    });
    await user.save();
    return user;
  };

  const createTransaction = async (userId: string, category: string, date: Date) => {
    const txn = new Transaction({
      userId,
      date,
      amount: 100,
      description: `Test ${category}`,
      category,
      consumer: 'MeMom',
      isPenaltyTrigger: false,
    });
    await txn.save();
    return txn;
  };

  describe('calculateMonthlyPenalty', () => {
    it('should return 0 when penalty system is disabled', async () => {
      const user = await createTestUser(false);
      await createTransaction(user._id!.toString(), 'Takeaway', new Date());

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), new Date());

      expect(penalty).toBe(0);
    });

    it('should return R500 for 1 takeaway', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15); // Nov 15, 2025
      await createTransaction(user._id!.toString(), 'Takeaway', testDate);

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), testDate);

      expect(penalty).toBe(500);
    });

    it('should return 0 for 2 snacks (within limit)', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), testDate);

      expect(penalty).toBe(0);
    });

    it('should return R500 for 3 snacks (1 over limit)', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), testDate);

      expect(penalty).toBe(500);
    });

    it('should return R2000 for 2 takeaways + 4 snacks', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);
      
      // 2 takeaways = R1000
      await createTransaction(user._id!.toString(), 'Takeaway', testDate);
      await createTransaction(user._id!.toString(), 'Takeaway', testDate);
      
      // 4 snacks (2 over limit, R500 each) = R1000
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), testDate);

      expect(penalty).toBe(2000);
    });    it('should only count transactions from the specified month', async () => {
      const user = await createTestUser();
      const novDate = new Date(2025, 10, 15); // November
      const octDate = new Date(2025, 9, 15); // October

      await createTransaction(user._id!.toString(), 'Takeaway', novDate);
      await createTransaction(user._id!.toString(), 'Takeaway', octDate);

      const penalty = await calculateMonthlyPenalty(user._id!.toString(), novDate);

      expect(penalty).toBe(500); // Only November takeaway
    });
  });

  describe('getPenaltyBreakdown', () => {
    it('should return correct breakdown for mixed violations', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await createTransaction(user._id!.toString(), 'Takeaway', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const breakdown = await getPenaltyBreakdown(user._id!.toString(), testDate);

      expect(breakdown).toEqual({
        takeaways: 500,
        snacks: 500,
        total: 1000,
      });
    });

    it('should return zeros when penalty system disabled', async () => {
      const user = await createTestUser(false);
      const testDate = new Date(2025, 10, 15);

      await createTransaction(user._id!.toString(), 'Takeaway', testDate);

      const breakdown = await getPenaltyBreakdown(user._id!.toString(), testDate);

      expect(breakdown).toEqual({
        takeaways: 0,
        snacks: 0,
        total: 0,
      });
    });
  });

  describe('checkPenaltyTrigger', () => {
    it('should return true for takeaway category', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      const trigger = await checkPenaltyTrigger(user._id!.toString(), 'Takeaway', testDate);

      expect(trigger).toBe(true);
    });

    it('should return false for snack when under limit', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const trigger = await checkPenaltyTrigger(user._id!.toString(), 'Snack', testDate);

      expect(trigger).toBe(false);
    });

    it('should return true for snack when at limit', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      await createTransaction(user._id!.toString(), 'Snack', testDate);
      await createTransaction(user._id!.toString(), 'Snack', testDate);

      const trigger = await checkPenaltyTrigger(user._id!.toString(), 'Snack', testDate);

      expect(trigger).toBe(true);
    });

    it('should return false for essential category', async () => {
      const user = await createTestUser();
      const testDate = new Date(2025, 10, 15);

      const trigger = await checkPenaltyTrigger(user._id!.toString(), 'Essential', testDate);

      expect(trigger).toBe(false);
    });

    it('should return false when penalty system disabled', async () => {
      const user = await createTestUser(false);
      const testDate = new Date(2025, 10, 15);

      const trigger = await checkPenaltyTrigger(user._id!.toString(), 'Takeaway', testDate);

      expect(trigger).toBe(false);
    });
  });
});
