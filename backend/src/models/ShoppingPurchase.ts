import mongoose from 'mongoose';
import { IShoppingPurchase, ShoppingCycle } from '../types';

const shoppingPurchaseSchema = new mongoose.Schema<IShoppingPurchase>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  shoppingItemId: {
    type: String,
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
  },
  cycle: {
    type: String,
    required: true,
    enum: ['MonthStart', 'MidMonth', 'Both'] as ShoppingCycle[],
  },
  actualCost: {
    type: Number,
    required: true,
    min: 0,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
});

export const ShoppingPurchase = mongoose.model<IShoppingPurchase>('ShoppingPurchase', shoppingPurchaseSchema);
