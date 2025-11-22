import mongoose from 'mongoose';
import { IShoppingItem, ShoppingCycle, ShoppingCategory } from '../types';

const shoppingItemSchema = new mongoose.Schema<IShoppingItem>({
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
  category: {
    type: String,
    required: true,
    enum: ['Cleaning', 'Pantry', 'Fridge'] as ShoppingCategory[],
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
  typicalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const ShoppingItem = mongoose.model<IShoppingItem>('ShoppingItem', shoppingItemSchema);
