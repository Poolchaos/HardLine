import { test, expect } from '@playwright/test';

// Helper to create authenticated user
async function createAuthenticatedUser(page: any) {
  const timestamp = Date.now();
  const email = `test${timestamp}@example.com`;

  await page.goto('/');
  await page.getByText('Create Account').click();
  await page.getByPlaceholder('Full Name').fill('Test User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill('password123');
  await page.getByPlaceholder('Confirm Password').fill('password123');
  await page.getByPlaceholder('Payday').fill('25');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible({ timeout: 10000 });

  return { email };
}

test.describe('Expense Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await createAuthenticatedUser(page);
  });

  test('should show dashboard with initial zero balance', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible();
    await expect(page.getByText('R0.00')).toBeVisible();
  });

  test('should add income transaction via quick add', async ({ page }) => {
    // Click floating action button
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Switch to income
    await page.getByRole('button', { name: 'Income' }).click();

    // Fill in income details
    await page.getByPlaceholder(/amount/i).fill('20000');
    await page.getByPlaceholder(/description/i).fill('Salary');

    // Submit
    await page.getByRole('button', { name: /add income/i }).click();

    // Should close modal and update dashboard
    await expect(page.getByText('R20,000.00')).toBeVisible({ timeout: 5000 });
  });

  test('should add expense transaction', async ({ page }) => {
    // Add income first
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByPlaceholder(/amount/i).fill('20000');
    await page.getByPlaceholder(/description/i).fill('Salary');
    await page.getByRole('button', { name: /add income/i }).click();
    await expect(page.getByText('R20,000.00')).toBeVisible({ timeout: 5000 });

    // Add expense
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByPlaceholder(/amount/i).fill('500');
    await page.getByPlaceholder(/description/i).fill('Groceries');

    // Select category
    await page.getByText('Essential').click();

    // Submit
    await page.getByRole('button', { name: /add expense/i }).click();

    // Balance should be updated (20000 - 500 = 19500)
    await expect(page.getByText('R19,500.00')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to transaction history', async ({ page }) => {
    // Add a transaction first
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByPlaceholder(/amount/i).fill('20000');
    await page.getByPlaceholder(/description/i).fill('Salary');
    await page.getByRole('button', { name: /add income/i }).click();

    // Navigate to history
    await page.getByRole('button', { name: 'History' }).click();

    await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
    await expect(page.getByText('Salary')).toBeVisible();
    await expect(page.getByText('R20,000.00')).toBeVisible();
  });

  test('should filter transactions by category', async ({ page }) => {
    // Add multiple transactions
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByPlaceholder(/amount/i).fill('20000');
    await page.getByPlaceholder(/description/i).fill('Salary');
    await page.getByRole('button', { name: /add income/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByPlaceholder(/amount/i).fill('500');
    await page.getByPlaceholder(/description/i).fill('Groceries');
    await page.getByText('Essential').click();
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByPlaceholder(/amount/i).fill('200');
    await page.getByPlaceholder(/description/i).fill('Snacks');
    await page.getByText('Snack').click();
    await page.getByRole('button', { name: /add expense/i }).click();

    // Go to history
    await page.getByRole('button', { name: 'History' }).click();

    // Should show all transactions
    await expect(page.getByText('Salary')).toBeVisible();
    await expect(page.getByText('Groceries')).toBeVisible();
    await expect(page.getByText('Snacks')).toBeVisible();
  });

  test('should track wastage amount', async ({ page }) => {
    // Add expense with wastage
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByPlaceholder(/amount/i).fill('150');
    await page.getByPlaceholder(/description/i).fill('Takeaway');
    await page.getByText('Takeaway').click();

    // Add wastage (delivery fee)
    await page.getByText('Add Wastage').click();
    await page.getByPlaceholder(/wastage amount/i).fill('30');

    await page.getByRole('button', { name: /add expense/i }).click();

    // Check dashboard shows wastage
    await expect(page.getByText(/wastage/i)).toBeVisible();
    await expect(page.getByText('R30.00')).toBeVisible();
  });
});

test.describe('Fixed Expenses Management', () => {
  test.beforeEach(async ({ page }) => {
    await createAuthenticatedUser(page);
  });

  test('should navigate to fixed expenses tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    await expect(page.getByRole('heading', { name: /Fixed Expenses/i })).toBeVisible();
  });

  test('should add new fixed expense', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    // Click Add Expense button
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Fill in form
    await page.getByPlaceholder(/expense name/i).fill('Rent');
    await page.getByPlaceholder(/monthly amount/i).fill('8500');
    await page.getByPlaceholder(/debit day/i).fill('1');

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Should appear in list
    await expect(page.getByText('Rent')).toBeVisible();
    await expect(page.getByText('R8,500.00/month')).toBeVisible();
    await expect(page.getByText('Debits on day 1')).toBeVisible();
  });

  test('should edit fixed expense', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    // Add expense first
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.getByPlaceholder(/expense name/i).fill('Rent');
    await page.getByPlaceholder(/monthly amount/i).fill('8500');
    await page.getByPlaceholder(/debit day/i).fill('1');
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Wait for expense to appear
    await expect(page.getByText('Rent')).toBeVisible();

    // Hover to show edit button
    await page.getByText('Rent').hover();

    // Click edit
    await page.getByRole('button', { name: 'Edit expense' }).click();

    // Update amount
    await page.getByPlaceholder(/monthly amount/i).clear();
    await page.getByPlaceholder(/monthly amount/i).fill('9000');

    await page.getByRole('button', { name: 'Update Expense' }).click();

    // Should show updated amount
    await expect(page.getByText('R9,000.00/month')).toBeVisible();
  });

  test('should delete fixed expense with confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    // Add expense
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.getByPlaceholder(/expense name/i).fill('Cancelled Gym');
    await page.getByPlaceholder(/monthly amount/i).fill('500');
    await page.getByPlaceholder(/debit day/i).fill('15');
    await page.getByRole('button', { name: 'Add Expense' }).click();

    await expect(page.getByText('Cancelled Gym')).toBeVisible();

    // Hover and click delete
    await page.getByText('Cancelled Gym').hover();
    await page.getByRole('button', { name: 'Delete expense' }).click();

    // Confirm deletion
    await expect(page.getByText(/Are you sure/i)).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should be removed
    await expect(page.getByText('Cancelled Gym')).not.toBeVisible();
  });

  test('should toggle expense active status', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    // Add expense
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.getByPlaceholder(/expense name/i).fill('Gym');
    await page.getByPlaceholder(/monthly amount/i).fill('500');
    await page.getByPlaceholder(/debit day/i).fill('15');
    await page.getByRole('button', { name: 'Add Expense' }).click();

    await expect(page.getByText('Active')).toBeVisible();

    // Click to toggle
    await page.getByText('Gym').click();

    // Should show inactive
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('should validate debit day range', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();

    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.getByPlaceholder(/expense name/i).fill('Rent');
    await page.getByPlaceholder(/monthly amount/i).fill('8500');

    // Try invalid day
    await page.getByPlaceholder(/debit day/i).fill('32');

    // Submit button should be disabled or show error
    const submitButton = page.getByRole('button', { name: 'Add Expense' });
    await expect(submitButton).toBeDisabled();
  });
});
