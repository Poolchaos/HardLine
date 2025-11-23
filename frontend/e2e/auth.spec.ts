import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('invalid-email');
    await page.getByPlaceholder('Email').blur();

    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should validate password length on login', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('123');
    await page.getByPlaceholder('Password').blur();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('should switch to register form', async ({ page }) => {
    await page.getByText('Create Account').click();

    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByPlaceholder('Full Name')).toBeVisible();
    await expect(page.getByPlaceholder('Payday')).toBeVisible();
  });

  test('should validate password confirmation on register', async ({ page }) => {
    await page.getByText('Create Account').click();

    await page.getByPlaceholder('Full Name').fill('Test User');
    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('password123');
    await page.getByPlaceholder('Confirm Password').fill('different');
    await page.getByPlaceholder('Confirm Password').blur();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;

    await page.getByText('Create Account').click();

    await page.getByPlaceholder('Full Name').fill('Test User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill('password123');
    await page.getByPlaceholder('Confirm Password').fill('password123');
    await page.getByPlaceholder('Payday').fill('25');

    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should redirect to dashboard
    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should successfully login with existing user', async ({ page, context }) => {
    // First register a user
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'password123';

    await page.getByText('Create Account').click();
    await page.getByPlaceholder('Full Name').fill('Test User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(password);
    await page.getByPlaceholder('Confirm Password').fill(password);
    await page.getByPlaceholder('Payday').fill('25');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible({ timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();

    // Should show login form
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    // Login
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Should be back on dashboard
    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('nonexistent@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('should persist authentication on page reload', async ({ page }) => {
    // Register and login
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;

    await page.getByText('Create Account').click();
    await page.getByPlaceholder('Full Name').fill('Test User');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill('password123');
    await page.getByPlaceholder('Confirm Password').fill('password123');
    await page.getByPlaceholder('Payday').fill('25');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.getByRole('heading', { name: 'Available Balance' })).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Password');

    // Should be type password by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password button
    await page.getByRole('button', { name: /show password/i }).first().click();

    // Should change to text
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.getByRole('button', { name: /hide password/i }).first().click();

    // Should be password again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
