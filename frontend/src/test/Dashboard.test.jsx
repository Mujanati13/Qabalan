import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'

// Mock chart components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Line: () => <div data-testid="line" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

const mockDashboardData = {
  analytics: {
    totalRevenue: 15480.50,
    totalOrders: 284,
    totalCustomers: 156,
    averageOrderValue: 54.50,
    shippingStats: {
      totalShippingRevenue: 892.50,
      averageShippingCost: 3.14,
      freeShippingPercentage: 38,
      zoneDistribution: {
        urban: 45,
        metropolitan: 28,
        regional: 18,
        extended: 7,
        remote: 2
      },
      deliveryPerformance: {
        onTime: 94,
        delayed: 4,
        failed: 2
      }
    }
  },
  charts: {
    revenueByMonth: [
      { month: 'Jan', revenue: 2340, shipping: 89 },
      { month: 'Feb', revenue: 2890, shipping: 112 },
      { month: 'Mar', revenue: 3240, shipping: 134 },
      { month: 'Apr', revenue: 2980, shipping: 98 },
      { month: 'May', revenue: 3560, shipping: 156 },
      { month: 'Jun', revenue: 4230, shipping: 203 }
    ],
    ordersByZone: [
      { zone: 'Urban', orders: 128, percentage: 45 },
      { zone: 'Metropolitan', orders: 79, percentage: 28 },
      { zone: 'Regional', orders: 51, percentage: 18 },
      { zone: 'Extended', orders: 20, percentage: 7 },
      { zone: 'Remote', orders: 6, percentage: 2 }
    ],
    branchPerformance: [
      { 
        branch: 'Main Branch',
        deliveries: 156,
        averageDistance: 8.2,
        revenue: 4560,
        shippingRevenue: 234
      },
      {
        branch: 'West Branch', 
        deliveries: 89,
        averageDistance: 12.5,
        revenue: 2890,
        shippingRevenue: 378
      },
      {
        branch: 'East Branch',
        deliveries: 39,
        averageDistance: 18.7,
        revenue: 1240,
        shippingRevenue: 280
      }
    ]
  }
}

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Dashboard with Shipping Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock API calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData
      })
  })

  it('renders dashboard with shipping analytics cards', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Check main analytics cards
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('15,480.50 JOD')).toBeInTheDocument()
    
    expect(screen.getByText('Total Orders')).toBeInTheDocument()
    expect(screen.getByText('284')).toBeInTheDocument()
    
    expect(screen.getByText('Total Customers')).toBeInTheDocument()
    expect(screen.getByText('156')).toBeInTheDocument()

    // Check shipping-specific cards
    expect(screen.getByText('Shipping Revenue')).toBeInTheDocument()
    expect(screen.getByText('892.50 JOD')).toBeInTheDocument()
    
    expect(screen.getByText('Avg Shipping Cost')).toBeInTheDocument()
    expect(screen.getByText('3.14 JOD')).toBeInTheDocument()
    
    expect(screen.getByText('Free Shipping Rate')).toBeInTheDocument()
    expect(screen.getByText('38%')).toBeInTheDocument()
  })

  it('displays Jordan zone distribution chart', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Orders by Delivery Zone')).toBeInTheDocument()
    })

    // Check zone data
    expect(screen.getByText('Urban (45%)')).toBeInTheDocument()
    expect(screen.getByText('Metropolitan (28%)')).toBeInTheDocument()
    expect(screen.getByText('Regional (18%)')).toBeInTheDocument()
    expect(screen.getByText('Extended (7%)')).toBeInTheDocument()
    expect(screen.getByText('Remote (2%)')).toBeInTheDocument()

    // Check chart rendering
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('shows revenue trends with shipping data', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Revenue Trends')).toBeInTheDocument()
    })

    // Check monthly data points
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Feb')).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
    
    // Check chart components
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('displays branch performance metrics', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Branch Performance')).toBeInTheDocument()
    })

    // Check branch data
    expect(screen.getByText('Main Branch')).toBeInTheDocument()
    expect(screen.getByText('156 deliveries')).toBeInTheDocument()
    expect(screen.getByText('8.2km avg distance')).toBeInTheDocument()
    expect(screen.getByText('234 JOD shipping')).toBeInTheDocument()

    expect(screen.getByText('West Branch')).toBeInTheDocument()
    expect(screen.getByText('89 deliveries')).toBeInTheDocument()
    expect(screen.getByText('12.5km avg distance')).toBeInTheDocument()

    expect(screen.getByText('East Branch')).toBeInTheDocument()
    expect(screen.getByText('39 deliveries')).toBeInTheDocument()
    expect(screen.getByText('18.7km avg distance')).toBeInTheDocument()
  })

  it('shows delivery performance indicators', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Delivery Performance')).toBeInTheDocument()
    })

    // Check performance metrics
    expect(screen.getByText('On Time: 94%')).toBeInTheDocument()
    expect(screen.getByText('Delayed: 4%')).toBeInTheDocument()
    expect(screen.getByText('Failed: 2%')).toBeInTheDocument()

    // Check visual indicators
    const onTimeIndicator = screen.getByText('94%').closest('div')
    expect(onTimeIndicator).toHaveClass('text-green-600') // Success color
  })

  it('filters data by date range', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Find date range picker
    const dateRangePicker = screen.getByRole('button', { name: /date range/i })
    await user.click(dateRangePicker)

    // Select last 30 days
    await user.click(screen.getByText('Last 30 Days'))

    // Should update all metrics
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('range=30days')
      )
    })
  })

  it('exports shipping analytics report', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Mock export functionality
    global.URL.createObjectURL = vi.fn()
    global.URL.revokeObjectURL = vi.fn()

    // Find and click export button
    const exportButton = screen.getByRole('button', { name: /export report/i })
    await user.click(exportButton)

    // Should show export options
    await waitFor(() => {
      expect(screen.getByText('Export Options')).toBeInTheDocument()
      expect(screen.getByText('Include Shipping Analytics')).toBeInTheDocument()
    })

    // Confirm export
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('Report exported successfully')).toBeInTheDocument()
    })
  })

  it('updates data in real-time', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Check for real-time indicator
    expect(screen.getByText('Live')).toBeInTheDocument()
    
    // Mock real-time update
    const updatedData = {
      ...mockDashboardData,
      analytics: {
        ...mockDashboardData.analytics,
        totalOrders: 285, // Incremented
        shippingStats: {
          ...mockDashboardData.analytics.shippingStats,
          totalShippingRevenue: 896.00 // Updated
        }
      }
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData
      })

    // Simulate real-time update (every 30 seconds)
    await waitFor(() => {
      expect(screen.getByText('285')).toBeInTheDocument() // Updated order count
      expect(screen.getByText('896.00 JOD')).toBeInTheDocument() // Updated shipping revenue
    })
  })

  it('shows shipping optimization suggestions', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument()
    })

    // Check optimization suggestions
    expect(screen.getByText('Consider adding delivery hub in Regional zone')).toBeInTheDocument()
    expect(screen.getByText('38% of orders qualify for free shipping promotion')).toBeInTheDocument()
    expect(screen.getByText('West Branch showing higher shipping costs')).toBeInTheDocument()
  })

  it('handles data loading states correctly', async () => {
    // Mock slow loading
    global.fetch = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockDashboardData
        }), 1000)
      ))

    renderWithRouter(<Dashboard />)

    // Should show loading states
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6) // 6 metric cards

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Should hide loading states
    expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
  })

  it('displays error states gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to load analytics'))

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard data')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('calculates shipping efficiency metrics', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Shipping Efficiency')).toBeInTheDocument()
    })

    // Check efficiency calculations
    expect(screen.getByText('Cost per delivery: 3.14 JOD')).toBeInTheDocument()
    expect(screen.getByText('Revenue percentage: 5.8%')).toBeInTheDocument() // 892.50 / 15480.50
    expect(screen.getByText('Average distance: 12.1km')).toBeInTheDocument()
  })

  it('shows seasonal shipping trends', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Seasonal Trends')).toBeInTheDocument()
    })

    // Check seasonal analysis
    expect(screen.getByText('Summer increase in Regional deliveries')).toBeInTheDocument()
    expect(screen.getByText('Urban zone peak during weekends')).toBeInTheDocument()
    expect(screen.getByText('Extended zone demand growing 15%')).toBeInTheDocument()
  })
})

// Performance tests for Dashboard
describe('Dashboard Performance', () => {
  it('loads dashboard quickly with large dataset', async () => {
    const startTime = Date.now()
    
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  it('handles multiple chart renders efficiently', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const startTime = Date.now()

    // Switch between different views multiple times
    for (let i = 0; i < 5; i++) {
      const viewSelector = screen.getByRole('button', { name: /view/i })
      await user.click(viewSelector)
      await user.click(screen.getByText('Monthly View'))
      
      await user.click(viewSelector)
      await user.click(screen.getByText('Weekly View'))
    }

    const totalTime = Date.now() - startTime
    
    // Should handle multiple view changes efficiently
    expect(totalTime).toBeLessThan(2000)
  })

  it('updates charts smoothly during real-time updates', async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Simulate multiple real-time updates
    for (let i = 0; i < 10; i++) {
      const updatedData = {
        ...mockDashboardData,
        analytics: {
          ...mockDashboardData.analytics,
          totalOrders: 284 + i,
        }
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedData
        })

      await waitFor(() => {
        expect(screen.getByText(String(284 + i))).toBeInTheDocument()
      })
    }

    // Should handle rapid updates without performance issues
    expect(screen.getByText('293')).toBeInTheDocument() // Final count
  })
})
