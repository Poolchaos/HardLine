import { body, param, query, ValidationChain } from 'express-validator';

export const createTransactionValidation: ValidationChain[] = [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  // For expense transactions
  body('category')
    .if(body('type').equals('expense'))
    .isIn(['Essential', 'Discretionary', 'WorkAI', 'Startup', 'Food', 'Entertainment'])
    .withMessage('Invalid category'),
  // For income transactions
  body('incomeSource')
    .if(body('type').equals('income'))
    .isIn(['Salary', 'Sister', 'SideProject', 'Other'])
    .withMessage('Invalid income source'),
];

export const updateUserValidation: ValidationChain[] = [
  body('name').optional().trim().notEmpty().withMessage('Name is required'),
  body('payday').optional().isInt({ min: 1, max: 31 }).withMessage('Payday must be between 1-31'),
];

export const createFixedExpenseValidation: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('debitDay').isInt({ min: 1, max: 31 }).withMessage('Debit day must be between 1 and 31'),
];

export const updateFixedExpenseValidation: ValidationChain[] = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('debitDay').optional().isInt({ min: 1, max: 31 }).withMessage('Debit day must be between 1 and 31'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

export const createShoppingItemValidation: ValidationChain[] = [
  body('globalItemId').notEmpty().withMessage('Global item ID is required'),
  body('cycle')
    .isIn(['MonthStart', 'MidMonth', 'Both'])
    .withMessage('Invalid cycle'),
  body('isDiabeticFriendly').optional().isBoolean().withMessage('Must be boolean'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const monthQueryValidation: ValidationChain[] = [
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
];

export const idParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];
