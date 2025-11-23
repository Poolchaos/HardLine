import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express, { Express } from 'express';
import cors from 'cors';
import { User } from '../../src/models/User';
import { DebitOrder } from '../../src/models/DebitOrder';
import authRoutes from '../../src/routes/auth';
import debitOrderRoutes from '../../src/routes/debitOrders';

let mongoServer: MongoMemoryServer;
let authToken: string;
let userId: string;
let app: Express;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test app without starting the server
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/debit-orders', debitOrderRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await DebitOrder.deleteMany({});

  // Create test user and get auth token
  const response = await request(app).post('/api/auth/register').send({
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
    payday: 25,
  });

  authToken = response.body.token;
  userId = response.body.user.id;
});

describe('DebitOrder Routes', () => {
  describe('POST /api/debit-orders', () => {
    it('should create a new debit order', async () => {
      const response = await request(app)
        .post('/api/debit-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          amount: 8500,
          debitDate: 1,
          priority: 'critical',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Rent');
      expect(response.body.amount).toBe(8500);
      expect(response.body.debitDate).toBe(1);
      expect(response.body.priority).toBe('critical');
      expect(response.body.status).toBe('active');
      expect(response.body.autoDebit).toBe(true);
      expect(response.body.nextDebitDate).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/debit-orders').send({
        name: 'Rent',
        amount: 8500,
        debitDate: 1,
      });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/debit-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rent',
          // Missing amount and debitDate
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/debit-orders', () => {
    it('should get all debit orders for user', async () => {
      await DebitOrder.create([
        {
          userId,
          name: 'Rent',
          amount: 8500,
          debitDate: 1,
          priority: 'critical',
        },
        {
          userId,
          name: 'Insurance',
          amount: 1200,
          debitDate: 15,
          priority: 'important',
        },
      ]);

      const response = await request(app)
        .get('/api/debit-orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Rent');
      expect(response.body[1].name).toBe('Insurance');
    });

    it('should only return user-specific debit orders', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        name: 'Other User',
        payday: 25,
      });

      await DebitOrder.create({
        userId: otherUser._id!.toString(),
        name: 'Other Rent',
        amount: 5000,
        debitDate: 1,
      });

      await DebitOrder.create({
        userId,
        name: 'My Rent',
        amount: 8500,
        debitDate: 1,
      });

      const response = await request(app)
        .get('/api/debit-orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Rent');
    });
  });

  describe('PATCH /api/debit-orders/:id', () => {
    it('should update a debit order', async () => {
      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Rent',
        amount: 8500,
        debitDate: 1,
        priority: 'critical',
      });

      const response = await request(app)
        .patch(`/api/debit-orders/${debitOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 9000,
          debitDate: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(9000);
      expect(response.body.debitDate).toBe(5);
      expect(response.body.name).toBe('Rent'); // Unchanged
    });

    it('should not update debit orders from other users', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        name: 'Other User',
        payday: 25,
      });

      const debitOrder = await DebitOrder.create({
        userId: otherUser._id!.toString(),
        name: 'Rent',
        amount: 5000,
        debitDate: 1,
      });

      const response = await request(app)
        .patch(`/api/debit-orders/${debitOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 9000 });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/debit-orders/:id/pause', () => {
    it('should pause an active debit order', async () => {
      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Gym Membership',
        amount: 500,
        debitDate: 15,
        priority: 'optional',
      });

      const response = await request(app)
        .post(`/api/debit-orders/${debitOrder._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe('paused');
      expect(response.body.order.autoDebit).toBe(false);

      // Verify in database
      const updated = await DebitOrder.findById(debitOrder._id);
      expect(updated?.status).toBe('paused');
      expect(updated?.autoDebit).toBe(false);
    });

    it('should not pause debit orders from other users', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        name: 'Other User',
        payday: 25,
      });

      const debitOrder = await DebitOrder.create({
        userId: otherUser._id!.toString(),
        name: 'Gym',
        amount: 500,
        debitDate: 15,
      });

      const response = await request(app)
        .post(`/api/debit-orders/${debitOrder._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/debit-orders/:id/resume', () => {
    it('should resume a paused debit order', async () => {
      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Gym Membership',
        amount: 500,
        debitDate: 15,
        priority: 'optional',
        status: 'paused',
        autoDebit: false,
      });

      const response = await request(app)
        .post(`/api/debit-orders/${debitOrder._id}/resume`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe('active');
      expect(response.body.order.autoDebit).toBe(true);

      // Verify in database
      const updated = await DebitOrder.findById(debitOrder._id);
      expect(updated?.status).toBe('active');
      expect(updated?.autoDebit).toBe(true);
    });
  });

  describe('POST /api/debit-orders/:id/cancel', () => {
    it('should cancel a debit order', async () => {
      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Old Subscription',
        amount: 99,
        debitDate: 10,
        priority: 'optional',
      });

      const response = await request(app)
        .post(`/api/debit-orders/${debitOrder._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe('cancelled');
      expect(response.body.order.autoDebit).toBe(false);

      // Verify cancelled orders don't affect budget
      const updated = await DebitOrder.findById(debitOrder._id);
      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('DELETE /api/debit-orders/:id', () => {
    it('should delete a debit order', async () => {
      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Temporary',
        amount: 100,
        debitDate: 5,
      });

      const response = await request(app)
        .delete(`/api/debit-orders/${debitOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Debit order deleted');

      // Verify it's deleted
      const deleted = await DebitOrder.findById(debitOrder._id);
      expect(deleted).toBeNull();
    });

    it('should not delete debit orders from other users', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hash',
        name: 'Other User',
        payday: 25,
      });

      const debitOrder = await DebitOrder.create({
        userId: otherUser._id!.toString(),
        name: 'Rent',
        amount: 5000,
        debitDate: 1,
      });

      const response = await request(app)
        .delete(`/api/debit-orders/${debitOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      // Verify it's not deleted
      const notDeleted = await DebitOrder.findById(debitOrder._id);
      expect(notDeleted).not.toBeNull();
    });
  });

  describe('Next Debit Date Calculation', () => {
    it('should calculate next debit date correctly for future date', async () => {
      const today = new Date();
      const futureDebitDate = today.getDate() + 5;

      const debitOrder = await DebitOrder.create({
        userId,
        name: 'Test',
        amount: 100,
        debitDate: futureDebitDate,
      });

      expect(debitOrder.nextDebitDate).toBeDefined();
      const nextDate = new Date(debitOrder.nextDebitDate!);
      expect(nextDate.getDate()).toBe(futureDebitDate);
      expect(nextDate.getMonth()).toBe(today.getMonth());
    });

    it('should calculate next month if debit date has passed', async () => {
      const today = new Date();
      const pastDebitDate = today.getDate() - 5;

      if (pastDebitDate > 0) {
        const debitOrder = await DebitOrder.create({
          userId,
          name: 'Test',
          amount: 100,
          debitDate: pastDebitDate,
        });

        expect(debitOrder.nextDebitDate).toBeDefined();
        const nextDate = new Date(debitOrder.nextDebitDate!);
        expect(nextDate.getMonth()).toBe((today.getMonth() + 1) % 12);
      }
    });
  });
});
