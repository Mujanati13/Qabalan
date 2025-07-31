import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShippingCalculator from '../components/shipping/ShippingCalculator'

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  }
}))

describe('ShippingCalculator Component', () => {
  const mockBranches = [
    {
      id: 1,
      name: 'Main Branch',
      address: 'Downtown Amman',
      latitude: 31.9500,
      longitude: 35.9333
    },
    {
      id: 2,
      name: 'West Branch',
      address: 'West Amman',
      latitude: 31.9000,
      longitude: 35.8500
    }
  ]

  const mockProducts = [
    {
      id: 1,
      title: 'Premium Cake',
      price: 25.00,
      quantity: 2,
      weight: 1.5
    },
    {
      id: 2,
      title: 'Pastry Box',
      price: 15.00,
      quantity: 1,
      weight: 0.8
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders shipping calculator with all necessary elements', () => {
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    expect(screen.getByText('Shipping Calculator')).toBeInTheDocument()
    expect(screen.getByText('Jordan Delivery Zones')).toBeInTheDocument()
    expect(screen.getByText('Urban Zone (0-5km): 2.5 JOD')).toBeInTheDocument()
    expect(screen.getByText('Metropolitan Zone (5-15km): 4.0 JOD')).toBeInTheDocument()
    expect(screen.getByText('Regional Zone (15-30km): 6.5 JOD')).toBeInTheDocument()
    expect(screen.getByText('Extended Zone (30-50km): 9.0 JOD')).toBeInTheDocument()
    expect(screen.getByText('Remote Zone (50+km): 12.0 JOD')).toBeInTheDocument()
  })

  it('displays free shipping threshold information', () => {
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    expect(screen.getByText(/Free shipping for orders over 30 JOD/)).toBeInTheDocument()
  })

  it('calculates shipping cost for urban zone', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    // Enter coordinates for urban zone (near downtown Amman)
    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/Urban Zone/)).toBeInTheDocument()
      expect(screen.getByText(/2.5 JOD/)).toBeInTheDocument()
      expect(screen.getByText(/Distance: 0/)).toBeInTheDocument()
    })
  })

  it('calculates shipping cost for metropolitan zone', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    // Enter coordinates for metropolitan zone
    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.clear(latInput)
    await user.clear(lngInput)
    await user.type(latInput, '31.8500')
    await user.type(lngInput, '35.8500')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/Metropolitan Zone/)).toBeInTheDocument()
      expect(screen.getByText(/4.0 JOD/)).toBeInTheDocument()
    })
  })

  it('shows free shipping when order total exceeds threshold', async () => {
    const user = userEvent.setup()
    
    const expensiveProducts = [
      {
        id: 1,
        title: 'Premium Wedding Cake',
        price: 35.00,
        quantity: 1,
        weight: 3.0
      }
    ]

    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={expensiveProducts}
      />
    )

    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/FREE SHIPPING/)).toBeInTheDocument()
      expect(screen.getByText(/You qualify for free shipping!/)).toBeInTheDocument()
    })
  })

  it('finds optimal branch based on distance', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/Optimal Branch:/)).toBeInTheDocument()
      expect(screen.getByText(/Main Branch/)).toBeInTheDocument()
    })
  })

  it('displays order summary correctly', () => {
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    // Check order total calculation
    const expectedTotal = (25.00 * 2) + (15.00 * 1) // 65.00 JOD
    expect(screen.getByText(`Order Total: ${expectedTotal.toFixed(2)} JOD`)).toBeInTheDocument()
    
    // Check total weight
    const expectedWeight = (1.5 * 2) + (0.8 * 1) // 3.8 kg
    expect(screen.getByText(`Total Weight: ${expectedWeight.toFixed(1)} kg`)).toBeInTheDocument()
  })

  it('validates input fields', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Please enter valid coordinates/)).toBeInTheDocument()
    })
  })

  it('handles empty products array', () => {
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={[]}
      />
    )

    expect(screen.getByText('Order Total: 0.00 JOD')).toBeInTheDocument()
    expect(screen.getByText('Total Weight: 0.0 kg')).toBeInTheDocument()
    expect(screen.getByText(/Add products to calculate shipping/)).toBeInTheDocument()
  })

  it('displays different zones with correct pricing', () => {
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    const zoneTests = [
      { zone: 'Urban Zone (0-5km)', price: '2.5 JOD' },
      { zone: 'Metropolitan Zone (5-15km)', price: '4.0 JOD' },
      { zone: 'Regional Zone (15-30km)', price: '6.5 JOD' },
      { zone: 'Extended Zone (30-50km)', price: '9.0 JOD' },
      { zone: 'Remote Zone (50+km)', price: '12.0 JOD' }
    ]

    zoneTests.forEach(({ zone, price }) => {
      expect(screen.getByText(`${zone}: ${price}`)).toBeInTheDocument()
    })
  })

  it('calculates distance correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    // Test with coordinates that should be about 10km from main branch
    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.8500')
    await user.type(lngInput, '35.8500')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      // Should be in metropolitan zone (5-15km)
      expect(screen.getByText(/Metropolitan Zone/)).toBeInTheDocument()
      expect(screen.getByText(/Distance:/)).toBeInTheDocument()
    })
  })

  it('shows estimated delivery time based on zone', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/Estimated Delivery:/)).toBeInTheDocument()
      expect(screen.getByText(/1-2 hours/)).toBeInTheDocument() // Urban zone delivery time
    })
  })

  it('handles calculation errors gracefully', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={[]} // Empty branches to trigger error
        products={mockProducts}
      />
    )

    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/No branches available/)).toBeInTheDocument()
    })
  })

  it('updates calculation when products change', async () => {
    const { rerender } = render(
      <ShippingCalculator 
        branches={mockBranches}
        products={mockProducts}
      />
    )

    expect(screen.getByText('Order Total: 65.00 JOD')).toBeInTheDocument()

    // Update with different products
    const newProducts = [
      {
        id: 3,
        title: 'Simple Cake',
        price: 10.00,
        quantity: 1,
        weight: 0.5
      }
    ]

    rerender(
      <ShippingCalculator 
        branches={mockBranches}
        products={newProducts}
      />
    )

    expect(screen.getByText('Order Total: 10.00 JOD')).toBeInTheDocument()
    expect(screen.getByText('Total Weight: 0.5 kg')).toBeInTheDocument()
  })
})

