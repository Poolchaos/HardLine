import mongoose from 'mongoose';
import { IGlobalItem, ShoppingCategory, UOM } from '../types';

const globalItemSchema = new mongoose.Schema<IGlobalItem>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Cleaning', 'Pantry', 'Fridge'] as ShoppingCategory[],
    index: true,
  },
  uom: {
    type: String,
    required: true,
    enum: ['L', 'ml', 'kg', 'g', 'units', 'pack', 'dozen', 'box', 'bag', 'bottle', 'can'] as UOM[],
  },
  packageSize: {
    type: Number,
    min: 0,
  },
  packageType: {
    type: String,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
    index: true,
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: String,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Text index for search functionality
globalItemSchema.index({ name: 'text', brand: 'text' });

// Compound index for common queries
globalItemSchema.index({ isActive: 1, category: 1, name: 1 });

export const GlobalItem = mongoose.model<IGlobalItem>('GlobalItem', globalItemSchema);
