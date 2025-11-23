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
    const { type, amount, description, category, incomeSource, date, wastageAmount, wastageType, wastageNotes } = req.body;

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
      // Wastage tracking (optional)
      ...(wastageAmount && {
        wastageAmount,
        wastageType,
        wastageNotes,
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

// PATCH /api/transactions/:id - Update transaction
router.patch('/:id', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { wastageAmount, wastageType, wastageNotes, description, amount, category } = req.body;

    const transaction = await Transaction.findOne({ _id: id, userId });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // Update fields if provided
    if (description !== undefined) transaction.description = description;
    if (amount !== undefined) transaction.amount = amount;
    if (category !== undefined) transaction.category = category;
    if (wastageAmount !== undefined) transaction.wastageAmount = wastageAmount;
    if (wastageType !== undefined) transaction.wastageType = wastageType;
    if (wastageNotes !== undefined) transaction.wastageNotes = wastageNotes;

    await transaction.save();
    res.json({ transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
