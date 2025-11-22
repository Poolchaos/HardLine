import mongoose from 'mongoose';
import { IUser } from '../types';

const userSchema = new mongoose.Schema<IUser>({
  income: {
    type: Number,
    required: true,
    min: 0,
  },
  savingsBaseGoal: {
    type: Number,
    required: true,
    min: 0,
  },
  penaltySystemEnabled: {
    type: Boolean,
    default: true,
  },
  payday: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
  },
  sisterSubsidyCap: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
