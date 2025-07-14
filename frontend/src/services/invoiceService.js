import { api } from './authService';

class InvoiceService {
  // Generate PDF invoice for an order
  async generatePDFInvoice(orderId) {
    try {
      const response = await api.get(`/invoice/orders/${orderId}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob URL for download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to generate PDF invoice');
    }
  }

  // Preview invoice data
  async previewInvoice(orderId) {
    try {
      const response = await api.get(`/invoice/orders/${orderId}/preview`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoice preview');
    }
  }

  // Export orders to Excel (admin only)
  async exportToExcel(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await api.get(`/invoice/export/excel?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create blob URL for download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export to Excel');
    }
  }

  // Get invoice statistics (admin only)
  async getStatistics(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/invoice/statistics?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoice statistics');
    }
  }

  // Bulk generate PDFs (admin only)
  async bulkGeneratePDFs(orderIds) {
    try {
      const response = await api.post('/invoice/bulk/pdf', { orderIds });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to generate bulk PDFs');
    }
  }

  // Helper method to get order status color
  getStatusColor(status) {
    const statusColors = {
      pending: '#fbbf24',
      confirmed: '#3b82f6',
      preparing: '#f59e0b',
      out_for_delivery: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
      refunded: '#6b7280'
    };
    return statusColors[status] || '#6b7280';
  }

  // Helper method to get payment status color
  getPaymentStatusColor(paymentStatus) {
    const statusColors = {
      pending: '#fbbf24',
      paid: '#10b981',
      failed: '#ef4444',
      refunded: '#6b7280',
      partial: '#f59e0b'
    };
    return statusColors[paymentStatus] || '#6b7280';
  }
}

export default new InvoiceService();
