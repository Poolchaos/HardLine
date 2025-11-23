import { FixedExpense } from '../models/FixedExpense';
import { Transaction } from '../models/Transaction';
import logger from '../config/logger';

/**
 * Process auto-debits for all active fixed expenses
 * This should be run daily via cron job
 */
export async function processAutoDebits(): Promise<void> {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  logger.info(`Processing auto-debits for day ${currentDay} of ${currentMonth + 1}/${currentYear}`);

  try {
    // Find all active fixed expenses that should be debited today
    const expensesToDebit = await FixedExpense.find({
      isActive: true,
      debitDay: currentDay,
    });

    logger.info(`Found ${expensesToDebit.length} expenses to process`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const expense of expensesToDebit) {
      try {
        // Check if already debited this month
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

        // Check if lastDebited is within current month
        if (expense.lastDebited) {
          const lastDebitMonth = expense.lastDebited.getMonth();
          const lastDebitYear = expense.lastDebited.getFullYear();

          if (lastDebitMonth === currentMonth && lastDebitYear === currentYear) {
            logger.info(`Expense "${expense.name}" already debited this month, skipping`);
            skipCount++;
            continue;
          }
        }

        // Also check if a transaction already exists for this expense this month
        const existingTransaction = await Transaction.findOne({
          userId: expense.userId,
          type: 'expense',
          description: `Auto-debit: ${expense.name}`,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        if (existingTransaction) {
          logger.info(`Transaction already exists for "${expense.name}" this month, updating lastDebited`);
          expense.lastDebited = today;
          await expense.save();
          skipCount++;
          continue;
        }

        // Create the transaction
        const transaction = new Transaction({
          userId: expense.userId,
          type: 'expense',
          date: today,
          amount: expense.amount,
          description: `Auto-debit: ${expense.name}`,
          category: 'Essential', // Fixed expenses are typically essential
        });

        await transaction.save();

        // Update lastDebited timestamp
        expense.lastDebited = today;
        await expense.save();

        logger.info(`Successfully debited ${expense.amount} for "${expense.name}" (User: ${expense.userId})`);
        successCount++;

      } catch (error: any) {
        logger.error(`Error processing expense "${expense.name}":`, error);
        errorCount++;
      }
    }

    logger.info(`Auto-debit processing complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);

  } catch (error: any) {
    logger.error('Error in processAutoDebits:', error);
    throw error;
  }
}

/**
 * Manually trigger auto-debit for a specific expense
 * Useful for testing or manual intervention
 */
export async function manualDebit(expenseId: string): Promise<boolean> {
  try {
    const expense = await FixedExpense.findById(expenseId);

    if (!expense) {
      logger.error(`Expense ${expenseId} not found`);
      return false;
    }

    if (!expense.isActive) {
      logger.error(`Expense ${expenseId} is not active`);
      return false;
    }

    const today = new Date();
    const transaction = new Transaction({
      userId: expense.userId,
      type: 'expense',
      date: today,
      amount: expense.amount,
      description: `Manual debit: ${expense.name}`,
      category: 'Essential',
    });

    await transaction.save();

    expense.lastDebited = today;
    await expense.save();

    logger.info(`Manual debit successful for "${expense.name}"`);
    return true;

  } catch (error: any) {
    logger.error(`Error in manualDebit for ${expenseId}:`, error);
    return false;
  }
}
