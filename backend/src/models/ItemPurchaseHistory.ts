import mongoose from 'mongoose';
import { IItemPurchaseHistory } from '../types';

const itemPurchaseHistorySchema = new mongoose.Schema<IItemPurchaseHistory>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  globalItemId: {
    type: String,
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    index: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchaseDate: {
    type: Date,
    required: true,
    index: true,
  },
  store: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index for user's purchase history queries
itemPurchaseHistorySchema.index({ userId: 1, globalItemId: 1, purchaseDate: -1 });

export const ItemPurchaseHistory = mongoose.model<IItemPurchaseHistory>('ItemPurchaseHistory', itemPurchaseHistorySchema);
