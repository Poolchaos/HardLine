import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/server';
import { User } from '../../src/models/User';
import { FixedExpense } from '../../src/models/FixedExpense';
import jwt from 'jsonwebtoken';

let mongoServer: MongoMemoryServer;
let authToken: string;
let userId: string;

const JWT_SECRET = process.env.JWT_SECRET || 'hardline-secret-key-change-in-production';

beforeAll(async () => {
  // Disconnect existing connection if any
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Create test user and token
  const user = new User({
    email: 'test@hardline.com',
    passwordHash: 'hash123',
    name: 'Test User',
    payday: 25,
  });
  await user.save();
  userId = user._id!.toString();
  authToken = jwt.sign({ userId }, JWT_SECRET);
});

afterEach(async () => {
  await User.deleteMany({});
  await FixedExpense.deleteMany({});
});

describe('Fixed Expenses API', () => {
  describe('GET /api/settings/fixed-expenses', () => {
    it('should return all fixed expenses for user', async () => {
      await FixedExpense.create([
        { userId, name: 'Rent', amount: 8500, debitDay: 1, isActive: true },
        { userId, name: 'Insurance', amount: 1200, debitDay: 15, isActive: true },
      ]);

      const response = await request(app)
        .get('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      const names = response.body.map((e: any) => e.name);
      expect(names).toContain('Rent');
      expect(names).toContain('Insurance');
    });

    it('should return empty array if no expenses', async () => {
      const response = await request(app)
        .get('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/settings/fixed-expenses')
        .expect(401);
    });
  });

  describe('POST /api/settings/fixed-expenses', () => {
    it('should create a new fixed expense', async () => {
      const response = await request(app)
        .post('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          amount: 8500,
          debitDay: 1,
        })
        .expect(201);

      expect(response.body.name).toBe('Rent');
      expect(response.body.amount).toBe(8500);
      expect(response.body.debitDay).toBe(1);
      expect(response.body.isActive).toBe(true);
      expect(response.body.userId).toBe(userId);

      const expense = await FixedExpense.findById(response.body._id);
      expect(expense).toBeDefined();
    });

    it('should validate debitDay range (1-31)', async () => {
      await request(app)
        .post('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          amount: 8500,
          debitDay: 32, // Invalid
        })
        .expect(400);

      await request(app)
        .post('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          amount: 8500,
          debitDay: 0, // Invalid
        })
        .expect(400);
    });

    it('should require name and amount', async () => {
      await request(app)
        .post('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 8500,
          debitDay: 1,
        })
        .expect(400);

      await request(app)
        .post('/api/settings/fixed-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          debitDay: 1,
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/settings/fixed-expenses')
        .send({
          name: 'Rent',
          amount: 8500,
          debitDay: 1,
        })
        .expect(401);
    });
  });

  describe('PATCH /api/settings/fixed-expenses/:id', () => {
    it('should update expense name and amount', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      const response = await request(app)
        .patch(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Rent',
          amount: 9000,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Rent');
      expect(response.body.amount).toBe(9000);
      expect(response.body.debitDay).toBe(1); // Unchanged
    });

    it('should update debitDay', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      const response = await request(app)
        .patch(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          debitDay: 15,
        })
        .expect(200);

      expect(response.body.debitDay).toBe(15);
    });

    it('should toggle isActive', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      const response = await request(app)
        .patch(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should validate debitDay on update', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      await request(app)
        .patch(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          debitDay: 50, // Invalid
        })
        .expect(400);
    });

    it('should prevent updating another user\'s expense', async () => {
      const otherUser = new User({
        email: 'other@hardline.com',
        passwordHash: 'hash123',
        name: 'Other User',
        payday: 25,
      });
      await otherUser.save();

      const expense = await FixedExpense.create({
        userId: otherUser._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      await request(app)
        .patch(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 9000,
        })
        .expect(404);
    });

    it('should return 404 for non-existent expense', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/settings/fixed-expenses/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 9000,
        })
        .expect(404);
    });
  });

  describe('DELETE /api/settings/fixed-expenses/:id', () => {
    it('should delete a fixed expense', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Cancelled Gym',
        amount: 500,
        debitDay: 1,
        isActive: true,
      });

      await request(app)
        .delete(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deleted = await FixedExpense.findById(expense._id);
      expect(deleted).toBeNull();
    });

    it('should prevent deleting another user\'s expense', async () => {
      const otherUser = new User({
        email: 'other@hardline.com',
        passwordHash: 'hash123',
        name: 'Other User',
        payday: 25,
      });
      await otherUser.save();

      const expense = await FixedExpense.create({
        userId: otherUser._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      await request(app)
        .delete(`/api/settings/fixed-expenses/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      const stillExists = await FixedExpense.findById(expense._id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 404 for non-existent expense', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/settings/fixed-expenses/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/settings/fixed-expenses/:id/manual-debit', () => {
    it('should manually trigger a debit', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      const response = await request(app)
        .post(`/api/settings/fixed-expenses/${expense._id}/manual-debit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Manual debit successful');
      expect(response.body.expense.lastDebited).toBeDefined();
    });

    it('should fail for inactive expense', async () => {
      const expense = await FixedExpense.create({
        userId,
        name: 'Cancelled Gym',
        amount: 500,
        debitDay: 1,
        isActive: false,
      });

      await request(app)
        .post(`/api/settings/fixed-expenses/${expense._id}/manual-debit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should prevent manual debit of another user\'s expense', async () => {
      const otherUser = new User({
        email: 'other@hardline.com',
        passwordHash: 'hash123',
        name: 'Other User',
        payday: 25,
      });
      await otherUser.save();

      const expense = await FixedExpense.create({
        userId: otherUser._id!.toString(),
        name: 'Rent',
        amount: 8500,
        debitDay: 1,
        isActive: true,
      });

      await request(app)
        .post(`/api/settings/fixed-expenses/${expense._id}/manual-debit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
