import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Orders from '../pages/Orders'

// Mock dependencies
vi.mock('axios')
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  }
}))

const mockOrders = [
  {
    id: 1,
    order_number: 'ORD-2025-000001',
    customer_name: 'John Doe',
    customer_phone: '+962791234567',
    total_amount: 45.50,
    shipping_cost: 4.0,
    delivery_zone: 'Metropolitan',
    delivery_address: 'West Amman, Jordan',
    status: 'pending',
    created_at: '2025-07-20T10:00:00.000Z',
    items: [
      {
        id: 1,
        product_title: 'Premium Cake',
        quantity: 2,
        price: 20.75
      }
    ]
  },
  {
    id: 2,
    order_number: 'ORD-2025-000002',
    customer_name: 'Sarah Ahmad',
    customer_phone: '+962791234568',
    total_amount: 32.00,
    shipping_cost: 0,
    delivery_zone: 'Urban',
    delivery_address: 'Downtown Amman, Jordan',
    status: 'completed',
    created_at: '2025-07-20T09:00:00.000Z',
    items: [
      {
        id: 2,
        product_title: 'Chocolate Pastry',
        quantity: 4,
        price: 8.00
      }
    ]
  }
]

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Orders Page with Shipping Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock API calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrders, total: 2 })
      })
  })

  it('renders orders list with shipping information', async () => {
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument()
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
      expect(screen.getByText('ORD-2025-000002')).toBeInTheDocument()
    })

    // Check shipping information display
    expect(screen.getByText('Metropolitan')).toBeInTheDocument()
    expect(screen.getByText('Urban')).toBeInTheDocument()
    expect(screen.getByText('4.0 JOD')).toBeInTheDocument()
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('displays shipping zone badges correctly', async () => {
    renderWithRouter(<Orders />)

    await waitFor(() => {
      // Check for zone badges
      const metropolitanBadge = screen.getByText('Metropolitan')
      const urbanBadge = screen.getByText('Urban')
      
      expect(metropolitanBadge).toBeInTheDocument()
      expect(urbanBadge).toBeInTheDocument()
    })
  })

  it('shows shipping costs in order totals', async () => {
    renderWithRouter(<Orders />)

    await waitFor(() => {
      // First order: 45.50 total with 4.0 shipping
      expect(screen.getByText('45.50 JOD')).toBeInTheDocument()
      expect(screen.getByText('4.0 JOD')).toBeInTheDocument()
      
      // Second order: 32.00 total with free shipping
      expect(screen.getByText('32.00 JOD')).toBeInTheDocument()
      expect(screen.getByText('FREE')).toBeInTheDocument()
    })
  })

  it('filters orders by delivery zone', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Find and click zone filter
    const zoneFilter = screen.getByRole('combobox', { name: /zone/i })
    await user.click(zoneFilter)
    
    await user.click(screen.getByText('Metropolitan'))

    // Should filter to show only metropolitan orders
    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
      expect(screen.queryByText('ORD-2025-000002')).not.toBeInTheDocument()
    })
  })

  it('calculates shipping analytics correctly', async () => {
    renderWithRouter(<Orders />)

    await waitFor(() => {
      // Check analytics cards
      expect(screen.getByText('Total Shipping Revenue')).toBeInTheDocument()
      expect(screen.getByText('Average Shipping Cost')).toBeInTheDocument()
      expect(screen.getByText('Free Shipping Orders')).toBeInTheDocument()
    })

    // Total shipping revenue: 4.0 JOD (only paid shipping)
    expect(screen.getByText('4.0 JOD')).toBeInTheDocument()
    
    // Average shipping cost: 2.0 JOD (4.0 + 0) / 2
    expect(screen.getByText('2.0 JOD')).toBeInTheDocument()
    
    // Free shipping percentage: 50% (1 out of 2 orders)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('opens order details modal with shipping information', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Click on order to open details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument()
      expect(screen.getByText('Shipping Information')).toBeInTheDocument()
      expect(screen.getByText('Delivery Zone: Metropolitan')).toBeInTheDocument()
      expect(screen.getByText('Shipping Cost: 4.0 JOD')).toBeInTheDocument()
      expect(screen.getByText('Delivery Address:')).toBeInTheDocument()
      expect(screen.getByText('West Amman, Jordan')).toBeInTheDocument()
    })
  })

  it('updates order status with shipping tracking', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Open order details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument()
    })

    // Find and click status update
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusSelect)
    await user.click(screen.getByText('In Transit'))

    // Should show shipping tracking options
    await waitFor(() => {
      expect(screen.getByText('Estimated Delivery')).toBeInTheDocument()
      expect(screen.getByText('Tracking Number')).toBeInTheDocument()
    })
  })

  it('displays shipping cost breakdown', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Open order details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      // Check order total breakdown
      expect(screen.getByText('Subtotal:')).toBeInTheDocument()
      expect(screen.getByText('41.50 JOD')).toBeInTheDocument() // 45.50 - 4.0 shipping
      expect(screen.getByText('Shipping:')).toBeInTheDocument()
      expect(screen.getByText('4.0 JOD')).toBeInTheDocument()
      expect(screen.getByText('Total:')).toBeInTheDocument()
      expect(screen.getByText('45.50 JOD')).toBeInTheDocument()
    })
  })

  it('exports orders with shipping data', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument()
    })

    // Mock the export function
    const mockExport = vi.fn()
    global.URL.createObjectURL = vi.fn()
    global.URL.revokeObjectURL = vi.fn()

    // Find and click export button
    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    // Should include shipping columns in export
    await waitFor(() => {
      expect(screen.getByText('Include Shipping Data')).toBeInTheDocument()
    })

    // Confirm export with shipping data
    const confirmExport = screen.getByRole('button', { name: /confirm export/i })
    await user.click(confirmExport)

    // Verify export includes shipping information
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully')).toBeInTheDocument()
    })
  })

  it('handles shipping calculation errors gracefully', async () => {
    // Mock API to return error
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Shipping calculation failed'))

    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('Error loading shipping data')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('shows shipping zone distribution chart', async () => {
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('Shipping Zone Distribution')).toBeInTheDocument()
      expect(screen.getByText('Urban: 50%')).toBeInTheDocument()
      expect(screen.getByText('Metropolitan: 50%')).toBeInTheDocument()
    })
  })

  it('validates shipping address format', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Open order details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument()
    })

    // Check address validation
    expect(screen.getByText('West Amman, Jordan')).toBeInTheDocument()
    
    // Should show address validation status
    const validatedAddress = screen.getByText('✓ Address Validated')
    expect(validatedAddress).toBeInTheDocument()
  })

  it('displays estimated delivery time based on zone', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Open order details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      // Metropolitan zone should have 2-4 hours delivery time
      expect(screen.getByText('Estimated Delivery: 2-4 hours')).toBeInTheDocument()
    })
  })

  it('recalculates shipping when order items change', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    // Open order details
    await user.click(screen.getByText('ORD-2025-000001'))

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument()
    })

    // Edit order items
    const editButton = screen.getByRole('button', { name: /edit items/i })
    await user.click(editButton)

    // Change quantity
    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i })
    await user.clear(quantityInput)
    await user.type(quantityInput, '3')

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should recalculate shipping and total
    await waitFor(() => {
      expect(screen.getByText('Shipping recalculated successfully')).toBeInTheDocument()
    })
  })
})

