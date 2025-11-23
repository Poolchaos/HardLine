import mongoose from 'mongoose';
import { IShoppingItem, ShoppingCycle } from '../types';

const shoppingItemSchema = new mongoose.Schema<IShoppingItem>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  listId: {
    type: String,
    required: true,
    index: true,
  },
  globalItemId: {
    type: String,
    required: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  cycle: {
    type: String,
    required: true,
    enum: ['MonthStart', 'MidMonth', 'Both'] as ShoppingCycle[],
  },
  isDiabeticFriendly: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const ShoppingItem = mongoose.model<IShoppingItem>('ShoppingItem', shoppingItemSchema);
