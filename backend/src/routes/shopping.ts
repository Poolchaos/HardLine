import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import { ShoppingItem } from '../models/ShoppingItem';
import { getActiveShoppingList } from '../services/shoppingService';
import { createShoppingItemValidation, idParamValidation } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/shopping/list - Get active shopping list for current cycle
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const items = await getActiveShoppingList(userId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/shopping/items - Get all shopping items
router.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const items = await ShoppingItem.find({ userId }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping/items - Create shopping item
router.post('/items', strictLimiter, createShoppingItemValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!;
    const { name, category, cycle, isDiabeticFriendly, typicalCost } = req.body;

    const item = new ShoppingItem({
      userId,
      name,
      category,
      cycle,
      isDiabeticFriendly: isDiabeticFriendly || false,
      typicalCost,
      isActive: true,
    });

    await item.save();
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping/items/:id - Remove shopping item
router.delete('/items/:id', strictLimiter, idParamValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const userId = req.userId!;

    const item = await ShoppingItem.findOneAndDelete({ _id: id, userId });

    if (!item) {
      res.status(404).json({ error: 'Shopping item not found' });
      return;
    }

    res.json({ message: 'Shopping item deleted', item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
