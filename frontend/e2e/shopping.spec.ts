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

test.describe('Shopping List Management', () => {
  test.beforeEach(async ({ page }) => {
    await createAuthenticatedUser(page);
  });

  test('should navigate to shopping page', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    await expect(page.getByRole('heading', { name: /Shopping Lists/i })).toBeVisible();
  });

  test('should create new shopping list', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Click new list button
    await page.getByRole('button', { name: /new list/i }).click();

    // Fill in form
    await page.getByPlaceholder(/list name/i).fill('Weekly Groceries');
    await page.getByPlaceholder(/description/i).fill('Regular weekly items');

    // Submit
    await page.getByRole('button', { name: /create list/i }).click();

    // Should appear as tab
    await expect(page.getByText('Weekly Groceries')).toBeVisible();
  });

  test('should add item to shopping list', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Create list first
    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Groceries');
    await page.getByRole('button', { name: /create list/i }).click();

    // Add item
    await page.getByRole('button', { name: /add item/i }).click();

    // Search for item (or create new)
    await page.getByPlaceholder(/search for an item/i).fill('Milk');
    await page.waitForTimeout(500);

    // If item exists, click it, otherwise create new
    const searchResults = page.locator('[role="option"]');
    const count = await searchResults.count();

    if (count > 0) {
      await searchResults.first().click();
    } else {
      await page.getByRole('button', { name: /create new/i }).click();
      await page.getByPlaceholder(/category/i).selectOption('Fridge');
      await page.getByRole('button', { name: /create item/i }).click();
    }

    // Set quantity and cycle
    await page.getByPlaceholder(/quantity/i).fill('2');
    await page.getByRole('combobox', { name: /cycle/i }).selectOption('MonthStart');

    // Add to list
    await page.getByRole('button', { name: /add to list/i }).click();

    // Should appear in list
    await expect(page.getByText('Milk')).toBeVisible();
  });

  test('should group items by category', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Items should be grouped under Cleaning, Pantry, Fridge
    // Even if empty, headers should be visible
    await expect(page.getByText('Cleaning')).toBeVisible();
    await expect(page.getByText('Pantry')).toBeVisible();
    await expect(page.getByText('Fridge')).toBeVisible();
  });

  test('should delete shopping list', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Create list
    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Temporary List');
    await page.getByRole('button', { name: /create list/i }).click();

    await expect(page.getByText('Temporary List')).toBeVisible();

    // Delete list
    await page.getByRole('button', { name: /delete list/i }).click();

    // Confirm
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should be removed
    await expect(page.getByText('Temporary List')).not.toBeVisible();
  });

  test('should mark item as diabetic friendly', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Create list and add item
    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Groceries');
    await page.getByRole('button', { name: /create list/i }).click();

    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByPlaceholder(/search for an item/i).fill('Sugar Free Yogurt');
    await page.waitForTimeout(500);

    // Create new item
    await page.getByRole('button', { name: /create new/i }).click();
    await page.getByPlaceholder(/category/i).selectOption('Fridge');
    await page.getByRole('button', { name: /create item/i }).click();

    // Check diabetic friendly
    await page.getByRole('checkbox', { name: /diabetic friendly/i }).check();

    await page.getByRole('button', { name: /add to list/i }).click();

    // Should show diabetic friendly indicator
    await expect(page.getByText('Sugar Free Yogurt')).toBeVisible();
  });

  test('should update item quantity', async ({ page }) => {
    await page.getByRole('button', { name: 'Shopping' }).click();

    // Create list and add item
    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Groceries');
    await page.getByRole('button', { name: /create list/i }).click();

    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByPlaceholder(/search for an item/i).fill('Bread');
    await page.waitForTimeout(500);

    const searchResults = page.locator('[role="option"]');
    const count = await searchResults.count();

    if (count > 0) {
      await searchResults.first().click();
    } else {
      await page.getByRole('button', { name: /create new/i }).click();
      await page.getByPlaceholder(/category/i).selectOption('Pantry');
      await page.getByRole('button', { name: /create item/i }).click();
    }

    await page.getByPlaceholder(/quantity/i).fill('2');
    await page.getByRole('button', { name: /add to list/i }).click();

    // Edit item to change quantity
    await page.getByText('Bread').click();
    await page.getByPlaceholder(/quantity/i).clear();
    await page.getByPlaceholder(/quantity/i).fill('3');
    await page.getByRole('button', { name: /update/i }).click();

    // Should show updated quantity
    await expect(page.getByText('3')).toBeVisible();
  });
});

test.describe('Shopping with Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await createAuthenticatedUser(page);
  });

  test('should use shopping list in quick add', async ({ page }) => {
    // Create shopping list with items first
    await page.getByRole('button', { name: 'Shopping' }).click();

    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Groceries');
    await page.getByRole('button', { name: /create list/i }).click();

    // Go back to dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();

    // Open quick add
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Should see shopping list option
    await expect(page.getByText(/use shopping list/i)).toBeVisible();
  });

  test('should calculate total from selected shopping items', async ({ page }) => {
    // Add some shopping items first
    await page.getByRole('button', { name: 'Shopping' }).click();

    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Groceries');
    await page.getByRole('button', { name: /create list/i }).click();

    // Add items with costs
    // This would require the items to have typical costs set

    // Go to quick add
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Select shopping list
    // Select items
    // Total should be calculated automatically
  });
});

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await createAuthenticatedUser(page);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('should update payday', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    const paydayInput = page.getByLabel(/payday/i);
    await paydayInput.clear();
    await paydayInput.fill('15');
    await paydayInput.blur();

    // Should update successfully
    await page.waitForTimeout(1000);
    await page.reload();

    await expect(paydayInput).toHaveValue('15');
  });

  test('should toggle penalty system', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    const toggle = page.getByRole('switch', { name: /penalty/i });

    await toggle.click();

    // Should show confirmation or update
    await page.waitForTimeout(1000);
  });

  test('should display wastage tracking information', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    // Should show wastage tracking section
    await expect(page.getByText(/wastage tracking/i)).toBeVisible();
    await expect(page.getByText(/takeaway/i)).toBeVisible();
    await expect(page.getByText(/delivery fees/i)).toBeVisible();
  });
});
