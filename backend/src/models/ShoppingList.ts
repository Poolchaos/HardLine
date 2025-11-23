import mongoose from 'mongoose';
import { IShoppingList } from '../types';

const shoppingListSchema = new mongoose.Schema<IShoppingList>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  targetDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient user queries
shoppingListSchema.index({ userId: 1, isActive: 1 });

export const ShoppingList = mongoose.model<IShoppingList>('ShoppingList', shoppingListSchema);
