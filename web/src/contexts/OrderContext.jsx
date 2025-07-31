import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

const OrderContext = createContext();

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load orders from localStorage on component mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('user_orders');
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(parsedOrders);
      } catch (error) {
        console.error('Error loading orders from localStorage:', error);
        localStorage.removeItem('user_orders');
      }
    }
  }, []);

  // Save orders to localStorage whenever orders change
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('user_orders', JSON.stringify(orders));
    }
  }, [orders]);

  const addOrder = (orderData) => {
    try {
      const newOrder = {
        id: orderData.id || `order_${Date.now()}`,
        order_number: orderData.order_number || `ORD${Date.now()}`,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email,
        order_type: orderData.order_type,
        branch_id: orderData.branch_id,
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        delivery_fee: orderData.delivery_fee || 0,
        total: orderData.total || 0,
        status: orderData.status || 'pending',
        created_at: orderData.created_at || new Date().toISOString(),
        delivery_address: orderData.delivery_address || null,
        payment_method: orderData.payment_method || 'cash',
        special_instructions: orderData.special_instructions || ''
      };

      setOrders(prev => [newOrder, ...prev]); // Add to beginning of array (newest first)
      message.success('Order saved to history');
      
      return newOrder;
    } catch (error) {
      console.error('Error adding order to history:', error);
      message.error('Failed to save order to history');
      return null;
    }
  };

  const getOrderById = (orderId) => {
    return orders.find(order => order.id === orderId || order.order_number === orderId);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    message.success(`Order status updated to ${newStatus}`);
  };

  const deleteOrder = (orderId) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    message.success('Order removed from history');
  };

  const clearOrderHistory = () => {
    setOrders([]);
    localStorage.removeItem('user_orders');
    message.success('Order history cleared');
  };

  const getOrderStats = () => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const statusCounts = orders.reduce((counts, order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
      return counts;
    }, {});

    return {
      totalOrders,
      totalSpent,
      statusCounts
    };
  };

  const value = {
    orders,
    loading,
    addOrder,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    clearOrderHistory,
    getOrderStats,
    setLoading
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
