import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order } from './apiService';

const GUEST_ORDERS_KEY = 'guest_orders';

interface GuestOrder extends Order {
  localId: string; // For local identification
  customerPhone: string;
  customerEmail?: string;
  createdAt: string;
}

class GuestOrderService {
  // Save a guest order locally
  async saveGuestOrder(order: Order, customerInfo: { phone: string; email?: string }): Promise<void> {
    try {
      const existingOrders = await this.getGuestOrders();
      
      const guestOrder: GuestOrder = {
        ...order,
        localId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        createdAt: new Date().toISOString(),
      };
      
      const updatedOrders = [guestOrder, ...existingOrders];
      
      // Keep only last 50 orders to prevent storage bloat
      if (updatedOrders.length > 50) {
        updatedOrders.splice(50);
      }
      
      await AsyncStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(updatedOrders));
      console.log('✅ Guest order saved locally:', guestOrder.localId);
    } catch (error) {
      console.error('❌ Failed to save guest order:', error);
    }
  }

  // Get all guest orders from local storage
  async getGuestOrders(): Promise<GuestOrder[]> {
    try {
      const ordersJson = await AsyncStorage.getItem(GUEST_ORDERS_KEY);
      if (!ordersJson) {
        return [];
      }
      
      const orders = JSON.parse(ordersJson) as GuestOrder[];
      console.log(`📦 Retrieved ${orders.length} guest orders from storage`);
      return orders;
    } catch (error) {
      console.error('❌ Failed to get guest orders:', error);
      return [];
    }
  }

  // Get guest orders with pagination and filtering
  async getGuestOrdersPaginated(options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    orders: GuestOrder[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      hasMore: boolean;
    };
  }> {
    try {
      const allOrders = await this.getGuestOrders();
      
      // Filter by status if provided
      let filteredOrders = allOrders;
      if (options.status) {
        filteredOrders = allOrders.filter(order => order.order_status === options.status);
      }
      
      // Sort by creation date (newest first)
      filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
      const totalItems = filteredOrders.length;
      const totalPages = Math.ceil(totalItems / limit);
      
      return {
        orders: paginatedOrders,
        pagination: {
          page,
          totalPages,
          totalItems,
          hasMore: page < totalPages,
        },
      };
    } catch (error) {
      console.error('❌ Failed to get paginated guest orders:', error);
      return {
        orders: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
      };
    }
  }

  // Clear all guest orders
  async clearGuestOrders(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GUEST_ORDERS_KEY);
      console.log('✅ Guest orders cleared');
    } catch (error) {
      console.error('❌ Failed to clear guest orders:', error);
    }
  }

  // Clear all guest session data (orders, cart, etc.) - called on logout
  async clearGuestSession(): Promise<void> {
    try {
      // Clear guest orders
      await this.clearGuestOrders();
      
      // Clear guest cart data
      await AsyncStorage.removeItem('@guest_cart_items');
      
      // Clear any other guest-specific data
      await AsyncStorage.removeItem('guest_user_info');
      await AsyncStorage.removeItem('guest_addresses');
      await AsyncStorage.removeItem('guest_checkout_data');
      
      console.log('✅ All guest session data cleared');
    } catch (error) {
      console.error('❌ Failed to clear guest session data:', error);
    }
  }

  // Update guest order status (for simulation purposes)
  async updateGuestOrderStatus(localId: string, newStatus: string): Promise<void> {
    try {
      const orders = await this.getGuestOrders();
      const orderIndex = orders.findIndex(order => order.localId === localId);
      
      if (orderIndex !== -1) {
        orders[orderIndex].order_status = newStatus as any;
        await AsyncStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
        console.log(`✅ Guest order ${localId} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('❌ Failed to update guest order status:', error);
    }
  }

  // Find guest order by phone number (for lookup purposes)
  async findOrdersByPhone(phone: string): Promise<GuestOrder[]> {
    try {
      const orders = await this.getGuestOrders();
      return orders.filter(order => order.customerPhone === phone);
    } catch (error) {
      console.error('❌ Failed to find orders by phone:', error);
      return [];
    }
  }
}

export default new GuestOrderService();
export type { GuestOrder };
