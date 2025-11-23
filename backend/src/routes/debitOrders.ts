import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DebitOrder } from '../models/DebitOrder';
import { authenticate, AuthRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/debit-orders - Get all debit orders for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const orders = await DebitOrder.find({ userId }).sort({ debitDate: 1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/debit-orders - Create new debit order
router.post(
  '/',
  strictLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('debitDate').isInt({ min: 1, max: 31 }).withMessage('Debit date must be between 1-31'),
    body('priority').isIn(['critical', 'important', 'optional']).withMessage('Invalid priority'),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { name, amount, debitDate, priority, description } = req.body;

      const order = new DebitOrder({
        userId,
        name,
        amount,
        debitDate,
        priority,
        description,
        status: 'active',
        autoDebit: true,
      });

      await order.save();
      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/debit-orders/:id - Update debit order
router.patch(
  '/:id',
  strictLimiter,
  [
    body('name').optional().trim().notEmpty(),
    body('amount').optional().isFloat({ min: 0 }),
    body('debitDate').optional().isInt({ min: 1, max: 31 }),
    body('priority').optional().isIn(['critical', 'important', 'optional']),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const userId = req.userId!;

      const order = await DebitOrder.findOneAndUpdate(
        { _id: id, userId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!order) {
        return res.status(404).json({ error: 'Debit order not found' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/debit-orders/:id/pause - Pause debit order
router.post('/:id/pause', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const order = await DebitOrder.findOneAndUpdate(
      { _id: id, userId },
      { status: 'paused', autoDebit: false },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Debit order not found' });
    }

    res.json({ message: 'Debit order paused', order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/debit-orders/:id/resume - Resume paused debit order
router.post('/:id/resume', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const order = await DebitOrder.findOneAndUpdate(
      { _id: id, userId, status: 'paused' },
      { status: 'active', autoDebit: true },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Debit order not found or not paused' });
    }

    res.json({ message: 'Debit order resumed', order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/debit-orders/:id/cancel - Cancel debit order
router.post('/:id/cancel', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const order = await DebitOrder.findOneAndUpdate(
      { _id: id, userId },
      { status: 'cancelled', autoDebit: false },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Debit order not found' });
    }

    res.json({ message: 'Debit order cancelled', order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/debit-orders/:id - Delete debit order
router.delete('/:id', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const order = await DebitOrder.findOneAndDelete({ _id: id, userId });

    if (!order) {
      return res.status(404).json({ error: 'Debit order not found' });
    }

    res.json({ message: 'Debit order deleted', order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
