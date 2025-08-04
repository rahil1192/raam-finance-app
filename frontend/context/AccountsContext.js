import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { apiConfig } from '../config/api';

const AccountsContext = createContext();

export function AccountsProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [plaidItems, setPlaidItems] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch accounts and Plaid items together
  const refreshAccounts = useCallback(async () => {
    try {
      console.log('🔄 Refreshing accounts...');
      
      const [accountsRes, plaidRes, refreshRes] = await Promise.all([
        axios.get(`${apiConfig.baseURL}/accounts`),
        axios.get(`${apiConfig.baseURL}/plaid/items`),
        axios.get(`${apiConfig.baseURL}/plaid/last_refresh`)
      ]);

      console.log('📊 Accounts response:', accountsRes.data);
      console.log('🏦 Plaid items response:', plaidRes.data);
      console.log('⏰ Last refresh response:', refreshRes.data);

      // Handle nested response structure
      const accountsData = accountsRes.data.success ? accountsRes.data.accounts : [];
      const plaidItemsData = plaidRes.data.success ? plaidRes.data.items : [];
      const lastRefreshData = refreshRes.data.success ? refreshRes.data.items : [];

      console.log('✅ Processed accounts:', accountsData.length);
      console.log('✅ Processed plaid items:', plaidItemsData.length);
      console.log('✅ Accounts data type:', typeof accountsData);
      console.log('✅ Accounts is array:', Array.isArray(accountsData));

      // Ensure accounts is always an array
      const safeAccountsData = Array.isArray(accountsData) ? accountsData : [];
      const safePlaidItemsData = Array.isArray(plaidItemsData) ? plaidItemsData : [];

      setAccounts(safeAccountsData);
      setPlaidItems(safePlaidItemsData);
      
      // Set the most recent refresh time
      if (lastRefreshData.length > 0) {
        const mostRecent = lastRefreshData.reduce((latest, item) => {
          if (!latest || !item.last_refresh) return latest;
          return new Date(item.last_refresh) > new Date(latest.last_refresh) ? item : latest;
        });
        setLastRefresh(mostRecent.last_refresh);
      } else {
        setLastRefresh(null);
      }

    } catch (error) {
      console.error('❌ Error refreshing accounts:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setAccounts([]);
      setPlaidItems([]);
      setLastRefresh(null);
    }
  }, []);

  return (
    <AccountsContext.Provider value={{
      accounts,
      plaidItems,
      lastRefresh,
      refreshAccounts,
      setAccounts, // in case you want to update locally
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  return useContext(AccountsContext);
} 