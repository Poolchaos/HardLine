import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../src/components/Dashboard';
import { budgetApi } from '../src/lib/api';

// Mock the API
vi.mock('../src/lib/api', () => ({
  budgetApi: {
    getDashboard: vi.fn(),
  },
}));

describe('Dashboard', () => {
  it('should render loading state initially', () => {
    vi.mocked(budgetApi.getDashboard).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Dashboard />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('should display available to spend amount', async () => {
    vi.mocked(budgetApi.getDashboard).mockResolvedValue({
      availableBalance: 15000,
      totalIncome: 30000,
      totalSpent: 5000,
      fixedExpenses: 8000,
      totalWastage: 2000,
      daysUntilPayday: 10,
    });

    render(<Dashboard />);

    const amount = await screen.findByText(/R15000\.00/);
    expect(amount).toBeInTheDocument();

    const days = await screen.findByText(/10 days until payday/);
    expect(days).toBeInTheDocument();
  });

  it('should show penalty alert when penalties exist', async () => {
    vi.mocked(budgetApi.getDashboard).mockResolvedValue({
      availableBalance: 10000,
      totalIncome: 30000,
      totalSpent: 8000,
      fixedExpenses: 10000,
      totalWastage: 2000,
      daysUntilPayday: 5,
    });

    render(<Dashboard />);

    const alert = await screen.findByText(/Active Penalties/);
    expect(alert).toBeInTheDocument();

    const penaltyAmount = await screen.findByText(/R1000\.00 in penalties/);
    expect(penaltyAmount).toBeInTheDocument();
  });

  it('should show encouragement when no penalties', async () => {
    vi.mocked(budgetApi.getDashboard).mockResolvedValue({
      availableBalance: 15000,
      totalIncome: 30000,
      totalSpent: 5000,
      fixedExpenses: 8000,
      totalWastage: 2000,
      daysUntilPayday: 10,
    });

    render(<Dashboard />);

    const encouragement = await screen.findByText(/Great job!/);
    expect(encouragement).toBeInTheDocument();
  });

  it('should display error message on API failure', async () => {
    vi.mocked(budgetApi.getDashboard).mockRejectedValue(
      new Error('Network error')
    );

    render(<Dashboard />);

    const errorMsg = await screen.findByText(/Error loading dashboard/);
    expect(errorMsg).toBeInTheDocument();

    const details = await screen.findByText(/Network error/);
    expect(details).toBeInTheDocument();
  });
});
