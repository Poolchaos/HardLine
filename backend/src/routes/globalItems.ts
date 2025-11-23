import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { GlobalItem } from '../models/GlobalItem';
import { ItemPurchaseHistory } from '../models/ItemPurchaseHistory';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ===== GLOBAL ITEMS =====

// GET /api/global-items/search?q=milk - Search for global items
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { q, category } = req.query;
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    let items;
    if (q && typeof q === 'string' && q.trim()) {
      // Text search
      items = await GlobalItem.find({
        ...query,
        $text: { $search: q.trim() }
      }, {
        score: { $meta: 'textScore' }
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50);
    } else {
      // No search query, return recent items
      items = await GlobalItem.find(query)
        .sort({ createdAt: -1 })
        .limit(50);
    }

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/global-items/:id - Get single global item
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await GlobalItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/global-items - Create new global item
router.post('/', strictLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').isIn(['Cleaning', 'Pantry', 'Fridge']).withMessage('Invalid category'),
  body('uom').isIn(['L', 'ml', 'kg', 'g', 'units', 'pack', 'dozen', 'box', 'bag', 'bottle', 'can']).withMessage('Invalid UOM'),
  body('packageSize').optional().isFloat({ min: 0 }).withMessage('Package size must be positive'),
  body('packageType').optional().trim(),
  body('brand').optional().trim(),
  body('barcode').optional().trim(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!;
    const { name, category, uom, packageSize, packageType, brand, barcode } = req.body;

    // Check if item with same barcode exists
    if (barcode) {
      const existing = await GlobalItem.findOne({ barcode, isActive: true });
      if (existing) {
        res.status(400).json({ error: 'Item with this barcode already exists', existingItem: existing });
        return;
      }
    }

    const item = new GlobalItem({
      name: name.trim(),
      category,
      uom,
      packageSize,
      packageType: packageType?.trim(),
      brand: brand?.trim(),
      barcode: barcode?.trim(),
      isActive: true,
      createdBy: userId,
    });

    await item.save();
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PURCHASE HISTORY =====

// GET /api/global-items/:id/history - Get purchase history for an item
router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { limit = '10' } = req.query;

    const history = await ItemPurchaseHistory.find({
      userId,
      globalItemId: id,
    })
    .sort({ purchaseDate: -1 })
    .limit(parseInt(limit as string));

    // Calculate statistics
    const stats = {
      totalPurchases: history.length,
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      lastPurchaseDate: null as Date | null,
      lastPrice: 0,
    };

    if (history.length > 0) {
      const prices = history.map(h => h.price);
      stats.averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      stats.lowestPrice = Math.min(...prices);
      stats.highestPrice = Math.max(...prices);
      stats.lastPurchaseDate = history[0].purchaseDate;
      stats.lastPrice = history[0].price;
    }

    res.json({ history, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/global-items/:id/purchase - Record a purchase
router.post('/:id/purchase', strictLimiter, [
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('purchaseDate').isISO8601().withMessage('Invalid date'),
  body('store').optional().trim(),
  body('notes').optional().trim(),
  body('transactionId').optional().trim(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!;
    const { id } = req.params;
    const { price, quantity, purchaseDate, store, notes, transactionId } = req.body;

    // Verify global item exists
    const item = await GlobalItem.findById(id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const purchase = new ItemPurchaseHistory({
      userId,
      globalItemId: id,
      price,
      quantity,
      purchaseDate: new Date(purchaseDate),
      store: store?.trim(),
      notes: notes?.trim(),
      transactionId,
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
