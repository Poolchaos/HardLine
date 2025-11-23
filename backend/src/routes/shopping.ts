import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingList } from '../models/ShoppingList';
import { GlobalItem } from '../models/GlobalItem';
import { getActiveShoppingList } from '../services/shoppingService';
import { createShoppingItemValidation, idParamValidation } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ===== SHOPPING LISTS =====

// GET /api/shopping/lists - Get all shopping lists
router.get('/lists', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const lists = await ShoppingList.find({ userId }).sort({ sortOrder: 1, createdAt: -1 });
    res.json(lists);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping/lists - Create shopping list
router.post('/lists', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description, sortOrder, targetDate } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'List name is required' });
      return;
    }

    const list = new ShoppingList({
      userId,
      name: name.trim(),
      description: description?.trim(),
      isActive: true,
      sortOrder: sortOrder ?? 0,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });

    await list.save();
    res.status(201).json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/shopping/lists/:id/order - Update list sort order
router.patch('/lists/:id/order', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sortOrder } = req.body;
    const userId = req.userId!;

    const list = await ShoppingList.findOneAndUpdate(
      { _id: id, userId },
      { sortOrder },
      { new: true }
    );

    if (!list) {
      res.status(404).json({ error: 'Shopping list not found' });
      return;
    }

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping/lists/:id - Delete shopping list
router.delete('/lists/:id', strictLimiter, idParamValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const userId = req.userId!;

    // Delete all items in this list first
    await ShoppingItem.deleteMany({ listId: id, userId });

    // Delete the list
    const list = await ShoppingList.findOneAndDelete({ _id: id, userId });

    if (!list) {
      res.status(404).json({ error: 'Shopping list not found' });
      return;
    }

    res.json({ message: 'Shopping list and all items deleted', list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SHOPPING ITEMS =====

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

// GET /api/shopping/items - Get all shopping items with global item details (optionally filter by listId)
router.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { listId } = req.query;

    const query: any = { userId };
    if (listId) {
      query.listId = listId;
    }

    const items = await ShoppingItem.find(query);

    // Fetch global item details for each shopping item
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const globalItem = await GlobalItem.findById(item.globalItemId);
        return {
          ...item.toObject(),
          globalItem: globalItem || null,
        };
      })
    );

    res.json(itemsWithDetails);
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
    const { listId, globalItemId, cycle, isDiabeticFriendly, quantity } = req.body;

    if (!listId) {
      res.status(400).json({ error: 'listId is required' });
      return;
    }

    if (!globalItemId) {
      res.status(400).json({ error: 'globalItemId is required' });
      return;
    }

    // Verify the list belongs to the user
    const list = await ShoppingList.findOne({ _id: listId, userId });
    if (!list) {
      res.status(404).json({ error: 'Shopping list not found' });
      return;
    }

    // Verify the global item exists
    const globalItem = await GlobalItem.findById(globalItemId);
    if (!globalItem) {
      res.status(404).json({ error: 'Global item not found' });
      return;
    }

    const item = new ShoppingItem({
      userId,
      listId,
      globalItemId,
      cycle,
      isDiabeticFriendly: isDiabeticFriendly || false,
      quantity: quantity || 1,
      isActive: true,
    });

    await item.save();

    // Return item with global item details
    const itemWithDetails = {
      ...item.toObject(),
      globalItem,
    };

    res.status(201).json(itemWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/shopping/items/:id - Update shopping item
router.put('/items/:id', strictLimiter, idParamValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const userId = req.userId!;
    const { listId, globalItemId, cycle, quantity, isDiabeticFriendly } = req.body;

    // Find existing item
    const item = await ShoppingItem.findOne({ _id: id, userId });
    if (!item) {
      res.status(404).json({ error: 'Shopping item not found' });
      return;
    }

    // If listId is being changed, verify the new list belongs to the user
    if (listId && listId !== item.listId.toString()) {
      const list = await ShoppingList.findOne({ _id: listId, userId });
      if (!list) {
        res.status(404).json({ error: 'Shopping list not found' });
        return;
      }
      item.listId = listId;
    }

    // If globalItemId is being changed, verify it exists
    if (globalItemId && globalItemId !== item.globalItemId.toString()) {
      const globalItem = await GlobalItem.findById(globalItemId);
      if (!globalItem) {
        res.status(404).json({ error: 'Global item not found' });
        return;
      }
      item.globalItemId = globalItemId;
    }

    // Update other fields
    if (cycle !== undefined) item.cycle = cycle;
    if (quantity !== undefined) item.quantity = quantity;
    if (isDiabeticFriendly !== undefined) item.isDiabeticFriendly = isDiabeticFriendly;

    await item.save();

    // Return item with global item details
    const globalItem = await GlobalItem.findById(item.globalItemId);
    const itemWithDetails = {
      ...item.toObject(),
      globalItem,
    };

    res.json(itemWithDetails);
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
