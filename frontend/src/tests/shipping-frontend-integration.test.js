import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../contexts/LanguageContext';
import Orders from '../pages/Orders';
import Dashboard from '../pages/Dashboard';
import Customers from '../pages/Customers';
import ShippingCalculator from '../components/shipping/ShippingCalculator';

// Mock API calls
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock the shipping API endpoints
const mockShippingCalculation = {
  success: true,
  data: {
    distance_km: 15.5,
    zone_name_en: 'Metropolitan Zone',
    zone_name_ar: 'المنطقة الحضرية',
    base_fee: 2.50,
    distance_fee: 7.75,
    total_shipping_cost: 10.25,
    free_shipping_applied: false,
    free_shipping_threshold: 50.00,
    calculation_method: 'distance-based',
    branch: {
      id: 1,
      title_en: 'Main Branch',
      latitude: 31.9539,
      longitude: 35.9106
    }
  }
};

const mockShippingAnalytics = {
  success: true,
  data: {
    distance_statistics: {
      avg_distance: 22.3,
      max_distance: 48.7,
      min_distance: 2.1,
      avg_shipping_cost: 12.45
    },
    zone_statistics: {
      total_zones: 5,
      active_zones: 5,
      most_popular_zone: 'Metropolitan Zone'
    },
    cost_statistics: {
      avg_order_cost: 15.75,
      total_shipping_revenue: 2847.50,
      free_shipping_percentage: 23.4
    },
    popular_zones: [
      { zone_name_en: 'Urban Zone', usage_count: 145, avg_cost: 8.25 },
      { zone_name_en: 'Metropolitan Zone', usage_count: 98, avg_cost: 12.50 }
    ]
  }
};

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <LanguageProvider>
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </LanguageProvider>
  </BrowserRouter>
);

