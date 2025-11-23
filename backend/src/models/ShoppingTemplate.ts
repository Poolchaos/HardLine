import mongoose from 'mongoose';

export interface ITemplateItem {
  shoppingItemId: string;
  quantity: number;
}

export interface IShoppingTemplate {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  items: ITemplateItem[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const templateItemSchema = new mongoose.Schema<ITemplateItem>(
  {
    shoppingItemId: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const shoppingTemplateSchema = new mongoose.Schema<IShoppingTemplate>(
  {
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
    description: {
      type: String,
      trim: true,
    },
    items: {
      type: [templateItemSchema],
      required: true,
      validate: {
        validator: (v: ITemplateItem[]) => v.length > 0,
        message: 'Template must have at least one item',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user/template name
shoppingTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

export const ShoppingTemplate = mongoose.model<IShoppingTemplate>(
  'ShoppingTemplate',
  shoppingTemplateSchema
);
