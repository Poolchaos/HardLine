import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import { Transaction } from '../models/Transaction';
import { createTransactionValidation, monthQueryValidation } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// POST /api/transactions
router.post('/', strictLimiter, createTransactionValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!; // From auth middleware
    const { type, amount, description, category, incomeSource, date } = req.body;

    const transactionDate = date ? new Date(date) : new Date();

    const transaction = new Transaction({
      userId,
      type,
      amount,
      description,
      date: transactionDate,
      // Expense-specific fields
      ...(type === 'expense' && {
        category,
      }),
      // Income-specific fields
      ...(type === 'income' && {
        incomeSource,
      }),
    });

    await transaction.save();

    res.status(201).json({ transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions?month=YYYY-MM
router.get('/', monthQueryValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!; // From auth middleware
    const monthStr = req.query.month as string;

    const month = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
