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
      availableToSpend: 15000,
      savingsGoal: {
        base: 5000,
        penalties: 0,
        total: 5000,
      },
      daysUntilPayday: 10,
      currentPenalties: {
        takeaways: 0,
        snacks: 0,
        total: 0,
      },
    });

    render(<Dashboard />);

    const amount = await screen.findByText(/R15000\.00/);
    expect(amount).toBeInTheDocument();

    const days = await screen.findByText(/10 days until payday/);
    expect(days).toBeInTheDocument();
  });

  it('should show penalty alert when penalties exist', async () => {
    vi.mocked(budgetApi.getDashboard).mockResolvedValue({
      availableToSpend: 10000,
      savingsGoal: {
        base: 5000,
        penalties: 1000,
        total: 6000,
      },
      daysUntilPayday: 5,
      currentPenalties: {
        takeaways: 500,
        snacks: 500,
        total: 1000,
      },
    });

    render(<Dashboard />);

    const alert = await screen.findByText(/Active Penalties/);
    expect(alert).toBeInTheDocument();

    const penaltyAmount = await screen.findByText(/R1000\.00 in penalties/);
    expect(penaltyAmount).toBeInTheDocument();
  });

  it('should show encouragement when no penalties', async () => {
    vi.mocked(budgetApi.getDashboard).mockResolvedValue({
      availableToSpend: 15000,
      savingsGoal: {
        base: 5000,
        penalties: 0,
        total: 5000,
      },
      daysUntilPayday: 10,
      currentPenalties: {
        takeaways: 0,
        snacks: 0,
        total: 0,
      },
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
