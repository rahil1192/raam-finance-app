import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.2.19:8001/api';

const AccountsContext = createContext();

export function AccountsProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [plaidItems, setPlaidItems] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch accounts and Plaid items together
  const refreshAccounts = useCallback(async () => {
    try {
      const [accountsRes, plaidRes, refreshRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/accounts`),
        axios.get(`${API_BASE_URL}/plaid/items`),
        axios.get(`${API_BASE_URL}/plaid/last_refresh`)
      ]);
      setAccounts(accountsRes.data);
      setPlaidItems(plaidRes.data);
      setLastRefresh(refreshRes.data.last_refresh);
    } catch (e) {
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