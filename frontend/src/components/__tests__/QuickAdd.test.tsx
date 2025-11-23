import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickAdd from '../QuickAdd';
import { transactionApi, shoppingApi } from '../../lib/api';

// Mock the API modules
vi.mock('../../lib/api', () => ({
  transactionApi: {
    create: vi.fn(),
  },
  shoppingApi: {
    getAllLists: vi.fn(),
    getAllItems: vi.fn(),
  },
}));

describe('QuickAdd Component', () => {
  const mockOnClose = vi.fn();
  const mockShoppingLists = [
    { _id: 'list1', userId: 'user1', name: 'Weekly Groceries', description: 'Regular items', isActive: true, sortOrder: 0, createdAt: new Date() },
    { _id: 'list2', userId: 'user1', name: 'Monthly Bulk', description: 'Bulk purchases', isActive: true, sortOrder: 1, createdAt: new Date() },
  ];

  const mockShoppingItems = [
    { _id: 'item1', userId: 'user1', listId: 'list1', name: 'Milk', category: 'Fridge' as any, cycle: 'MonthStart' as any, typicalCost: 25.50, isDiabeticFriendly: false, isActive: true },
    { _id: 'item2', userId: 'user1', listId: 'list1', name: 'Bread', category: 'Pantry' as any, cycle: 'MonthStart' as any, typicalCost: 15.00, isDiabeticFriendly: false, isActive: true },
    { _id: 'item3', userId: 'user1', listId: 'list1', name: 'Cleaning Spray', category: 'Cleaning' as any, cycle: 'MonthStart' as any, typicalCost: 35.00, isDiabeticFriendly: false, isActive: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shoppingApi.getAllLists).mockResolvedValue(mockShoppingLists);
    vi.mocked(shoppingApi.getAllItems).mockResolvedValue(mockShoppingItems);
    vi.mocked(transactionApi.create).mockResolvedValue({ penaltyTriggered: false } as any);
  });

  describe('Basic Rendering', () => {
    it('should render modal with title', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      expect(screen.getByText('Add Transaction')).toBeInTheDocument();
      expect(screen.getByText('Record income or expense')).toBeInTheDocument();
    });

    it('should have fixed header with close button', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have fixed footer with Cancel and Submit buttons', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Add Expense')).toBeInTheDocument();
    });

    it('should close modal when clicking close button', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when clicking Cancel', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction Type Toggle', () => {
    it('should default to expense type', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      expect(screen.getByText('Add Expense')).toBeInTheDocument();
    });

    it('should switch to income type', async () => {
      render(<QuickAdd onClose={mockOnClose} />);
      const incomeButton = screen.getByText('💰 Income');
      fireEvent.click(incomeButton);
      await waitFor(() => {
        expect(screen.getByText('Add Income')).toBeInTheDocument();
      });
    });

    it('should show income source options when type is income', async () => {
      render(<QuickAdd onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('💰 Income'));
      await waitFor(() => {
        expect(screen.getByText('💼 Salary')).toBeInTheDocument();
        expect(screen.getByText('💰 Other Income')).toBeInTheDocument();
      });
    });

    it('should show category options when type is expense', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      expect(screen.getByText('🛒 Essential')).toBeInTheDocument();
      expect(screen.getByText('✨ Nice to Have')).toBeInTheDocument();
    });
  });

  describe('Income Transaction', () => {
    it('should create income transaction with correct data', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      // Switch to income
      fireEvent.click(screen.getByText('💰 Income'));

      // Fill in form
      await user.type(screen.getByLabelText(/Amount/i), '5000');
      await user.type(screen.getByLabelText(/Description/i), 'Monthly salary');

      // Submit
      fireEvent.click(screen.getByText('Add Income'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith({
          type: 'income',
          amount: 5000,
          description: 'Monthly salary',
          incomeSource: 'Salary',
        });
      });
    });

    it('should select Other income source', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('💰 Income'));
      fireEvent.click(screen.getByText('💰 Other Income'));

      await user.type(screen.getByLabelText(/Amount/i), '500');
      await user.type(screen.getByLabelText(/Description/i), 'Freelance work');

      fireEvent.click(screen.getByText('Add Income'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith({
          type: 'income',
          amount: 500,
          description: 'Freelance work',
          incomeSource: 'Other',
        });
      });
    });
  });

  describe('Manual Expense Transaction', () => {
    it('should create expense transaction without shopping list', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '150');
      await user.type(screen.getByLabelText(/Description/i), 'Groceries');
      fireEvent.click(screen.getByText('🛒 Essential'));

      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith({
          type: 'expense',
          amount: 150,
          description: 'Groceries',
          category: 'Essential',
        });
      });
    });

    it('should mark expense as wastage', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '50');
      await user.type(screen.getByLabelText(/Description/i), 'Snacks');

      // Check wastage checkbox
      const wastageCheckbox = screen.getByRole('checkbox', { name: /This is wastage/i });
      fireEvent.click(wastageCheckbox);

      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith({
          type: 'expense',
          amount: 50,
          description: 'Snacks',
          category: 'Essential',
          wastageAmount: 50,
          wastageType: 'Other',
          wastageNotes: 'Wastage: Snacks',
        });
      });
    });

    it('should select different categories', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '200');
      await user.type(screen.getByLabelText(/Description/i), 'New keyboard');

      fireEvent.click(screen.getByText('💻 Work/AI'));

      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'WorkAI',
          })
        );
      });
    });
  });

  describe('Shopping List Integration', () => {
    it('should load shopping lists on mount', async () => {
      render(<QuickAdd onClose={mockOnClose} />);
      await waitFor(() => {
        expect(shoppingApi.getAllLists).toHaveBeenCalled();
      });
    });

    it('should display shopping list dropdown', async () => {
      render(<QuickAdd onClose={mockOnClose} />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Use Shopping List/i)).toBeInTheDocument();
      });
    });

    it('should load items when shopping list is selected', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Use Shopping List/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Use Shopping List/i);
      fireEvent.change(select, { target: { value: 'list1' } });

      await waitFor(() => {
        expect(shoppingApi.getAllItems).toHaveBeenCalledWith('list1');
      });
    });

    it('should display shopping list items when list is selected', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByLabelText(/Use Shopping List/i);
        fireEvent.change(select, { target: { value: 'list1' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
        expect(screen.getByText('Bread')).toBeInTheDocument();
        expect(screen.getByText('Cleaning Spray')).toBeInTheDocument();
      });
    });

    it('should allow selecting items from shopping list', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByLabelText(/Use Shopping List/i);
        fireEvent.change(select, { target: { value: 'list1' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Find and click checkbox for Milk
      const checkboxes = screen.getAllByRole('checkbox');
      const milkCheckbox = checkboxes.find((cb) => {
        const parent = cb.closest('div');
        return parent?.textContent?.includes('Milk');
      });

      if (milkCheckbox) {
        fireEvent.click(milkCheckbox);
      }

      await waitFor(() => {
        expect(screen.getByText(/Selected Items:/i)).toBeInTheDocument();
      });
    });

    it('should show quantity and price inputs for selected items', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByLabelText(/Use Shopping List/i);
        fireEvent.change(select, { target: { value: 'list1' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Select item
      const checkboxes = screen.getAllByRole('checkbox');
      const milkCheckbox = checkboxes.find((cb) => {
        const parent = cb.closest('div');
        return parent?.textContent?.includes('Milk');
      });

      if (milkCheckbox) {
        fireEvent.click(milkCheckbox);
      }

      await waitFor(() => {
        expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
      });
    });

    it('should create transactions for all selected items', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      // Select shopping list
      await waitFor(() => {
        const select = screen.getByLabelText(/Use Shopping List/i);
        fireEvent.change(select, { target: { value: 'list1' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Select Milk
      const checkboxes = screen.getAllByRole('checkbox');
      const milkCheckbox = checkboxes.find((cb) => {
        const parent = cb.closest('div');
        return parent?.textContent?.includes('Milk');
      });

      if (milkCheckbox) {
        fireEvent.click(milkCheckbox);
      }

      // Wait for inputs to appear and modify quantity
      await waitFor(() => {
        const qtyInputs = screen.getAllByLabelText(/Quantity/i);
        if (qtyInputs.length > 0) {
          fireEvent.change(qtyInputs[0], { target: { value: '2' } });
        }
      });

      // Submit
      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'expense',
            category: 'Fridge',
            description: expect.stringContaining('Milk'),
          })
        );
      });
    });

    it('should mark individual items as wastage', async () => {
      render(<QuickAdd onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByLabelText(/Use Shopping List/i);
        fireEvent.change(select, { target: { value: 'list1' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Select item
      const checkboxes = screen.getAllByRole('checkbox');
      const milkCheckbox = checkboxes.find((cb) => {
        const parent = cb.closest('div');
        return parent?.textContent?.includes('Milk');
      });

      if (milkCheckbox) {
        fireEvent.click(milkCheckbox);
      }

      // Mark as wastage
      await waitFor(() => {
        const wastageCheckboxes = screen.getAllByRole('checkbox');
        const itemWastageCheckbox = wastageCheckboxes.find((cb) => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Wastage') && !label?.textContent?.includes('This is wastage');
        });

        if (itemWastageCheckbox) {
          fireEvent.click(itemWastageCheckbox);
        }
      });

      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(transactionApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            wastageAmount: expect.any(Number),
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when amount is empty', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Description/i), 'Test');
      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid amount/i)).toBeInTheDocument();
      });
    });

    it('should show error when amount is zero', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '0');
      await user.type(screen.getByLabelText(/Description/i), 'Test');
      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid amount/i)).toBeInTheDocument();
      });
    });

    it('should show error when description is empty', async () => {
      const user = userEvent.setup();
      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '100');
      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(screen.getByText(/Please enter a description/i)).toBeInTheDocument();
      });
    });
  });

  describe('Penalty Alert', () => {
    it('should show penalty alert when penalty is triggered', async () => {
      const user = userEvent.setup();
      vi.mocked(transactionApi.create).mockResolvedValue({ penaltyTriggered: true } as any);

      render(<QuickAdd onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/Amount/i), '1000');
      await user.type(screen.getByLabelText(/Description/i), 'Big purchase');
      fireEvent.click(screen.getByText('Add Expense'));

      await waitFor(() => {
        expect(screen.getByText(/Penalty Applied!/i)).toBeInTheDocument();
        expect(screen.getByText(/R500 added to penalties/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuickAdd onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('should focus amount input on mount', async () => {
      render(<QuickAdd onClose={mockOnClose} />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Amount/i)).toHaveFocus();
      });
    });
  });
});
