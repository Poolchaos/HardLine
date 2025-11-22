import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Transaction } from '../models/Transaction';
import { getPenaltyBreakdown, checkPenaltyTrigger } from '../services/penaltyService';
import { createTransactionValidation, monthQueryValidation } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/transactions
router.post('/', strictLimiter, createTransactionValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';
    const { amount, description, category, consumer, date } = req.body;

    const transactionDate = date ? new Date(date) : new Date();

    // Check if this triggers a penalty
    const isPenaltyTrigger = await checkPenaltyTrigger(userId, category, transactionDate);

    const transaction = new Transaction({
      userId,
      amount,
      description,
      category,
      consumer,
      date: transactionDate,
      isPenaltyTrigger,
    });

    await transaction.save();

    res.status(201).json({
      transaction,
      penaltyTriggered: isPenaltyTrigger,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions?month=YYYY-MM
router.get('/', monthQueryValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';
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

// GET /api/transactions/penalties?month=YYYY-MM
router.get('/penalties', monthQueryValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';
    const monthStr = req.query.month as string;
    const month = monthStr ? new Date(`${monthStr}-01`) : new Date();

    const breakdown = await getPenaltyBreakdown(userId, month);
    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
