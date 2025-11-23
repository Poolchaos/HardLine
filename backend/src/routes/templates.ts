import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter';
import { ShoppingTemplate } from '../models/ShoppingTemplate';
import { ShoppingItem } from '../models/ShoppingItem';
import { GlobalItem } from '../models/GlobalItem';
import { ItemPurchaseHistory } from '../models/ItemPurchaseHistory';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/templates - Get all templates for user
router.get('/', apiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const templates = await ShoppingTemplate.find({ userId }).sort({ name: 1 });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/templates/:id - Get specific template
router.get('/:id', apiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const template = await ShoppingTemplate.findOne({ _id: id, userId });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates - Create new template
router.post(
  '/',
  strictLimiter,
  [
    body('name').trim().notEmpty().withMessage('Template name is required'),
    body('description').optional().trim(),
    body('items').isArray({ min: 1 }).withMessage('Template must have at least one item'),
    body('items.*.shoppingItemId').notEmpty().withMessage('Item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { name, description, items } = req.body;

      // Verify all items exist and belong to user
      for (const item of items) {
        const shoppingItem = await ShoppingItem.findOne({
          _id: item.shoppingItemId,
          userId,
        });
        if (!shoppingItem) {
          return res.status(400).json({
            error: `Shopping item ${item.shoppingItemId} not found or does not belong to user`,
          });
        }
      }

      const template = new ShoppingTemplate({
        userId,
        name,
        description,
        items,
        isActive: true,
      });

      await template.save();
      res.status(201).json(template);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Template with this name already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/templates/:id - Update template
router.patch(
  '/:id',
  strictLimiter,
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('items').optional().isArray({ min: 1 }),
    body('items.*.shoppingItemId').optional().notEmpty(),
    body('items.*.quantity').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.userId!;
      const { id } = req.params;
      const updates = req.body;

      // Verify all items exist if items array is provided
      if (updates.items) {
        for (const item of updates.items) {
          const shoppingItem = await ShoppingItem.findOne({
            _id: item.shoppingItemId,
            userId,
          });
          if (!shoppingItem) {
            return res.status(400).json({
              error: `Shopping item ${item.shoppingItemId} not found or does not belong to user`,
            });
          }
        }
      }

      const template = await ShoppingTemplate.findOneAndUpdate(
        { _id: id, userId },
        updates,
        { new: true, runValidators: true }
      );

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Template with this name already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/templates/:id - Delete template
router.delete('/:id', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const template = await ShoppingTemplate.findOneAndDelete({ _id: id, userId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted', template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates/:id/apply - Apply template to create shopping items
router.post('/:id/apply', strictLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const template = await ShoppingTemplate.findOne({ _id: id, userId });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get all items from template with their current details
    const items = [];
    let estimatedCost = 0;
    
    for (const templateItem of template.items) {
      const shoppingItem = await ShoppingItem.findOne({
        _id: templateItem.shoppingItemId,
        userId,
      }).populate('globalItemId');
      
      if (shoppingItem) {
        const itemData = {
          ...shoppingItem.toObject(),
          templateQuantity: templateItem.quantity,
        };
        items.push(itemData);

        // Calculate estimated cost from purchase history
        const globalItemId = typeof shoppingItem.globalItemId === 'string' 
          ? shoppingItem.globalItemId 
          : (shoppingItem.globalItemId as any)._id?.toString();
        
        if (globalItemId) {
          // Get most recent purchase price for this item
          const recentPurchase = await ItemPurchaseHistory.findOne({
            userId,
            globalItemId,
          }).sort({ purchaseDate: -1 });

          if (recentPurchase) {
            // Use most recent price multiplied by template quantity
            estimatedCost += recentPurchase.price * templateItem.quantity;
          }
        }
      }
    }

    res.json({
      template: {
        name: template.name,
        description: template.description,
      },
      items,
      totalItems: items.length,
      estimatedCost: Math.round(estimatedCost * 100) / 100, // Round to 2 decimal places
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
