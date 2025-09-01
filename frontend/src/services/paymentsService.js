import api from './api';

const paymentsService = {
  // New spec-compliant endpoint
  async createMPGSCheckoutSession(orderId, amount, currency = 'JOD') {
    const res = await api.post('/payments/mpgs/session', { 
      orderId, 
      amount, 
      currency 
    });
    return res.data;
  },

  // Legacy endpoint for backward compatibility
  async createMPGSSession(orderId) {
    const res = await api.post('/payments/mpgs/session', { order_id: orderId });
    return res.data;
  },

  async completeMPGSPayment(paymentData) {
    const res = await api.post('/payments/mpgs/complete', paymentData);
    return res.data;
  },

  // Get order status from MPGS (for admin/QA)
  async getMPGSOrderStatus(orderId) {
    const res = await api.get(`/payments/mpgs/orders/${orderId}`);
    return res.data;
  }
};

export default paymentsService;
