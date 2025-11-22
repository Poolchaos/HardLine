import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { ShoppingItem } from '../../src/models/ShoppingItem';
import { getCurrentShoppingCycle, getActiveShoppingList } from '../../src/services/shoppingService';

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
});

describe('ShoppingService', () => {
  describe('getCurrentShoppingCycle', () => {
    it('should return MonthStart when current day is payday', () => {
      const payday = 1;
      const currentDate = new Date(2025, 10, 1); // Nov 1st

      const cycle = getCurrentShoppingCycle(payday, currentDate);

      expect(cycle).toBe('MonthStart');
    });

    it('should return MonthStart when within 13 days of payday', () => {
      const payday = 1;
      const currentDate = new Date(2025, 10, 5); // Nov 5th (day 5)

      const cycle = getCurrentShoppingCycle(payday, currentDate);

      expect(cycle).toBe('MonthStart');
    });

    it('should return MidMonth when 14+ days after payday', () => {
      const payday = 1;
      const currentDate = new Date(2025, 10, 18); // Nov 18th

      const cycle = getCurrentShoppingCycle(payday, currentDate);

      expect(cycle).toBe('MidMonth');
    });

    it('should handle payday at end of month', () => {
      const payday = 25;
      const currentDate = new Date(2025, 10, 25); // Nov 25th

      const cycle = getCurrentShoppingCycle(payday, currentDate);

      expect(cycle).toBe('MonthStart');
    });

    it('should handle mid-month correctly for late payday', () => {
      const payday = 25;
      const currentDate = new Date(2025, 10, 28); // Nov 28th (3 days after payday)

      const cycle = getCurrentShoppingCycle(payday, currentDate);

      expect(cycle).toBe('MonthStart');
    });
  });

  describe('getActiveShoppingList', () => {
    const createTestUser = async (payday: number = 1) => {
      const user = new User({
        income: 20000,
        savingsBaseGoal: 5000,
        penaltySystemEnabled: true,
        payday,
        sisterSubsidyCap: 2000,
      });
      await user.save();
      return user;
    };

    const createShoppingItem = async (userId: string, name: string, cycle: string) => {
      const item = new ShoppingItem({
        userId,
        name,
        category: 'Pantry',
        cycle,
        isDiabeticFriendly: false,
        typicalCost: 50,
        isActive: true,
      });
      await item.save();
      return item;
    };

    it('should return MonthStart items during MonthStart cycle', async () => {
      const user = await createTestUser(1);

      await createShoppingItem(user._id!.toString(), 'Domestos', 'MonthStart');
      await createShoppingItem(user._id!.toString(), 'Lettuce', 'MidMonth');
      await createShoppingItem(user._id!.toString(), 'Rice', 'Both');

      // Mock current date to be in MonthStart cycle
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super('2025-11-05'); // Day 5 = MonthStart
        }
      } as any;

      const items = await getActiveShoppingList(user._id!.toString());

      global.Date = originalDate;

      expect(items.length).toBe(2); // Domestos + Rice
      expect(items.some((i: any) => i.name === 'Domestos')).toBe(true);
      expect(items.some((i: any) => i.name === 'Rice')).toBe(true);
      expect(items.some((i: any) => i.name === 'Lettuce')).toBe(false);
    });

    it('should return MidMonth items during MidMonth cycle', async () => {
      const user = await createTestUser(1);

      await createShoppingItem(user._id!.toString(), 'Domestos', 'MonthStart');
      await createShoppingItem(user._id!.toString(), 'Lettuce', 'MidMonth');
      await createShoppingItem(user._id!.toString(), 'Rice', 'Both');

      // Mock current date to be in MidMonth cycle
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super('2025-11-18'); // Day 18 = MidMonth
        }
      } as any;

      const items = await getActiveShoppingList(user._id!.toString());

      global.Date = originalDate;

      expect(items.length).toBe(2); // Lettuce + Rice
      expect(items.some((i: any) => i.name === 'Lettuce')).toBe(true);
      expect(items.some((i: any) => i.name === 'Rice')).toBe(true);
      expect(items.some((i: any) => i.name === 'Domestos')).toBe(false);
    });

    it('should not return inactive items', async () => {
      const user = await createTestUser(1);

      const item = await createShoppingItem(user._id!.toString(), 'Disabled Item', 'Both');
      item.isActive = false;
      await item.save();

      const items = await getActiveShoppingList(user._id!.toString());

      expect(items.length).toBe(0);
    });
  });
});