// Performance tests for Orders page
describe('Orders Page Performance', () => {
  it('loads orders list quickly with large dataset', async () => {
    // Create large dataset
    const largeOrderSet = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      order_number: `ORD-2025-${String(i + 1).padStart(6, '0')}`,
      customer_name: `Customer ${i + 1}`,
      customer_phone: '+962791234567',
      total_amount: 30 + (i % 50),
      shipping_cost: i % 5 === 0 ? 0 : 2.5 + (i % 3),
      delivery_zone: ['Urban', 'Metropolitan', 'Regional'][i % 3],
      status: ['pending', 'completed', 'cancelled'][i % 3],
      created_at: new Date().toISOString()
    }))

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: largeOrderSet, total: 1000 })
      })

    const startTime = Date.now()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('Orders Management')).toBeInTheDocument()
    })

    const loadTime = Date.now() - startTime
    
    // Should load within 2 seconds even with large dataset
    expect(loadTime).toBeLessThan(2000)
  })

  it('handles shipping calculations efficiently', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Orders />)

    await waitFor(() => {
      expect(screen.getByText('ORD-2025-000001')).toBeInTheDocument()
    })

    const startTime = Date.now()

    // Perform multiple shipping calculations
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByText('ORD-2025-000001'))
      
      await waitFor(() => {
        expect(screen.getByText('Order Details')).toBeInTheDocument()
      })
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
    }

    const totalTime = Date.now() - startTime
    
    // Should handle multiple calculations efficiently
    expect(totalTime).toBeLessThan(5000)
  })
})
