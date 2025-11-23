import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import { getDashboard } from '../services/budgetService';
import { monthQueryValidation } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/budget/dashboard?month=YYYY-MM
router.get('/dashboard', monthQueryValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!; // From auth middleware
    const monthStr = req.query.month as string;
    const month = monthStr ? new Date(`${monthStr}-01`) : new Date();

    const dashboard = await getDashboard(userId, month);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
