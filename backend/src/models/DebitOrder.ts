import mongoose from 'mongoose';

export type DebitOrderPriority = 'critical' | 'important' | 'optional';
export type DebitOrderStatus = 'active' | 'paused' | 'cancelled';

export interface IDebitOrder {
  _id?: string;
  userId: string;
  name: string;
  amount: number;
  debitDate: number; // Day of month (1-31)
  priority: DebitOrderPriority;
  status: DebitOrderStatus;
  autoDebit: boolean;
  lastDebited?: Date;
  nextDebitDate?: Date;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const debitOrderSchema = new mongoose.Schema<IDebitOrder>({
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
  debitDate: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
  },
  priority: {
    type: String,
    enum: ['critical', 'important', 'optional'] as DebitOrderPriority[],
    required: true,
    default: 'important',
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'] as DebitOrderStatus[],
    required: true,
    default: 'active',
  },
  autoDebit: {
    type: Boolean,
    default: true,
  },
  lastDebited: {
    type: Date,
    required: false,
  },
  nextDebitDate: {
    type: Date,
    required: false,
  },
  description: {
    type: String,
    trim: true,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update nextDebitDate before saving
debitOrderSchema.pre('save', function(this: mongoose.Document & IDebitOrder, next: mongoose.CallbackWithoutResultAndOptionalError) {
  this.updatedAt = new Date();
  
  // Calculate next debit date if not set or if it's in the past
  if (!this.nextDebitDate || this.nextDebitDate < new Date()) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // If debit date hasn't passed this month, use this month
    // Otherwise use next month
    const targetMonth = today.getDate() < this.debitDate ? currentMonth : currentMonth + 1;
    
    this.nextDebitDate = new Date(currentYear, targetMonth, this.debitDate);
  }
  
  next();
});

export const DebitOrder = mongoose.model<IDebitOrder>('DebitOrder', debitOrderSchema);
