import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { FixedExpense } from '../models/FixedExpense';
import { updateUserValidation, createFixedExpenseValidation, idParamValidation } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/settings/user
router.get('/user', async (req: Request, res: Response) => {
  try {
    const userId = '000000000000000000000001';
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/settings/user
router.patch('/user', strictLimiter, updateUserValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';
    const updates = req.body;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/settings/fixed-expenses
router.get('/fixed-expenses', async (req: Request, res: Response) => {
  try {
    const userId = '000000000000000000000001';
    const expenses = await FixedExpense.find({ userId }).sort({ name: 1 });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings/fixed-expenses
router.post('/fixed-expenses', strictLimiter, createFixedExpenseValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';
    const { name, amount } = req.body;

    const expense = new FixedExpense({
      userId,
      name,
      amount,
      isActive: true,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/settings/fixed-expenses/:id
router.delete('/fixed-expenses/:id', strictLimiter, idParamValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const userId = '000000000000000000000001';

    const expense = await FixedExpense.findOneAndDelete({ _id: id, userId });

    if (!expense) {
      res.status(404).json({ error: 'Fixed expense not found' });
      return;
    }

    res.json({ message: 'Fixed expense deleted', expense });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
