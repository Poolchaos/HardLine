import mongoose from 'mongoose';
import { ITransaction, Category, TransactionType, IncomeSource } from '../types';

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
    enum: ['Salary', 'Sister', 'SideProject', 'Other'] as IncomeSource[],
    required: function(this: ITransaction) { return this.type === 'income'; },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient month-based queries
transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
