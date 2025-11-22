import mongoose from 'mongoose';
import { IFixedExpense } from '../types';

const fixedExpenseSchema = new mongoose.Schema<IFixedExpense>({
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
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const FixedExpense = mongoose.model<IFixedExpense>('FixedExpense', fixedExpenseSchema);
