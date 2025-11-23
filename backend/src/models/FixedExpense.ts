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
  debitDay: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastDebited: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
});

export const FixedExpense = mongoose.model<IFixedExpense>('FixedExpense', fixedExpenseSchema);
