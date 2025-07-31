import { api } from './authService';

class SupportService {
  // Get support categories
  async getSupportCategories() {
    try {
      const response = await api.get('/support/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching support categories:', error);
      throw error;
    }
  }

  // Submit support ticket
  async submitTicket(ticketData, attachments = []) {
    try {
      const formData = new FormData();
      
      // Add ticket data
      Object.keys(ticketData).forEach(key => {
        if (ticketData[key] !== undefined && ticketData[key] !== null) {
          formData.append(key, ticketData[key]);
        }
      });

      // Add attachments
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await api.post('/support/tickets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      throw error;
    }
  }

  // Get user's tickets
  async getUserTickets(params = {}) {
    try {
      const response = await api.get('/support/tickets', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  // Get ticket details
  async getTicketDetails(ticketId) {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw error;
    }
  }

  // Add reply to ticket
  async addTicketReply(ticketId, message, attachments = []) {
    try {
      const formData = new FormData();
      formData.append('message', message);

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await api.post(`/support/tickets/${ticketId}/replies`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error adding ticket reply:', error);
      throw error;
    }
  }

  // Submit feedback
  async submitFeedback(feedbackData) {
    try {
      const response = await api.post('/support/feedback', feedbackData);
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  // Admin methods

  // Get all tickets (admin)
  async getAdminTickets(params = {}) {
    try {
      const response = await api.get('/support/admin/tickets', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching admin tickets:', error);
      throw error;
    }
  }

  // Get ticket details (admin)
  async getAdminTicketDetails(ticketId) {
    try {
      const response = await api.get(`/support/admin/tickets/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin ticket details:', error);
      throw error;
    }
  }

  // Add admin reply
  async addAdminReply(ticketId, message, isInternalNote = false, attachments = []) {
    try {
      console.log('Service - Adding admin reply:', { ticketId, message, isInternalNote, attachments: attachments.length }); // Debug log
      
      const formData = new FormData();
      formData.append('message', message);
      formData.append('is_internal_note', isInternalNote.toString());

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      // Debug: Log FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(`FormData ${key}:`, value);
      }

      const response = await api.post(`/support/admin/tickets/${ticketId}/replies`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error adding admin reply:', error);
      throw error;
    }
  }

  // Update ticket status
  async updateTicketStatus(ticketId, status) {
    try {
      const response = await api.patch(`/support/admin/tickets/${ticketId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  // Assign ticket
  async assignTicket(ticketId, adminId) {
    try {
      const response = await api.patch(`/support/admin/tickets/${ticketId}/assign`, { 
        admin_id: adminId 
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  // Get support statistics
  async getSupportStatistics() {
    try {
      const response = await api.get('/support/admin/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching support statistics:', error);
      throw error;
    }
  }

  // Get all feedback (admin)
  async getAdminFeedback(params = {}) {
    try {
      const response = await api.get('/support/admin/feedback', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching admin feedback:', error);
      throw error;
    }
  }

  // Respond to feedback
  async respondToFeedback(feedbackId, response, status = 'approved') {
    try {
      const result = await api.post(`/support/admin/feedback/${feedbackId}/respond`, {
        response,
        status
      });
      return result.data;
    } catch (error) {
      console.error('Error responding to feedback:', error);
      throw error;
    }
  }

  // Helper methods
  getStatusColor(status) {
    const colors = {
      open: '#1890ff',
      in_progress: '#faad14',
      resolved: '#52c41a',
      closed: '#8c8c8c'
    };
    return colors[status] || '#8c8c8c';
  }

  getPriorityColor(priority) {
    const colors = {
      low: '#52c41a',
      medium: '#faad14',
      high: '#ff7875',
      urgent: '#ff4d4f'
    };
    return colors[priority] || '#faad14';
  }

  getCategoryIcon(category) {
    const icons = {
      order_issue: 'shopping-cart',
      delivery: 'truck',
      payment: 'credit-card',
      food_quality: 'heart',
      technical: 'bug',
      complaint: 'frown',
      inquiry: 'question-circle',
      compliment: 'smile',
      other: 'ellipsis'
    };
    return icons[category] || 'question-circle';
  }

  formatTicketNumber(ticketNumber) {
    return `#${ticketNumber}`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new SupportService();
