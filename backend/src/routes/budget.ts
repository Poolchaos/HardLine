import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getDashboard, calculateSubsidy } from '../services/budgetService';
import { monthQueryValidation } from '../middleware/validation';

const router = Router();

// GET /api/budget/dashboard?month=YYYY-MM
router.get('/dashboard', monthQueryValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // For MVP: Single user system, hardcoded user ID
    // In production: Get from authentication middleware
    const userId = '000000000000000000000001'; // Placeholder

    const monthStr = req.query.month as string;
    const month = monthStr ? new Date(`${monthStr}-01`) : new Date();

    const dashboard = await getDashboard(userId, month);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/budget/subsidy?month=YYYY-MM
router.get('/subsidy', monthQueryValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = '000000000000000000000001';

    const monthStr = req.query.month as string;
    const month = monthStr ? new Date(`${monthStr}-01`) : new Date();

    const subsidy = await calculateSubsidy(userId, month);
    res.json(subsidy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
