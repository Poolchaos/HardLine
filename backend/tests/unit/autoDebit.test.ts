import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/User';
import { FixedExpense } from '../../src/models/FixedExpense';
import { Transaction } from '../../src/models/Transaction';
import { processAutoDebits, manualDebit } from '../../src/services/autoDebitService';

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
  await FixedExpense.deleteMany({});
  await Transaction.deleteMany({});
});

describe('Auto-Debit Service', () => {
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

  describe('processAutoDebits', () => {
    it('should process expenses due today', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();

      // Create a fixed expense due today
      const expense = await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: currentDay,
        isActive: true,
      });

      await processAutoDebits();

      // Check transaction was created
      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('expense');
      expect(transactions[0].amount).toBe(8500);
      expect(transactions[0].description).toBe('Auto-debit: Rent');
      expect(transactions[0].category).toBe('Essential');

      // Check lastDebited was updated
      const updated = await FixedExpense.findById(expense._id);
      expect(updated?.lastDebited).toBeDefined();
      expect(updated?.lastDebited?.getDate()).toBe(currentDay);
    });

    it('should skip inactive expenses', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Cancelled Gym',
        amount: 500,
        debitDay: currentDay,
        isActive: false,
      });

      await processAutoDebits();

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(0);
    });

    it('should skip expenses not due today', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();
      const differentDay = currentDay === 1 ? 2 : 1;

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: differentDay,
        isActive: true,
      });

      await processAutoDebits();

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(0);
    });

    it('should not duplicate debits for same month', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();

      const expense = await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: currentDay,
        isActive: true,
        lastDebited: today, // Already debited today
      });

      await processAutoDebits();

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(0);
    });

    it('should handle expenses for multiple users', async () => {
      const today = new Date();
      const currentDay = today.getDate();

      const user1 = await createTestUser();
      const user2 = new User({
        email: 'user2@hardline.com',
        passwordHash: 'hash123',
        name: 'User Two',
        payday: 25,
      });
      await user2.save();

      await FixedExpense.create({
        userId: user1._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: currentDay,
        isActive: true,
      });

      await FixedExpense.create({
        userId: user2._id!.toString(),
        name: 'Insurance',
        amount: 1200,
        debitDay: currentDay,
        isActive: true,
      });

      await processAutoDebits();

      const transactions1 = await Transaction.find({ userId: user1._id });
      const transactions2 = await Transaction.find({ userId: user2._id });

      expect(transactions1).toHaveLength(1);
      expect(transactions2).toHaveLength(1);
      expect(transactions1[0].description).toBe('Auto-debit: Rent');
      expect(transactions2[0].description).toBe('Auto-debit: Insurance');
    });

    it('should skip if transaction already exists this month', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();

      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: currentDay,
        isActive: true,
      });

      // Manually create transaction for this month
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: today,
        amount: 8500,
        description: 'Auto-debit: Rent',
        category: 'Essential',
      });

      await processAutoDebits();

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(1); // Should not create duplicate
    });
  });

  describe('manualDebit', () => {
    it('should manually debit an active expense', async () => {
      const user = await createTestUser();

      const expense = await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      const result = await manualDebit(expense._id!.toString());

      expect(result).toBe(true);

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('Manual debit: Rent');
      expect(transactions[0].amount).toBe(8500);

      const updated = await FixedExpense.findById(expense._id);
      expect(updated?.lastDebited).toBeDefined();
    });

    it('should fail for inactive expense', async () => {
      const user = await createTestUser();

      const expense = await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Cancelled Gym',
        amount: 500,
        debitDay: 1,
        isActive: false,
      });

      const result = await manualDebit(expense._id!.toString());

      expect(result).toBe(false);

      const transactions = await Transaction.find({ userId: user._id });
      expect(transactions).toHaveLength(0);
    });

    it('should fail for non-existent expense', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await manualDebit(fakeId);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle debit day 31 on months with fewer days', async () => {
      const user = await createTestUser();

      // Create expense for day 31
      await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: 31,
        isActive: true,
      });

      // In a 30-day month, this should not process
      const today = new Date();
      if (today.getDate() === 31) {
        await processAutoDebits();
        const transactions = await Transaction.find({ userId: user._id });
        expect(transactions).toHaveLength(1);
      } else {
        await processAutoDebits();
        const transactions = await Transaction.find({ userId: user._id });
        expect(transactions).toHaveLength(0);
      }
    });

    it('should update lastDebited even if transaction creation fails', async () => {
      const user = await createTestUser();
      const today = new Date();
      const currentDay = today.getDate();

      const expense = await FixedExpense.create({
        userId: user._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: currentDay,
        isActive: true,
      });

      // Manually create transaction first
      await Transaction.create({
        userId: user._id!.toString(),
        type: 'expense',
        date: today,
        amount: 8500,
        description: 'Auto-debit: Rent',
        category: 'Essential',
      });

      await processAutoDebits();

      const updated = await FixedExpense.findById(expense._id);
      expect(updated?.lastDebited).toBeDefined();
    });
  });
});
