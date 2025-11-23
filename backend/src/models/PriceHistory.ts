import mongoose from 'mongoose';

export interface IPriceHistory {
  _id?: string;
  userId: string;
  shoppingItemId: string;
  price: number;
  recordedDate: Date;
  source?: string; // e.g., 'purchase', 'manual', 'estimate'
  createdAt?: Date;
}

const priceHistorySchema = new mongoose.Schema<IPriceHistory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    shoppingItemId: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    recordedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['purchase', 'manual', 'estimate'],
      default: 'purchase',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying item price history
priceHistorySchema.index({ userId: 1, shoppingItemId: 1, recordedDate: -1 });

export const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', priceHistorySchema);
