import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShoppingManager from '../ShoppingManager';
import { shoppingApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  shoppingApi: {
    getAllLists: vi.fn(),
    getAllItems: vi.fn(),
    createList: vi.fn(),
    createItem: vi.fn(),
    deleteList: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

describe('ShoppingManager Component', () => {
  const mockLists = [
    { _id: 'list1', userId: 'user1', name: 'Weekly Groceries', description: 'Regular items', isActive: true, sortOrder: 0, createdAt: new Date() },
    { _id: 'list2', userId: 'user1', name: 'Monthly Bulk', description: 'Bulk purchases', isActive: true, sortOrder: 1, createdAt: new Date() },
  ];

  const mockItems = [
    { _id: 'item1', userId: 'user1', listId: 'list1', name: 'Milk', category: 'Fridge' as any, cycle: 'MonthStart' as any, typicalCost: 25.50, isDiabeticFriendly: false, isActive: true },
    { _id: 'item2', userId: 'user1', listId: 'list1', name: 'Bread', category: 'Pantry' as any, cycle: 'MonthStart' as any, typicalCost: 15.00, isDiabeticFriendly: false, isActive: true },
    { _id: 'item3', userId: 'user1', listId: 'list1', name: 'Cleaning Spray', category: 'Cleaning' as any, cycle: 'MonthStart' as any, typicalCost: 35.00, isDiabeticFriendly: false, isActive: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shoppingApi.getAllLists).mockResolvedValue(mockLists);
    vi.mocked(shoppingApi.getAllItems).mockResolvedValue(mockItems);
  });

  describe('Initial Rendering', () => {
    it('should show loading state initially', () => {
      render(<ShoppingManager />);
      expect(screen.getByText(/Loading shopping items/i)).toBeInTheDocument();
    });

    it('should render header with title', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('Shopping Lists')).toBeInTheDocument();
        expect(screen.getByText(/Manage your recurring shopping items/i)).toBeInTheDocument();
      });
    });

    it('should load shopping lists on mount', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(shoppingApi.getAllLists).toHaveBeenCalled();
      });
    });

    it('should load items for first list automatically', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(shoppingApi.getAllItems).toHaveBeenCalledWith('list1');
      });
    });
  });

  describe('List Management', () => {
    it('should display all shopping lists as tabs', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('Weekly Groceries')).toBeInTheDocument();
        expect(screen.getByText('Monthly Bulk')).toBeInTheDocument();
      });
    });

    it('should show add list button', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('+ New List')).toBeInTheDocument();
      });
    });

    it('should open add list form when clicking new list button', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        const newListButton = screen.getByText('+ New List');
        fireEvent.click(newListButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Shopping List')).toBeInTheDocument();
      });
    });

    it('should create new shopping list', async () => {
      const user = userEvent.setup();
      const newList = { _id: 'list3', userId: 'user1', name: 'Test List', description: 'Test', isActive: true, sortOrder: 2, createdAt: new Date() };
      vi.mocked(shoppingApi.createList).mockResolvedValue(newList);

      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ New List'));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/List Name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/List Name/i), 'Test List');
      await user.type(screen.getByLabelText(/Description/i), 'Test description');

      const createButton = screen.getByText('Create List');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(shoppingApi.createList).toHaveBeenCalledWith({
          name: 'Test List',
          description: 'Test description',
        });
      });
    });

    it('should switch between lists', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Groceries')).toBeInTheDocument();
      });

      const monthlyTab = screen.getByText('Monthly Bulk');
      fireEvent.click(monthlyTab);

      await waitFor(() => {
        expect(shoppingApi.getAllItems).toHaveBeenCalledWith('list2');
      });
    });

    it('should delete shopping list with confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(shoppingApi.deleteList).mockResolvedValue(undefined);

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Groceries')).toBeInTheDocument();
      });

      // Find delete button (should be × button on the list tab)
      const deleteButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '×');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      }

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(shoppingApi.deleteList).toHaveBeenCalledWith('list1');
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Item Management', () => {
    it('should display items grouped by category', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
        expect(screen.getByText('Bread')).toBeInTheDocument();
        expect(screen.getByText('Cleaning Spray')).toBeInTheDocument();
      });
    });

    it('should show add item button', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('+ Add Item')).toBeInTheDocument();
      });
    });

    it('should open add item form', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Item'));
      });

      await waitFor(() => {
        expect(screen.getByText('Add Shopping Item')).toBeInTheDocument();
      });
    });

    it('should create new shopping item', async () => {
      const user = userEvent.setup();
      const newItem = { _id: 'item4', userId: 'user1', listId: 'list1', name: 'Eggs', category: 'Fridge' as any, cycle: 'MonthStart' as any, typicalCost: 30, isDiabeticFriendly: false, isActive: true };
      vi.mocked(shoppingApi.createItem).mockResolvedValue(newItem);

      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Item'));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Item Name/i), 'Eggs');

      // Select category
      const categorySelect = screen.getByLabelText(/Category/i);
      fireEvent.change(categorySelect, { target: { value: 'Fridge' } });

      // Select cycle
      const cycleSelect = screen.getByLabelText(/Shopping Cycle/i);
      fireEvent.change(cycleSelect, { target: { value: 'MonthStart' } });

      // Enter cost
      await user.type(screen.getByLabelText(/Typical Cost/i), '30');

      const addButton = screen.getByText('Add Item');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(shoppingApi.createItem).toHaveBeenCalledWith({
          listId: 'list1',
          name: 'Eggs',
          category: 'Fridge',
          cycle: 'MonthStart',
          typicalCost: 30,
          isDiabeticFriendly: false,
        });
      });
    });

    it('should validate item form fields', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Item'));
      });

      // Try to submit without filling in required fields
      await waitFor(() => {
        const addButton = screen.getByText('Add Item');
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
      });
    });

    it('should delete item with confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(shoppingApi.deleteItem).mockResolvedValue(undefined);

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Find delete button for an item
      const deleteButtons = screen.getAllByTitle('Delete item');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      }

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(shoppingApi.deleteItem).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });

    it('should show diabetic-friendly indicator', async () => {
      const diabeticItem = { ...mockItems[0], isDiabeticFriendly: true, userId: 'user1', isActive: true };
      vi.mocked(shoppingApi.getAllItems).mockResolvedValue([diabeticItem]);

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText(/diabetic friendly/i)).toBeInTheDocument();
      });
    });
  });

  describe('Category Grouping', () => {
    it('should display Pantry category section', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('Pantry Items')).toBeInTheDocument();
      });
    });

    it('should display Fridge category section', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('Fridge Items')).toBeInTheDocument();
      });
    });

    it('should display Cleaning category section', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        expect(screen.getByText('Cleaning Items')).toBeInTheDocument();
      });
    });

    it('should calculate category totals', async () => {
      render(<ShoppingManager />);
      await waitFor(() => {
        // Should show total cost for each category
        expect(screen.getByText(/R25\.50/)).toBeInTheDocument(); // Milk
        expect(screen.getByText(/R15\.00/)).toBeInTheDocument(); // Bread
        expect(screen.getByText(/R35\.00/)).toBeInTheDocument(); // Cleaning Spray
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no lists exist', async () => {
      vi.mocked(shoppingApi.getAllLists).mockResolvedValue([]);

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText(/No shopping lists yet/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no items in list', async () => {
      vi.mocked(shoppingApi.getAllItems).mockResolvedValue([]);

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText(/No items in this list yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when list loading fails', async () => {
      vi.mocked(shoppingApi.getAllLists).mockRejectedValue(new Error('Network error'));

      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should display error when item creation fails', async () => {
      const user = userEvent.setup();
      vi.mocked(shoppingApi.createItem).mockRejectedValue(new Error('Failed to create item'));

      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Item'));
      });

      await waitFor(async () => {
        await user.type(screen.getByLabelText(/Item Name/i), 'Test');
        await user.type(screen.getByLabelText(/Typical Cost/i), '10');
        fireEvent.click(screen.getByText('Add Item'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to create item/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Controls', () => {
    it('should cancel add item form', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Item'));
      });

      await waitFor(() => {
        expect(screen.getByText('Add Shopping Item')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add Shopping Item')).not.toBeInTheDocument();
      });
    });

    it('should toggle add item button text', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        const addButton = screen.getByText('+ Add Item');
        expect(addButton).toBeInTheDocument();
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('Shopping Cycles', () => {
    it('should display shopping cycle for each item', async () => {
      render(<ShoppingManager />);

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });

      // Cycle should be displayed somewhere near the item
      const monthStartElements = screen.getAllByText(/Month Start/i);
      expect(monthStartElements.length).toBeGreaterThan(0);
    });
  });
});
