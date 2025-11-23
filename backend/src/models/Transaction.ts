import mongoose from 'mongoose';
import { ITransaction, Category, TransactionType, IncomeSource, WastageType } from '../types';

const transactionSchema = new mongoose.Schema<ITransaction>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense'] as TransactionType[],
    default: 'expense',
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
  // For expense transactions
  category: {
    type: String,
    enum: ['Essential', 'Discretionary', 'WorkAI', 'Startup', 'Food', 'Entertainment'] as Category[],
    required: function(this: ITransaction) { return this.type === 'expense'; },
  },
  // For income transactions
  incomeSource: {
    type: String,
    enum: ['Salary', 'Other'] as IncomeSource[],
    required: function(this: ITransaction) { return this.type === 'income'; },
  },
  // Wastage tracking
  wastageAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  wastageType: {
    type: String,
    enum: ['DeliveryFee', 'Tip', 'AppFee', 'ServiceCharge', 'Other'] as WastageType[],
  },
  wastageNotes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient month-based queries
transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
