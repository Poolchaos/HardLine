import { Router, Response } from 'express';
import { param, query } from 'express-validator';
import { validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import {
  getMonthlyStats,
  generateMonthlyStats,
  getStatsHistory,
  getYearToDateSummary,
} from '../services/statsService';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/stats/monthly/:year/:month - Get stats for specific month
router.get(
  '/monthly/:year/:month',
  generalLimiter,
  [
    param('year').isInt({ min: 2020, max: 2100 }),
    param('month').isInt({ min: 0, max: 11 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      const stats = await getMonthlyStats(userId, year, month);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/stats/monthly/:year/:month/regenerate - Force regenerate stats
router.post(
  '/monthly/:year/:month/regenerate',
  generalLimiter,
  [
    param('year').isInt({ min: 2020, max: 2100 }),
    param('month').isInt({ min: 0, max: 11 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      const stats = await generateMonthlyStats(userId, year, month);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/stats/history?months=6 - Get historical stats
router.get(
  '/history',
  generalLimiter,
  [query('months').optional().isInt({ min: 1, max: 24 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const months = req.query.months ? parseInt(req.query.months as string) : 6;

      const history = await getStatsHistory(userId, months);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/stats/ytd/:year - Get year-to-date summary
router.get(
  '/ytd/:year',
  generalLimiter,
  [param('year').isInt({ min: 2020, max: 2100 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const year = parseInt(req.params.year);

      const summary = await getYearToDateSummary(userId, year);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/stats/current - Get current month stats
router.get('/current', generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const stats = await getMonthlyStats(userId, year, month);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
