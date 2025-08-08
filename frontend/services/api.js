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
      // Handle both old and new response formats
      return response.data.success ? response.data.transactions : response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  // Get transaction summary
  getSummary: async () => {
    try {
      const response = await api.get('/transactions/summary');
      // Handle both old and new response formats
      return response.data.success ? response.data.summary : response.data;
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  },

  // Get all accounts
  getAccounts: async () => {
    try {
      const response = await api.get('/accounts');
      return response.data.success ? response.data.accounts : response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
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

  // Create new transaction
  createTransaction: async (transactionData) => {
    try {
      const response = await api.post('/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  // Update transaction
  updateTransaction: async (transactionId, updateData) => {
    try {
      const response = await api.put(`/transactions/${transactionId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },

  // Delete transaction
  deleteTransaction: async (transactionId) => {
    try {
      const response = await api.delete(`/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  // Create recurring rule
  createRecurringRule: async (ruleData) => {
    try {
      const response = await api.post('/recurring_rules', ruleData);
      return response.data;
    } catch (error) {
      console.error('Error creating recurring rule:', error);
      throw error;
    }
  },
};

export const accountService = {
  // Get all accounts
  getAccounts: async () => {
    try {
      const response = await api.get('/accounts');
      return response.data.success ? response.data.accounts : response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  },

  // Get account summary
  getAccountSummary: async () => {
    try {
      const response = await api.get('/accounts/summary');
      return response.data.success ? response.data.summary : response.data;
    } catch (error) {
      console.error('Error fetching account summary:', error);
      throw error;
    }
  },
};

export const plaidService = {
  // Create link token
  createLinkToken: async () => {
    try {
      const response = await api.post('/plaid/create_link_token');
      return response.data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  },

  // Exchange public token
  exchangePublicToken: async (publicToken) => {
    try {
      const response = await api.post('/plaid/exchange_public_token', { public_token: publicToken });
      return response.data;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  },

  // Fetch transactions
  fetchTransactions: async () => {
    try {
      const response = await api.post('/plaid/fetch_transactions');
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions from Plaid:', error);
      throw error;
    }
  },

  // Get all connected Plaid items
  getItems: async () => {
    try {
      const response = await api.get('/plaid/items');
      return response.data;
    } catch (error) {
      console.error('Error fetching Plaid items:', error);
      throw error;
    }
  },

  // Remove a Plaid item (access token) to avoid unnecessary billing
  removeItem: async (itemId) => {
    try {
      const response = await api.delete('/plaid/remove_item', {
        data: { item_id: itemId }
      });
      return response.data;
    } catch (error) {
      console.error('Error removing Plaid item:', error);
      throw error;
    }
  },

  // Get last refresh times for all items
  getLastRefresh: async () => {
    try {
      const response = await api.get('/plaid/last_refresh');
      return response.data;
    } catch (error) {
      console.error('Error fetching last refresh times:', error);
      throw error;
    }
  },
};

export default api; 