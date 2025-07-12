import axios from 'axios';
import apiConfig from '../config/api';

const api = axios.create({
  baseURL: `${apiConfig.baseURL}/api`,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const transactionService = {
  // Get all transactions
  getTransactions: async (month) => {
    try {
      const response = await api.get(`/transactions${month ? `?month=${month}` : ''}`);
      return response.data.transactions || response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  // Get transaction summary
  getSummary: async () => {
    try {
      const response = await api.get('/transactions/summary');
      return response.data.summary || response.data;
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  },

  // Update transaction category
  updateCategory: async (transactionId, category) => {
    try {
      const response = await api.post(`/transactions/${transactionId}/category`, { category });
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Update transaction type
  updateType: async (transactionId, type) => {
    try {
      const response = await api.post(`/transactions/${transactionId}/type`, { type });
      return response.data;
    } catch (error) {
      console.error('Error updating type:', error);
      throw error;
    }
  },

  // Upload statement
  uploadStatement: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      });

      const response = await api.post('/statements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading statement:', error);
      throw error;
    }
  },
};

export default api; 