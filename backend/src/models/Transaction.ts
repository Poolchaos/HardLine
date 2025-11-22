import mongoose from 'mongoose';
import { ITransaction, Category, Consumer } from '../types';

const transactionSchema = new mongoose.Schema<ITransaction>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Essential', 'NiceToHave', 'WorkAI', 'Startup', 'Snack', 'Takeaway'] as Category[],
  },
  consumer: {
    type: String,
    required: true,
    enum: ['MeMom', 'Household', 'SisterBF'] as Consumer[],
  },
  isPenaltyTrigger: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient month-based queries
transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
