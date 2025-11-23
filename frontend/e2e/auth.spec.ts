import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form by default', async ({ page }) => {
    // Verify Sign In tab is active
    const signInTab = page.getByTestId('tab-signin');
    await expect(signInTab).toBeVisible();
    
    // Verify form fields are present
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    
    // Verify submit button shows "Sign In"
    await expect(page.getByTestId('submit-button')).toHaveText('Sign In');
  });  test('should switch to signup form', async ({ page }) => {
    // Click Sign Up tab
    await page.getByTestId('tab-signup').click();

    // Verify form shows all registration fields
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('#payday')).toBeVisible();

    // Verify submit button shows "Create Account"
    await expect(page.getByTestId('submit-button')).toHaveText('Create Account');
  });

  test('should validate email format on login', async ({ page }) => {
    const emailInput = page.locator('#email');

    // Enter invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Check for validation error
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should validate password length on login', async ({ page }) => {
    const passwordInput = page.locator('#password');

    // Enter short password
    await passwordInput.fill('123');
    await passwordInput.blur();

    // Check for validation error
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;

    // Switch to signup
    await page.getByTestId('tab-signup').click();

    // Fill registration form
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await page.locator('#payday').fill('25');

    // Submit form
    await page.getByTestId('submit-button').click();
    
    // Wait for redirect to dashboard - look for heading specifically
    await expect(page.locator('#available-heading')).toBeVisible({ timeout: 10000 });
  });  test('should validate password confirmation on signup', async ({ page }) => {
    // Switch to signup
    await page.getByTestId('tab-signup').click();

    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different');
    await page.locator('#confirmPassword').blur();

    // Check for mismatch error
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should validate required fields on signup', async ({ page }) => {
    // Switch to signup
    await page.getByTestId('tab-signup').click();

    // Fill email to focus then blur
    await page.locator('#email').fill('');
    await page.locator('#email').blur();

    // Check for validation error
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password');

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button (eye icon button next to password field)
    const toggleButton = page.locator('button[type="button"]').filter({
      has: page.locator('svg path[d*="M15 12"]')
    });
    await toggleButton.click();

    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('nonexistent@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByTestId('submit-button').click();

    // Wait for error message
    await expect(page.getByText(/Authentication Error|Invalid|not found/i)).toBeVisible({ timeout: 5000 });
  });
});