// Additional integration tests
describe('ShippingCalculator Integration Tests', () => {
  it('calculates shipping for all Jordan zones correctly', async () => {
    const user = userEvent.setup()
    
    const testCases = [
      { lat: '31.9500', lng: '35.9333', expectedZone: 'Urban', expectedCost: '2.5' },
      { lat: '31.8500', lng: '35.8500', expectedZone: 'Metropolitan', expectedCost: '4.0' },
      { lat: '32.0500', lng: '35.8000', expectedZone: 'Regional', expectedCost: '6.5' },
      { lat: '31.7000', lng: '35.8000', expectedZone: 'Extended', expectedCost: '9.0' },
      { lat: '32.5500', lng: '36.1000', expectedZone: 'Remote', expectedCost: '12.0' }
    ]

    for (const testCase of testCases) {
      const { rerender } = render(
        <ShippingCalculator 
          branches={[
            {
              id: 1,
              name: 'Test Branch',
              address: 'Test Address',
              latitude: 31.9500,
              longitude: 35.9333
            }
          ]}
          products={[
            {
              id: 1,
              title: 'Test Product',
              price: 20.00,
              quantity: 1,
              weight: 1.0
            }
          ]}
        />
      )

      const latInput = screen.getByPlaceholderText('Latitude')
      const lngInput = screen.getByPlaceholderText('Longitude')
      
      await user.clear(latInput)
      await user.clear(lngInput)
      await user.type(latInput, testCase.lat)
      await user.type(lngInput, testCase.lng)
      
      const calculateButton = screen.getByText('Calculate Shipping')
      await user.click(calculateButton)

      await waitFor(() => {
        expect(screen.getByText(new RegExp(testCase.expectedZone))).toBeInTheDocument()
        expect(screen.getByText(new RegExp(testCase.expectedCost))).toBeInTheDocument()
      })
    }
  })

  it('handles performance requirements - calculation under 1 second', async () => {
    const user = userEvent.setup()
    
    render(
      <ShippingCalculator 
        branches={[
          { id: 1, name: 'Branch 1', address: 'Address 1', latitude: 31.9500, longitude: 35.9333 }
        ]}
        products={[
          { id: 1, title: 'Product 1', price: 20.00, quantity: 1, weight: 1.0 }
        ]}
      />
    )

    const latInput = screen.getByPlaceholderText('Latitude')
    const lngInput = screen.getByPlaceholderText('Longitude')
    
    await user.type(latInput, '31.9500')
    await user.type(lngInput, '35.9333')
    
    const startTime = Date.now()
    const calculateButton = screen.getByText('Calculate Shipping')
    await user.click(calculateButton)

    await waitFor(() => {
      expect(screen.getByText(/Urban Zone/)).toBeInTheDocument()
    })

    const endTime = Date.now()
    const calculationTime = endTime - startTime
    
    // Should complete within 1 second (1000ms)
    expect(calculationTime).toBeLessThan(1000)
  })
})
