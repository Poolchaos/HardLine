import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter';
import {
  recordPrice,
  getPriceHistory,
  getPriceTrend,
  recordPricesFromPurchases,
  getPriceComparison,
} from '../services/priceService';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/prices/item/:itemId/history - Get price history for item
router.get(
  '/item/:itemId/history',
  apiLimiter,
  [
    param('itemId').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { itemId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const history = await getPriceHistory(userId, itemId, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/prices/item/:itemId/trend - Get price trend for item
router.get('/item/:itemId/trend', apiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.params;

    const trend = await getPriceTrend(userId, itemId);
    res.json(trend);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prices/item/:itemId - Record price for item
router.post(
  '/item/:itemId',
  strictLimiter,
  [
    param('itemId').notEmpty(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('source').optional().isIn(['purchase', 'manual', 'estimate']),
    body('recordedDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { itemId } = req.params;
      const { price, source, recordedDate } = req.body;

      const priceRecord = await recordPrice(
        userId,
        itemId,
        price,
        source || 'manual',
        recordedDate ? new Date(recordedDate) : new Date()
      );

      res.status(201).json(priceRecord);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/prices/sync-purchases - Auto-record prices from purchases
router.post(
  '/sync-purchases',
  strictLimiter,
  [
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { startDate, endDate } = req.body;

      const recordedCount = await recordPricesFromPurchases(
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.json({
        message: 'Prices synced from purchases',
        recordedCount,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/prices/comparison - Get price comparison for all items
router.get('/comparison', apiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const comparison = await getPriceComparison(userId);
    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