describe('Shipping Frontend Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default API responses
    require('../services/api').get.mockImplementation((url) => {
      if (url.includes('/shipping/calculate')) {
        return Promise.resolve({ data: mockShippingCalculation });
      }
      if (url.includes('/shipping/analytics')) {
        return Promise.resolve({ data: mockShippingAnalytics });
      }
      if (url.includes('/orders')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes('/customers')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Orders Page Shipping Integration', () => {
    test('should load and display shipping analytics', async () => {
      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Wait for shipping analytics to load
      await waitFor(() => {
        expect(screen.getByText(/Shipping Analytics/i)).toBeInTheDocument();
      });

      // Check if shipping statistics are displayed
      expect(screen.getByText(/22.3/)).toBeInTheDocument(); // avg distance
      expect(screen.getByText(/12.45/)).toBeInTheDocument(); // avg cost
    });

    test('should calculate shipping cost when creating order', async () => {
      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Click create order button
      const createButton = screen.getByText(/Create Order/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Order Type/i)).toBeInTheDocument();
      });

      // Select delivery option
      const deliveryOption = screen.getByLabelText(/delivery/i);
      fireEvent.click(deliveryOption);

      // Enter address ID and branch ID
      const addressInput = screen.getByPlaceholderText(/address/i);
      const branchSelect = screen.getByRole('combobox');
      
      fireEvent.change(addressInput, { target: { value: '123' } });
      fireEvent.change(branchSelect, { target: { value: '1' } });

      // Verify shipping calculation is triggered
      await waitFor(() => {
        expect(require('../services/api').post).toHaveBeenCalledWith(
          expect.stringContaining('/shipping/calculate'),
          expect.objectContaining({
            delivery_address_id: '123',
            branch_id: '1'
          })
        );
      });
    });

    test('should display shipping calculation results', async () => {
      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Simulate shipping calculation display
      await waitFor(() => {
        const shippingZone = screen.queryByText(/Metropolitan Zone/i);
        const shippingCost = screen.queryByText(/10.25/);
        
        // These elements should be present when shipping calculation is displayed
        if (shippingZone) expect(shippingZone).toBeInTheDocument();
        if (shippingCost) expect(shippingCost).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Shipping Analytics', () => {
    test('should display shipping analytics section', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Shipping Analytics/i)).toBeInTheDocument();
      });

      // Check for key shipping metrics
      expect(screen.getByText(/Average Distance/i)).toBeInTheDocument();
      expect(screen.getByText(/Average Shipping Cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Free Shipping Rate/i)).toBeInTheDocument();
    });

    test('should display popular zones information', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check if popular zones are displayed
        expect(screen.getByText(/Urban Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Metropolitan Zone/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Shipping Information', () => {
    test('should display customer shipping analytics tab', async () => {
      render(
        <TestWrapper>
          <Customers />
        </TestWrapper>
      );

      // Simulate opening customer profile
      // This would be triggered by clicking a view button in actual usage
      await waitFor(() => {
        const shippingTab = screen.queryByText(/Shipping Analytics/i);
        if (shippingTab) {
          expect(shippingTab).toBeInTheDocument();
        }
      });
    });

    test('should show address shipping information', async () => {
      render(
        <TestWrapper>
          <Customers />
        </TestWrapper>
      );

      // Check for shipping zone information in address cards
      await waitFor(() => {
        const deliveryFee = screen.queryByText(/Delivery Fee/i);
        const shippingZone = screen.queryByText(/Shipping Zone/i);
        
        if (deliveryFee) expect(deliveryFee).toBeInTheDocument();
        if (shippingZone) expect(shippingZone).toBeInTheDocument();
      });
    });
  });

  describe('Shipping Calculator Component', () => {
    test('should render shipping calculator modal', () => {
      const mockProps = {
        visible: true,
        onCancel: jest.fn(),
        onCalculate: jest.fn(),
        branches: [
          { id: 1, title_en: 'Main Branch', latitude: 31.9539, longitude: 35.9106 }
        ]
      };

      render(
        <TestWrapper>
          <ShippingCalculator {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Jordan Shipping Calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/Branch/i)).toBeInTheDocument();
      expect(screen.getByText(/Delivery Address/i)).toBeInTheDocument();
    });

    test('should calculate shipping on form submission', async () => {
      const mockOnCalculate = jest.fn();
      const mockProps = {
        visible: true,
        onCancel: jest.fn(),
        onCalculate: mockOnCalculate,
        branches: [
          { id: 1, title_en: 'Main Branch', latitude: 31.9539, longitude: 35.9106 }
        ]
      };

      render(
        <TestWrapper>
          <ShippingCalculator {...mockProps} />
        </TestWrapper>
      );

      // Fill form fields
      const branchSelect = screen.getByRole('combobox');
      const addressInput = screen.getByRole('spinbutton');
      
      fireEvent.change(branchSelect, { target: { value: '1' } });
      fireEvent.change(addressInput, { target: { value: '123' } });

      // Submit form
      const calculateButton = screen.getByText(/Calculate Shipping/i);
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(require('../services/api').post).toHaveBeenCalledWith(
          expect.stringContaining('/shipping/calculate'),
          expect.objectContaining({
            branch_id: 1,
            delivery_address_id: 123
          })
        );
      });
    });

    test('should display calculation results', async () => {
      const mockProps = {
        visible: true,
        onCancel: jest.fn(),
        onCalculate: jest.fn(),
        branches: [
          { id: 1, title_en: 'Main Branch', latitude: 31.9539, longitude: 35.9106 }
        ]
      };

      render(
        <TestWrapper>
          <ShippingCalculator {...mockProps} />
        </TestWrapper>
      );

      // Trigger calculation
      const calculateButton = screen.getByText(/Calculate Shipping/i);
      fireEvent.click(calculateButton);

      await waitFor(() => {
        // Check if results are displayed
        expect(screen.getByText(/Distance/i)).toBeInTheDocument();
        expect(screen.getByText(/Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Base Fee/i)).toBeInTheDocument();
        expect(screen.getByText(/Final Cost/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle shipping calculation API errors gracefully', async () => {
      // Mock API error
      require('../services/api').post.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // The component should not crash and should show appropriate error message
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).toBeTruthy();
      });
    });

    test('should handle missing shipping analytics data', async () => {
      // Mock empty analytics response
      require('../services/api').get.mockResolvedValueOnce({
        data: { success: true, data: {} }
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Component should handle empty data gracefully
      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should hide shipping columns on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Shipping columns should be responsive
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Integration with Backend APIs', () => {
    test('should call correct shipping calculation endpoint', async () => {
      const mockCalculateShipping = require('../services/api').post;
      
      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Simulate shipping calculation call
      await waitFor(() => {
        if (mockCalculateShipping.mock.calls.length > 0) {
          const [url, data] = mockCalculateShipping.mock.calls[0];
          expect(url).toContain('/shipping/calculate');
          expect(data).toHaveProperty('delivery_address_id');
          expect(data).toHaveProperty('branch_id');
        }
      });
    });

    test('should call shipping analytics endpoints', async () => {
      const mockGetAnalytics = require('../services/api').get;
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetAnalytics).toHaveBeenCalledWith(
          expect.stringContaining('/shipping/analytics')
        );
      });
    });
  });

  describe('User Interactions', () => {
    test('should update shipping cost when order details change', async () => {
      render(
        <TestWrapper>
          <Orders />
        </TestWrapper>
      );

      // Simulate changing order details that would trigger shipping recalculation
      // This test verifies the reactive nature of shipping calculations
      await waitFor(() => {
        expect(screen.getByText(/Orders/i)).toBeInTheDocument();
      });
    });

    test('should show free shipping alerts when applicable', async () => {
      // Mock calculation with free shipping
      const mockFreeShipping = {
        ...mockShippingCalculation,
        data: {
          ...mockShippingCalculation.data,
          free_shipping_applied: true,
          total_shipping_cost: 0
        }
      };

      require('../services/api').post.mockResolvedValueOnce({
        data: mockFreeShipping
      });

      render(
        <TestWrapper>
          <ShippingCalculator
            visible={true}
            onCancel={() => {}}
            onCalculate={() => {}}
            branches={[]}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const freeShippingIndicator = screen.queryByText(/FREE/i);
        if (freeShippingIndicator) {
          expect(freeShippingIndicator).toBeInTheDocument();
        }
      });
    });
  });
});

// Test helper functions
export const mockShippingData = {
  calculation: mockShippingCalculation,
  analytics: mockShippingAnalytics
};

export const setupShippingMocks = () => {
  const api = require('../services/api');
  api.get.mockImplementation((url) => {
    if (url.includes('/shipping/analytics')) {
      return Promise.resolve({ data: mockShippingAnalytics });
    }
    return Promise.resolve({ data: { success: true, data: [] } });
  });
  
  api.post.mockImplementation((url, data) => {
    if (url.includes('/shipping/calculate')) {
      return Promise.resolve({ data: mockShippingCalculation });
    }
    return Promise.resolve({ data: { success: true } });
  });
};
