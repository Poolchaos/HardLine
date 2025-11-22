import { body, param, query, ValidationChain } from 'express-validator';

export const createTransactionValidation: ValidationChain[] = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category')
    .isIn(['Essential', 'NiceToHave', 'WorkAI', 'Startup', 'Snack', 'Takeaway'])
    .withMessage('Invalid category'),
  body('consumer')
    .isIn(['MeMom', 'Household', 'SisterBF'])
    .withMessage('Invalid consumer'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

export const updateUserValidation: ValidationChain[] = [
  body('income').optional().isFloat({ min: 0 }).withMessage('Income must be positive'),
  body('savingsBaseGoal').optional().isFloat({ min: 0 }).withMessage('Savings goal must be positive'),
  body('penaltySystemEnabled').optional().isBoolean().withMessage('Must be boolean'),
  body('payday').optional().isInt({ min: 1, max: 31 }).withMessage('Payday must be between 1-31'),
  body('sisterSubsidyCap').optional().isFloat({ min: 0 }).withMessage('Subsidy cap must be positive'),
];

export const createFixedExpenseValidation: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
];

export const createShoppingItemValidation: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category')
    .isIn(['Cleaning', 'Pantry', 'Fridge'])
    .withMessage('Invalid category'),
  body('cycle')
    .isIn(['MonthStart', 'MidMonth', 'Both'])
    .withMessage('Invalid cycle'),
  body('isDiabeticFriendly').optional().isBoolean().withMessage('Must be boolean'),
  body('typicalCost').isFloat({ min: 0 }).withMessage('Typical cost must be positive'),
];

export const monthQueryValidation: ValidationChain[] = [
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
];

export const idParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];
