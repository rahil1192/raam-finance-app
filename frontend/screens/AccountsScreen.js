import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccounts } from '../context/AccountsContext';
import { create, open } from 'react-native-plaid-link-sdk';
import { plaidService } from '../services/api';
import { apiConfig } from '../config/api';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign } from '@expo/vector-icons';

const TIME_RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export default function App({ navigation }) {
  const { accounts, plaidItems, lastRefresh, refreshAccounts, setAccounts } = useAccounts();
  
  // Debug logging for accounts
  console.log('🔍 AccountsScreen - accounts:', accounts);
  console.log('🔍 AccountsScreen - accounts type:', typeof accounts);
  console.log('🔍 AccountsScreen - accounts is array:', Array.isArray(accounts));
  
  // Debug individual account structure
  if (accounts && Array.isArray(accounts) && accounts.length > 0) {
    console.log('🔍 First account structure:', accounts[0]);
    console.log('🔍 First account plaid_item:', accounts[0].plaid_item);
    
    // Log all accounts with their status
    accounts.forEach((account, index) => {
      console.log(`🔍 Account ${index + 1}: ${account.name}`, {
        id: account.id,
        last_updated: account.last_updated,
        plaid_item: account.plaid_item,
        status: account.plaid_item?.status,
        needs_update: account.plaid_item?.needs_update
      });
    });
  }
  
  const [selectedTab, setSelectedTab] = useState('NET WORTH');
  const [selectedRange, setSelectedRange] = useState('1M');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshMessage, setLastRefreshMessage] = useState('');
  const [expandedBanks, setExpandedBanks] = useState({});
  const [loadingNetWorth, setLoadingNetWorth] = useState(false);
  const [tabTotals, setTabTotals] = useState({ netWorth: 0, cash: 0, credit: 0, mortgage: 0 });
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAllAccountsDuringRefresh, setShowAllAccountsDuringRefresh] = useState(false);
  const [refreshingAccounts, setRefreshingAccounts] = useState(new Set());
  const [syncingTransactions, setSyncingTransactions] = useState(false);

  // Calculate net worth: sum of account balances (positive for assets, negative for liabilities)
  const calculateNetWorth = (accounts) => {
    if (!accounts || !Array.isArray(accounts)) return 0;
    return accounts.reduce((sum, account) => {
      const balance = account.current_balance || 0;
      const subtype = (account.subtype || "").toLowerCase();
      const type = (account.type || "").toLowerCase();
      
      if (subtype.includes('credit') || type.includes('credit')) {
        // Credit accounts are liabilities, so subtract their balance
        return sum - balance;
      } else if (subtype.includes('mortgage') || type.includes('loan')) {
        // Mortgage accounts are liabilities, so subtract their balance
        return sum - balance;
      } else {
        // All other accounts are assets, so add their balance
        return sum + balance;
      }
    }, 0);
  };

  // Calculate cash (chequing + savings)
  const calculateCash = (accounts) => {
    if (!accounts || !Array.isArray(accounts)) return 0;
    return accounts.reduce((sum, account) => {
      const subtype = (account.subtype || '').toLowerCase();
      if (subtype.includes('chequing') || subtype.includes('checking') || subtype.includes('savings')) {
        return sum + (account.current_balance || 0);
      }
      return sum;
    }, 0);
  };

  // Calculate credit card total (liabilities)
  const calculateCredit = (accounts) => {
    if (!accounts || !Array.isArray(accounts)) return 0;
    return accounts.reduce((sum, account) => {
      const subtype = (account.subtype || '').toLowerCase();
      const type = (account.type || '').toLowerCase();
      if (subtype.includes('credit') || type.includes('credit')) {
        return sum + (account.current_balance || 0);
      }
      return sum;
    }, 0);
  };

  // Calculate mortgage total (liabilities)
  const calculateMortgage = (accounts) => {
    if (!accounts || !Array.isArray(accounts)) return 0;
    return accounts.reduce((sum, account) => {
      const subtype = (account.subtype || '').toLowerCase();
      const type = (account.type || '').toLowerCase();
      if (subtype.includes('mortgage') || type.includes('loan')) {
        return sum + (account.current_balance || 0);
      }
      return sum;
    }, 0);
  };

  // Update all tab totals when accounts change
  useEffect(() => {
    setTabTotals({
      netWorth: calculateNetWorth(accounts),
      cash: calculateCash(accounts),
      credit: calculateCredit(accounts),
      mortgage: calculateMortgage(accounts),
    });
  }, [accounts]);

  // Fetch accounts and Plaid items on mount
  useEffect(() => {
    refreshAccounts();
  }, []);

  // Periodic sync check to ensure accounts stay synchronized
  useEffect(() => {
    if (!accounts || accounts.length === 0) return;
    
    const syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Periodic sync check...');
        
        // First sync transactions from Plaid
        const syncResponse = await fetch(`${apiConfig.baseURL}/api/plaid/sync_transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ force_full_fetch: false }) // Use incremental sync for periodic updates
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('📊 Periodic transaction sync result:', syncResult);
        }
        
        // Wait a moment for backend to process the sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now refresh account balances from Plaid
        console.log('🔄 Refreshing account balances from Plaid...');
        await refreshAccountBalances();
        
        // Wait for balance updates to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then refresh account metadata
        await refreshAccounts();
        console.log('✅ Periodic sync completed');
      } catch (error) {
        console.error('❌ Periodic sync failed:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(syncInterval);
  }, [accounts, refreshAccounts]);

  // Helper for account icon (replace with real images if you want)
  const getBankIcon = (name) => {
    if (name && name.toLowerCase().includes('cibc')) {
      return '🏦';
    }
    return '🏦';
  };

  // Use accounts for the list, fallback to empty array
  // const accounts = accountsData || [];

  // Helper to check if account is stale (now uses lastRefresh)
  const isStale = (account) => {
    // Check individual account's last_updated instead of global lastRefresh
    if (!account.last_updated) return true;
    const last = new Date(account.last_updated);
    const isStale = (Date.now() - last.getTime()) > 24 * 60 * 60 * 1000; // More than 24 hours
    
    console.log(`🔍 Account ${account.name} stale check:`, {
      lastUpdated: account.last_updated,
      lastDate: last,
      now: new Date(),
      timeDiff: Date.now() - last.getTime(),
      isStale: isStale
    });
    
    return isStale;
  };

  // Helper to check if account needs manual refresh (e.g., PRODUCT_NOT_READY errors)
  const needsManualRefresh = (account) => {
    // If account is currently being refreshed, don't show refresh button
    if (refreshingAccounts.has(account.id)) {
      return false;
    }
    
    // Check if account has no transactions or very old last_updated
    const lastUpdated = account.last_updated ? new Date(account.last_updated) : null;
    const isOld = lastUpdated && (Date.now() - lastUpdated.getTime()) > 24 * 60 * 60 * 1000; // More than 24 hours
    
    // If account was updated recently (within last hour), it doesn't need refresh
    const wasRecentlyUpdated = lastUpdated && (Date.now() - lastUpdated.getTime()) < 60 * 60 * 1000; // Less than 1 hour
    
    return !wasRecentlyUpdated && (isOld || !lastUpdated);
  };

  // Helper to check if accounts are properly synced
  const areAccountsSynced = () => {
    if (!accounts || !Array.isArray(accounts)) return false;
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return accounts.every(account => {
      if (!account.last_updated) return false;
      const lastUpdated = new Date(account.last_updated).getTime();
      return lastUpdated > oneHourAgo;
    });
  };

  // Helper to get sync status message
  const getSyncStatusMessage = () => {
    if (!accounts || !Array.isArray(accounts)) return 'No accounts found';
    
    const syncedCount = accounts.filter(account => {
      if (!account.last_updated) return false;
      const lastUpdated = new Date(account.last_updated).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return lastUpdated > oneHourAgo;
    }).length;
    
    const totalCount = accounts.length;
    
    if (syncedCount === totalCount) {
      return `✅ All ${totalCount} accounts synced`;
    } else if (syncedCount > 0) {
      return `⚠️ ${syncedCount}/${totalCount} accounts synced`;
    } else {
      return `❌ No accounts synced`;
    }
  };

  // Helper to refresh account balances from Plaid
  const refreshAccountBalances = async () => {
    try {
      console.log('🔄 Refreshing account balances from Plaid...');
      setLastRefreshMessage('Refreshing account balances...');
      
      // Call the backend to refresh account balances from Plaid
      const balanceResponse = await fetch(`${apiConfig.baseURL}/api/plaid/refresh_account_balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!balanceResponse.ok) {
        if (balanceResponse.status === 404) {
          console.log('⚠️ Account balance refresh endpoint not found, skipping balance refresh');
          setLastRefreshMessage('Account balance refresh not available');
          return true; // Don't treat this as an error
        }
        throw new Error(`HTTP ${balanceResponse.status}: Failed to refresh account balances`);
      }
      
      const balanceResult = await balanceResponse.json();
      console.log('📊 Account balance refresh result:', balanceResult);
      
      if (balanceResult.success) {
        setLastRefreshMessage(`Account balances refreshed: ${balanceResult.accounts_updated || 0} updated`);
      } else {
        setLastRefreshMessage('Account balance refresh completed');
      }
      
      return balanceResult.success;
    } catch (error) {
      console.error('❌ Error refreshing account balances:', error);
      setLastRefreshMessage('Failed to refresh account balances');
      return false;
    }
  };

  // Replace fetchAccounts and onRefresh to use refreshAccounts
  const fetchAccounts = refreshAccounts;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLastRefreshMessage('');
    setShowAllAccountsDuringRefresh(true); // Show all accounts during refresh
    
    // Expand all banks during refresh so users can see all accounts
    if (accounts && Array.isArray(accounts)) {
      const allBanks = {};
      accounts.forEach(account => {
        const bankName = account.plaid_item?.institution_name || 
                        account.institution_name || 
                        'Unknown Bank';
        allBanks[bankName] = true;
      });
      setExpandedBanks(allBanks);
    }
    
    // Check if any accounts need updating
    const anyAccountsStale = accounts && Array.isArray(accounts) && 
      accounts.some(account => isStale(account) || 
        account.plaid_item?.status === 'ITEM_LOGIN_REQUIRED' ||
        account.plaid_item?.status === 'INVALID_ACCESS_TOKEN' ||
        account.plaid_item?.status === 'ITEM_ERROR' ||
        account.plaid_item?.needs_update
      );
    
    if (anyAccountsStale) {
      console.log('🔄 Some accounts need updating, proceeding with refresh...');
    }
    
    try {
      // First, sync transactions from Plaid to get the latest data
      console.log('🔄 Syncing transactions from Plaid...');
      setLastRefreshMessage('Syncing transactions from Plaid...');
      setSyncingTransactions(true);
      
      const syncResponse = await fetch(`${apiConfig.baseURL}/api/plaid/sync_transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force_full_fetch: false }) // Use incremental sync for faster refresh
      });
      
      if (!syncResponse.ok) {
        throw new Error(`HTTP ${syncResponse.status}: Failed to sync transactions`);
      }
      
      const syncResult = await syncResponse.json();
      console.log('📊 Plaid sync result:', syncResult);
      
      if (syncResult.success) {
        const { added, modified, removed } = syncResult;
        let syncMessage = '';
        
        if (added > 0 || modified > 0 || removed > 0) {
          const changes = [];
          if (added > 0) changes.push(`${added} new`);
          if (modified > 0) changes.push(`${modified} updated`);
          if (removed > 0) changes.push(`${removed} removed`);
          syncMessage = `Synced ${changes.join(', ')} transaction${changes.length > 1 ? 's' : ''}`;
        } else {
          syncMessage = 'No new transactions found';
        }
        
        setLastRefreshMessage(syncMessage);
      } else {
        setLastRefreshMessage('Transaction sync completed');
      }
      
      // Wait a moment for backend to process the sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now refresh account balances from Plaid to get updated balances
      console.log('🔄 Refreshing account balances from Plaid...');
      await refreshAccountBalances();
      
      // Wait a moment for backend to process balance updates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now refresh account metadata and balances
      console.log('🔄 Starting global refresh of all accounts...');
      await refreshAccounts();
      console.log('✅ Global refresh completed successfully');
      
      // Wait a moment to ensure backend has processed all updates
      setTimeout(() => {
        console.log('🔄 Performing final sync check...');
        refreshAccounts().catch(error => {
          console.error('❌ Final sync check failed:', error);
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error refreshing accounts:', error);
      setLastRefreshMessage('Error refreshing accounts');
    } finally {
      setRefreshing(false);
      setSyncingTransactions(false);
      // After refresh is complete, wait a moment then hide the flag
      setTimeout(() => {
        setShowAllAccountsDuringRefresh(false);
      }, 1000);
    }
  }, [refreshAccounts, accounts]);

  // Group accounts by institution
  const getFilteredAccounts = () => {
    const accountsByBank = {};
    if (accounts && Array.isArray(accounts)) {
      console.log('🔍 Grouping accounts:', accounts.length);
      accounts.forEach(account => {
        // Get institution name from nested plaid_item or fallback to direct property
        const bankName = account.plaid_item?.institution_name || 
                        account.institution_name || 
                        'Unknown Bank';
        
        console.log('🏦 Account:', account.name, 'Bank:', bankName);
        
        if (!accountsByBank[bankName]) {
          accountsByBank[bankName] = [];
        }
        accountsByBank[bankName].push(account);
      });
    }
    console.log('📊 Grouped accounts:', Object.keys(accountsByBank));
    return accountsByBank;
  };

  // Get accounts filtered by selected tab
  const getAccountsByTab = () => {
    if (!accounts || !Array.isArray(accounts)) return {};
    
    const accountsByBank = {};
    
    accounts.forEach(account => {
      const bankName = account.plaid_item?.institution_name || 
                      account.institution_name || 
                      'Unknown Bank';
      
      if (!accountsByBank[bankName]) {
        accountsByBank[bankName] = [];
      }
      
      // Filter accounts based on selected tab
      let shouldInclude = false;
      
      // If refreshing, show all accounts temporarily
      if (showAllAccountsDuringRefresh) {
        accountsByBank[bankName].push(account);
        return;
      }
      
      switch (selectedTab) {
        case 'NET WORTH':
          // Include all accounts for net worth
          shouldInclude = true;
          break;
        case 'CASH':
          // Only include chequing/savings accounts
          const subtype = (account.subtype || '').toLowerCase();
          shouldInclude = subtype.includes('chequing') || 
                         subtype.includes('checking') || 
                         subtype.includes('savings');
          break;
        case 'CREDIT CARDS':
          // Only include credit card accounts
          const creditSubtype = (account.subtype || '').toLowerCase();
          const creditType = (account.type || '').toLowerCase();
          shouldInclude = creditSubtype.includes('credit') || 
                         creditType.includes('credit');
          break;
        case 'MORTGAGE':
          // Only include mortgage accounts
          const mortgageSubtype = (account.subtype || '').toLowerCase();
          const mortgageType = (account.type || '').toLowerCase();
          shouldInclude = mortgageSubtype.includes('mortgage') || 
                         mortgageType.includes('mortgage');
          break;
        default:
          shouldInclude = true;
      }
      
      if (shouldInclude) {
        accountsByBank[bankName].push(account);
      }
    });
    
    // Remove banks with no accounts for the selected tab
    Object.keys(accountsByBank).forEach(bank => {
      if (accountsByBank[bank].length === 0) {
        delete accountsByBank[bank];
      }
    });
    
    return accountsByBank;
  };

  const getBankTotal = (accounts) => calculateNetWorth(accounts);

  const toggleBank = (bank) => {
    setExpandedBanks(prev => ({
      ...prev,
      [bank]: !prev[bank]
    }));
  };

  // Helper to get start date for a range
  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case '1M':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '3M':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case '6M':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case '1Y':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  };

  // Helper to get history type based on selected tab
  const getHistoryType = (tab) => {
    switch (tab) {
      case 'NET WORTH':
        return 'networth';
      case 'CASH':
        return 'assets';
      case 'CREDIT CARDS':
        return 'liabilities';
      case 'MORTGAGE':
        return 'liabilities';
      default:
        return 'networth';
    }
  };

  // Handler for three-dot menu
  const handleMenuPress = () => setMenuVisible(true);
  const handleMenuClose = () => setMenuVisible(false);
  const handleRefreshAll = async () => {
    setMenuVisible(false);
    setShowAllAccountsDuringRefresh(true); // Show all accounts during refresh
    await onRefresh();
  };
  
  const handleForceFullSync = async () => {
    setMenuVisible(false);
    setShowAllAccountsDuringRefresh(true);
    
    try {
      setLastRefreshMessage('Force full sync in progress...');
      setSyncingTransactions(true);
      console.log('🔄 Starting force full sync from Plaid...');
      
      // Perform a full sync from Plaid (up to 24 months of data)
      const syncResponse = await fetch(`${apiConfig.baseURL}/api/plaid/sync_transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force_full_fetch: true }) // Force full fetch
      });
      
      if (!syncResponse.ok) {
        throw new Error(`HTTP ${syncResponse.status}: Failed to force sync transactions`);
      }
      
      const syncResult = await syncResponse.json();
      console.log('📊 Force full sync result:', syncResult);
      
      if (syncResult.success) {
        const { added, modified, removed } = syncResult;
        let syncMessage = '';
        
        if (added > 0 || modified > 0 || removed > 0) {
          const changes = [];
          if (added > 0) changes.push(`${added} new`);
          if (modified > 0) changes.push(`${modified} updated`);
          if (removed > 0) changes.push(`${removed} removed`);
          syncMessage = `Full sync: ${changes.join(', ')} transaction${changes.length > 1 ? 's' : ''}`;
        } else {
          syncMessage = 'Full sync completed - no changes found';
        }
        
        setLastRefreshMessage(syncMessage);
      }
      
      // Wait for backend to process, then refresh accounts
      setTimeout(async () => {
        try {
          // First refresh account balances from Plaid
          console.log('🔄 Refreshing account balances after full sync...');
          await refreshAccountBalances();
          
          // Wait for balance updates to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Then refresh account metadata
          await refreshAccounts();
          setLastRefreshMessage('Full sync completed successfully');
        } catch (error) {
          console.error('❌ Error refreshing accounts after full sync:', error);
          setLastRefreshMessage('Full sync completed but failed to refresh accounts');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error during force full sync:', error);
      setLastRefreshMessage('Force full sync failed');
    } finally {
      setSyncingTransactions(false);
      setTimeout(() => {
        setShowAllAccountsDuringRefresh(false);
      }, 1000);
    }
  };
  
  const handleViewInstitutionSettings = () => {
    setMenuVisible(false);
    // Navigation or logic for institution settings can go here
  };

  // Add useEffect to auto-clear lastRefreshMessage after 6 seconds
  useEffect(() => {
    if (lastRefreshMessage) {
      const timer = setTimeout(() => {
        setLastRefreshMessage('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshMessage]);

  // Plaid Link configuration
  const handlePlaidLink = async () => {
    console.log('🔗 Add Account button clicked');
    console.log('📱 Device info:', __DEV__ ? 'Development' : 'Production');
    
    try {
      console.log('🚀 Attempting to create link token...');
      console.log('🌐 API Config:', apiConfig);
      console.log('🔗 API Base URL:', apiConfig.baseURL);
      
      const response = await plaidService.createLinkToken();
      console.log('✅ Link token response received:', response);
      
      const linkToken = response.link_token;
      console.log('🎫 Link token extracted:', linkToken ? 'Present' : 'Missing');
      
      if (!linkToken) {
        console.error('❌ No link token received');
        setLastRefreshMessage('Error: No link token received');
        return;
      }

      console.log('🔓 Creating Plaid Link with token...');
      create({ token: linkToken });
      
      console.log('🚪 Opening Plaid Link...');
      open({
        onSuccess: async (result) => {
          console.log('✅ Plaid Link success:', result);
          setLastRefreshMessage('Successfully connected to bank');
          try {
            console.log('🔄 Exchanging public token...');
            await plaidService.exchangePublicToken(result.publicToken);
            console.log('✅ Public token exchanged successfully');
            
            // Wait for backend to process the new connection
            setLastRefreshMessage('Processing bank connection...');
            setTimeout(async () => {
              try {
                console.log('🔄 Refreshing accounts after new connection...');
                await refreshAccounts();
                console.log('✅ Accounts refreshed after new connection');
                setLastRefreshMessage('Bank connected and accounts synced successfully');
              } catch (error) {
                console.error('❌ Error refreshing accounts after connection:', error);
                setLastRefreshMessage('Bank connected but failed to sync accounts');
              }
            }, 2000);
            
          } catch (error) {
            console.error('❌ Error exchanging public token:', error);
            setLastRefreshMessage('Error connecting to bank');
          }
        },
        onExit: (result) => {
          console.log('🚪 Plaid Link exited:', result);
          if (result.error) {
            console.error('❌ Plaid Link error:', result.error);
            setLastRefreshMessage(`Error: ${result.error.displayMessage || 'Could not connect to bank'}`);
          }
        },
      });
    } catch (error) {
      console.error('❌ Error creating link token:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      setLastRefreshMessage('Error: Could not create link token');
    }
  };

  // Handle reconnection for existing accounts (uses update mode, not create mode)
  const handleReconnection = async (account) => {
    console.log('🔄 Reconnecting account:', account.name);
    console.log('🔍 Account details:', {
      id: account.id,
      plaid_item: account.plaid_item,
      item_id: account.plaid_item?.item_id
    });
    
    if (!account.plaid_item) {
      console.error('❌ No Plaid item found for account:', account.name);
      setLastRefreshMessage('Error: Cannot reconnect account - no Plaid connection found');
      return;
    }
    
    if (!account.plaid_item.item_id) {
      console.error('❌ No Plaid item ID found for account:', account.name);
      console.log('🔍 Plaid item structure:', account.plaid_item);
      
      // Try to get the item_id from the plaid_item_id field if available
      if (account.plaid_item_id) {
        console.log('🔄 Using plaid_item_id as fallback:', account.plaid_item_id);
        try {
          const response = await plaidService.createUpdateLinkToken(account.plaid_item_id);
          console.log('✅ Update link token response:', response);
          
          const linkToken = response.link_token;
          if (!linkToken) {
            console.error('❌ No update link token received');
            setLastRefreshMessage('Error: No update link token received');
            return;
          }

          console.log('🔓 Creating Plaid Link in UPDATE mode...');
          create({ token: linkToken });
          
          console.log('🚪 Opening Plaid Link in update mode...');
          open({
            onSuccess: async (result) => {
              console.log('✅ Plaid Link update success:', result);
              setLastRefreshMessage('Successfully reconnected to bank');
              try {
                console.log('🔄 Exchanging public token...');
                await plaidService.exchangePublicToken(result.publicToken);
                console.log('✅ Public token exchanged successfully');
                await refreshAccounts();
                console.log('✅ Accounts refreshed');
              } catch (error) {
                console.error('❌ Error exchanging public token:', error);
                setLastRefreshMessage('Error reconnecting to bank');
              }
            },
            onExit: (result) => {
              console.log('🚪 Plaid Link update exited:', result);
              if (result.error) {
                console.error('❌ Plaid Link update error:', result.error);
                setLastRefreshMessage(`Error: ${result.error.displayMessage || 'Could not reconnect to bank'}`);
              }
            },
          });
          return;
        } catch (error) {
          console.error('❌ Error creating update link token with fallback ID:', error);
        }
      }
      
      setLastRefreshMessage('Error: Cannot reconnect account - missing Plaid item ID');
      return;
    }

    try {
      console.log('🚀 Creating update link token for item:', account.plaid_item.item_id);
      
      const response = await plaidService.createUpdateLinkToken(account.plaid_item.item_id);
      console.log('✅ Update link token response:', response);
      
      const linkToken = response.link_token;
      if (!linkToken) {
        console.error('❌ No update link token received');
        setLastRefreshMessage('Error: No update link token received');
        return;
      }

      console.log('🔓 Creating Plaid Link in UPDATE mode...');
      create({ token: linkToken });
      
      console.log('🚪 Opening Plaid Link in update mode...');
      open({
        onSuccess: async (result) => {
          console.log('✅ Plaid Link update success:', result);
          setLastRefreshMessage('Successfully reconnected to bank');
          try {
            console.log('🔄 Exchanging public token...');
            await plaidService.exchangePublicToken(result.publicToken);
            console.log('✅ Public token exchanged successfully');
            
            // Wait for backend to process the reconnection
            setLastRefreshMessage('Processing bank reconnection...');
            setTimeout(async () => {
              try {
                console.log('🔄 Refreshing accounts after reconnection...');
                await refreshAccounts();
                console.log('✅ Accounts refreshed after reconnection');
                setLastRefreshMessage('Bank reconnected and accounts synced successfully');
              } catch (error) {
                console.error('❌ Error refreshing accounts after reconnection:', error);
                setLastRefreshMessage('Bank reconnected but failed to sync accounts');
              }
            }, 2000);
            
          } catch (error) {
            console.error('❌ Error exchanging public token:', error);
            setLastRefreshMessage('Error reconnecting to bank');
          }
        },
        onExit: (result) => {
          console.log('🚪 Plaid Link update exited:', result);
          if (result.error) {
            console.error('❌ Plaid Link update error:', result.error);
            setLastRefreshMessage(`Error: ${result.error.displayMessage || 'Could not reconnect to bank'}`);
          }
        },
      });
    } catch (error) {
      console.error('❌ Error creating update link token:', error);
      setLastRefreshMessage('Error: Could not create update link token');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.headerTitle}>Accounts</Text>
          <TouchableOpacity>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleMenuPress}>
          <Text style={styles.headerIcon}>⋯</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePlaidLink}>
          <Text style={styles.headerIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleRefreshAll}>
              <Text style={styles.menuItemText}>Refresh all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleForceFullSync}>
              <Text style={styles.menuItemText}>Force full sync</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewInstitutionSettings}>
              <Text style={styles.menuItemText}>View institution settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top Net Worth / Cash / Credit Cards Tabs with values */}
      <View style={styles.topTabsContainer}>
        {['NET WORTH', 'CASH', 'CREDIT CARDS', 'MORTGAGE'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.topTab, selectedTab === tab && styles.topTabSelected]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.topTabLabel, selectedTab === tab && styles.topTabLabelSelected]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Move the selected tab total to the top left, just below the tab row, with smaller font */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 16, marginTop: 8 }}>
        <View style={styles.selectedTabTotalContainerTopLeft}>
          <Text style={styles.selectedTabTotalValueTopLeft}>
            {selectedTab === 'NET WORTH' && `$${tabTotals.netWorth.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
            {selectedTab === 'CASH' && `$${tabTotals.cash.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
            {selectedTab === 'CREDIT CARDS' && `$${tabTotals.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
            {selectedTab === 'MORTGAGE' && `$${tabTotals.mortgage.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
          </Text>
          <Text style={styles.selectedTabTotalSubtextTopLeft}>$0.00 (0%) 1 month</Text>
        </View>
      </View>

      {/* Refresh Message */}
      {lastRefreshMessage ? (
        <View style={styles.refreshMessage}>
          <Text style={styles.refreshMessageText}>{lastRefreshMessage}</Text>
        </View>
      ) : null}

      {/* Sync Status Display */}
      {accounts && Array.isArray(accounts) && accounts.length > 0 && (
        <View style={[
          styles.syncStatusContainer,
          areAccountsSynced() ? styles.syncStatusSynced : styles.syncStatusUnsynced
        ]}>
          <Text style={[
            styles.syncStatusText,
            areAccountsSynced() ? styles.syncStatusTextSynced : styles.syncStatusTextUnsynced
          ]}>
            {syncingTransactions ? '🔄 Syncing transactions from Plaid...' : getSyncStatusMessage()}
          </Text>
          <TouchableOpacity 
            style={styles.manualSyncButton}
            onPress={async () => {
              try {
                setSyncingTransactions(true);
                setLastRefreshMessage('Manual sync in progress...');
                await refreshAccounts();
                setLastRefreshMessage('Manual sync completed');
              } catch (error) {
                console.error('❌ Manual sync failed:', error);
                setLastRefreshMessage('Manual sync failed');
              } finally {
                setSyncingTransactions(false);
              }
            }}
            disabled={syncingTransactions}
          >
            <Text style={styles.manualSyncButtonText}>
              {syncingTransactions ? '⏳ Syncing...' : '🔄 Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Show message when displaying all accounts during refresh */}
      {showAllAccountsDuringRefresh && (
        <View style={[styles.refreshMessage, { backgroundColor: '#FFF3CD' }]}>
          <Text style={[styles.refreshMessageText, { color: '#856404' }]}>
            🔄 Showing all accounts during refresh...
          </Text>
        </View>
      )}

      {/* Show message when accounts need manual refresh */}
      {accounts && accounts.some(needsManualRefresh) && (
        <View style={[styles.refreshMessage, { backgroundColor: '#FFE5E5' }]}>
          <Text style={[styles.refreshMessageText, { color: '#D32F2F' }]}>
            ⚠️ Some accounts need manual refresh (use 🔄 button) - this usually happens when accounts were connected but transactions weren't ready yet
          </Text>
        </View>
      )}

      {/* Main Scrollable Content */}
      <FlatList
        data={[{ key: 'header' }, ...Object.entries(getAccountsByTab())]}
        keyExtractor={(item) => item.key || item[0]}
        contentContainerStyle={styles.mainContent}
        renderItem={({ item }) => {
          if (item.key === 'header') {
            return (
              <View style={styles.headerContent}>
                {/* Graph for all tabs */}
                <View style={styles.graphContainer}>
                  {loadingNetWorth ? (
                    <Text>Loading...</Text>
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>No net worth history data available</Text>
                    </View>
                  )}
                </View>
                {/* Time Range Tabs at bottom of graph */}
                <View style={styles.timeTabsBottom}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeTabsBottomScrollContent}>
                    {TIME_RANGES.map(range => (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.timeTab,
                          selectedRange === range && styles.timeTabSelected
                        ]}
                        onPress={() => setSelectedRange(range)}
                      >
                        <Text style={[
                          styles.timeTabText,
                          selectedRange === range && styles.timeTabTextSelected
                        ]}>{range}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            );
          }

          const [bank, bankAccounts] = item;
          const isExpanded = !!expandedBanks[bank];
          return (
            <View style={styles.bankCard}>
              <TouchableOpacity style={styles.bankHeader} onPress={() => toggleBank(bank)}>
                <Text style={styles.bankName}>{bank}</Text>
                <Text style={styles.bankTotal}>${getBankTotal(bankAccounts).toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
                <AntDesign name={isExpanded ? 'up' : 'down'} size={20} color="#888" style={{marginLeft: 8}} />
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.bankAccountsContainer}>
                  {bankAccounts.map(account => (
                    <TouchableOpacity 
                      key={account.account_id || account.id} 
                      onPress={() => {
                        console.log('Navigating to account detail with data:', account);
                        navigation.navigate('AccountDetailScreen', { 
                          account: {
                            ...account,
                            plaid_item: account.plaid_item || null
                          }
                        });
                      }}
                      style={styles.accountRow}
                    >
                      <Text style={styles.accountIcon}>{getBankIcon(account.name)}</Text>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{account.name} ({account.mask ? '...' + account.mask : ''})</Text>
                        <Text style={styles.accountType}>{account.subtype || account.type}</Text>
                      </View>
                      <View style={styles.accountBalanceContainer}>
                        <Text style={styles.accountBalance}>
                          ${account.current_balance ? account.current_balance.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                        </Text>
                        {(isStale(account) || account.plaid_item?.status === 'ITEM_LOGIN_REQUIRED' || 
                          account.plaid_item?.status === 'INVALID_ACCESS_TOKEN' || 
                          account.plaid_item?.status === 'ITEM_ERROR' || 
                          account.plaid_item?.needs_update) && (
                          <View style={styles.warningContainer}>
                            <AntDesign name="warning" size={16} color="#FF3B30" />
                            <Text style={styles.warningText}>Needs Update</Text>
                          </View>
                        )}
                        
                        {/* Debug: Log account status */}
                        {console.log(`🔍 Account ${account.name} status:`, {
                          isStale: isStale(account),
                          plaidStatus: account.plaid_item?.status,
                          needsUpdate: account.plaid_item?.needs_update,
                          lastUpdated: account.last_updated
                        })}
                        {/* Show reconnection warning if Plaid item needs reconnection */}
                        {account.plaid_item && (account.plaid_item.status === 'ITEM_LOGIN_REQUIRED' || 
                                               account.plaid_item.status === 'INVALID_ACCESS_TOKEN' || 
                                               account.plaid_item.status === 'ITEM_ERROR') && (
                          <View style={styles.reconnectionContainer}>
                            <AntDesign name="exclamationcircle" size={16} color="#FF3B30" />
                            <Text style={styles.reconnectionText}>Reconnection Required</Text>
                            <TouchableOpacity 
                              style={styles.reconnectButton}
                              onPress={() => handleReconnection(account)}
                            >
                              <Text style={styles.reconnectButtonText}>Reconnect</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <Text style={styles.accountUpdated}>{account.last_updated ? new Date(account.last_updated).toLocaleDateString() : ''}</Text>
                        
                        {/* Manual refresh button for individual accounts */}
                        <TouchableOpacity 
                          style={[
                            styles.refreshAccountButton,
                            needsManualRefresh(account) && styles.refreshAccountButtonUrgent
                          ]}
                          onPress={async () => {
                            try {
                              // Ensure we have a valid account ID
                              if (!account.id) {
                                console.error('❌ Account has no ID:', account);
                                setLastRefreshMessage('❌ Account ID missing');
                                return;
                              }
                              
                              console.log('🔄 Refreshing account:', {
                                id: account.id,
                                account_id: account.account_id,
                                name: account.name,
                                type: account.type,
                                subtype: account.subtype
                              });
                              
                              // Add account to refreshing set immediately
                              setRefreshingAccounts(prev => new Set(prev).add(account.id));
                              setLastRefreshMessage('Refreshing account...');
                              
                              // First, sync transactions from Plaid for this account
                              if (account.plaid_item?.item_id) {
                                console.log('🔄 Syncing transactions from Plaid for account:', account.name);
                                setLastRefreshMessage('Syncing transactions from Plaid...');
                                setSyncingTransactions(true);
                                
                                try {
                                  const syncResponse = await fetch(`${apiConfig.baseURL}/api/plaid/fetch_transactions_for_item`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ 
                                      item_id: account.plaid_item.item_id 
                                    })
                                  });
                                  
                                  if (syncResponse.ok) {
                                    const syncResult = await syncResponse.json();
                                    console.log('📊 Account transaction sync result:', syncResult);
                                    
                                    if (syncResult.success) {
                                      const { transactions_saved, transactions_filtered } = syncResult.results;
                                      setLastRefreshMessage(`Synced ${transactions_saved} transactions`);
                                    }
                                  }
                                } catch (syncError) {
                                  console.error('❌ Error syncing transactions for account:', syncError);
                                  // Continue with account refresh even if transaction sync fails
                                } finally {
                                  setSyncingTransactions(false);
                                }
                                
                                // Wait a moment for backend to process the sync
                                await new Promise(resolve => setTimeout(resolve, 1000));
                              }
                              
                              // Now refresh account balances from Plaid for this account
                              if (account.plaid_item?.item_id) {
                                console.log('🔄 Refreshing account balances from Plaid for account:', account.name);
                                setLastRefreshMessage('Refreshing account balances...');
                                
                                try {
                                  const balanceResponse = await fetch(`${apiConfig.baseURL}/api/plaid/refresh_account_balances`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ 
                                      item_id: account.plaid_item.item_id 
                                    })
                                  });
                                  
                                  if (balanceResponse.ok) {
                                    const balanceResult = await balanceResponse.json();
                                    console.log('📊 Account balance refresh result:', balanceResult);
                                    
                                    if (balanceResult.success) {
                                      setLastRefreshMessage(`Account balances refreshed: ${balanceResult.accounts_updated || 0} updated`);
                                    }
                                  } else if (balanceResponse.status === 404) {
                                    console.log('⚠️ Account balance refresh endpoint not found, skipping balance refresh');
                                    setLastRefreshMessage('Account balance refresh not available');
                                  } else {
                                    console.error('❌ HTTP error during balance refresh:', balanceResponse.status);
                                  }
                                } catch (balanceError) {
                                  console.error('❌ Error refreshing account balances:', balanceError);
                                  // Continue with account refresh even if balance refresh fails
                                }
                                
                                // Wait a moment for backend to process balance updates
                                await new Promise(resolve => setTimeout(resolve, 1000));
                              }
                              
                              // Now refresh the individual account
                              const refreshUrl = `${apiConfig.baseURL}/api/accounts/${account.id}/refresh`;
                              console.log('🌐 Calling refresh endpoint:', refreshUrl);
                              
                              const response = await fetch(refreshUrl, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              console.log('📡 Refresh response status:', response.status);
                              
                              if (!response.ok) {
                                const errorText = await response.text();
                                console.error('❌ HTTP error:', response.status, errorText);
                                throw new Error(`HTTP ${response.status}: ${errorText}`);
                              }
                              
                              const result = await response.json();
                              console.log('📡 Refresh response:', result);
                              
                              if (result.success) {
                                setLastRefreshMessage(`✅ ${result.message}`);
                                
                                // Wait a moment for backend to process, then refresh all accounts
                                setTimeout(async () => {
                                  try {
                                    console.log('🔄 Refreshing all accounts after individual refresh...');
                                    await refreshAccounts();
                                    console.log('✅ All accounts refreshed successfully');
                                  } catch (error) {
                                    console.error('❌ Error refreshing all accounts:', error);
                                    setLastRefreshMessage('Account refreshed but failed to sync with other accounts');
                                  }
                                }, 1000);
                              } else {
                                setLastRefreshMessage(`❌ Error: ${result.error}`);
                              }
                            } catch (error) {
                              console.error('❌ Error refreshing account:', error);
                              
                              // Try to parse error response for Plaid-specific errors
                              let errorMessage = error.message;
                              let requiresReconnection = false;
                              
                              try {
                                // Check if error message contains JSON response
                                if (error.message.includes('HTTP 400:')) {
                                  const errorText = error.message.split('HTTP 400:')[1];
                                  const errorData = JSON.parse(errorText);
                                  
                                  if (errorData.requires_reconnection) {
                                    requiresReconnection = true;
                                    errorMessage = errorData.message;
                                    
                                    // Show reconnection prompt
                                    Alert.alert(
                                      'Bank Connection Expired',
                                      errorData.message,
                                      [
                                        {
                                          text: 'Reconnect Now',
                                          onPress: () => {
                                            // Navigate to Plaid Link to reconnect
                                            handleReconnection(account);
                                          }
                                        },
                                        {
                                          text: 'Later',
                                          style: 'cancel'
                                        }
                                      ]
                                    );
                                  } else if (errorData.error === 'RATE_LIMIT_EXCEEDED') {
                                    errorMessage = `Rate limit exceeded. Please wait ${errorData.retry_after || 60} seconds before trying again.`;
                                  } else {
                                    errorMessage = errorData.message || errorData.error;
                                  }
                                }
                              } catch (parseError) {
                                console.log('Could not parse error response, using default message');
                              }
                              
                              setLastRefreshMessage(`❌ ${errorMessage}`);
                            } finally {
                              // Remove account from refreshing set
                              setRefreshingAccounts(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(account.id);
                                return newSet;
                              });
                            }
                          }}
                          disabled={refreshingAccounts.has(account.id)}
                        >
                          <Text style={[
                            styles.refreshAccountButtonText,
                            needsManualRefresh(account) && styles.refreshAccountButtonTextUrgent
                          ]}>
                            {refreshingAccounts.has(account.id) ? '⏳' : '🔄'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#aaa', marginTop: 20 }}>No accounts found.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addAccountBtn} onPress={handlePlaidLink}>
            <Text style={styles.addAccountText}>＋ Add an account</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerIcon: { fontSize: 22, marginHorizontal: 6 },
  topTabsContainer: { flexDirection: 'row', backgroundColor: '#F3F3F3', marginTop: 2 },
  topTab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 20 },
  topTabSelected: { backgroundColor: '#EDEDED' },
  topTabLabel: { fontSize: 10, color: '#888' },
  topTabLabelSelected: { color: '#222', fontWeight: 'bold', fontSize: 14 },
  selectedTabTotalContainer: {
    backgroundColor: '#F3F3F3',
    padding: 10,
    alignItems: 'center',
  },
  selectedTabTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  selectedTabTotalSubtext: {
    fontSize: 14,
    color: '#888',
  },
  netWorthSection: { alignItems: 'center', marginVertical: 16 },
  netWorthValue: { fontSize: 36, fontWeight: 'bold', color: '#222' },
  netWorthChange: { fontSize: 14, color: '#888', marginTop: 4 },
  timeTabs: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  timeTab: { padding: 8, marginHorizontal: 4, borderRadius: 12 },
  timeTabSelected: { backgroundColor: '#EDEDED' },
  timeTabText: { fontSize: 14, color: '#888' },
  timeTabTextSelected: { color: '#222', fontWeight: 'bold' },
  fixedContent: {
    backgroundColor: '#FAF9F6',
    paddingBottom: 8
  },
  graphContainer: {
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    width: '92%',
    alignSelf: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  graphScrollContent: {
    paddingHorizontal: 16
  },
  accountsContainer: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    marginTop: 8,
    overflow: 'hidden'
  },
  accountsListContent: {
    padding: 16,
    paddingBottom: 32
  },
  bankCard: { 
    backgroundColor: '#F8F8F8', 
    borderRadius: 12, 
    marginHorizontal: 16,
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2,
    overflow: 'hidden'
  },
  bankHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 12,
    backgroundColor: '#F8F8F8'
  },
  bankName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  bankTotal: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#007AFF' 
  },
  bankAccountsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  accountRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff'
  },
  accountInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  accountName: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  accountType: { 
    fontSize: 13, 
    color: '#888' 
  },
  accountBalanceContainer: { 
    alignItems: 'flex-end',
    minWidth: 100
  },
  accountBalance: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  accountUpdated: { 
    fontSize: 12, 
    color: '#E57373' 
  },
  accountIcon: { 
    fontSize: 32 
  },
  updateButton: {
    // Remove this style
  },
  updateButtonUrgent: {
    // Remove this style
  },
  updateButtonText: {
    // Remove this style
  },
  updateButtonTextUrgent: {
    // Remove this style
  },
  refreshMessage: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    alignItems: 'center',
  },
  refreshMessageText: {
    color: '#1976D2',
    fontSize: 14,
  },
  addAccountBtn: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 10, 
    padding: 14, 
    alignItems: 'center', 
    marginTop: 16 
  },
  addAccountText: { 
    color: '#888', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  mainContent: {
    paddingBottom: 32,
    marginTop: 8,
  },
  headerContent: {
    backgroundColor: '#FAF9F6',
    paddingBottom: 8
  },
  bankCard: { 
    backgroundColor: '#F8F8F8', 
    borderRadius: 12, 
    marginHorizontal: 16,
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2,
    overflow: 'hidden'
  },
  selectedTabTotalContainerTopLeft: {
    // Add appropriate styles for this container
  },
  selectedTabTotalValueTopLeft: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  selectedTabTotalSubtextTopLeft: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timeTabsBottom: {
    marginTop: 8,
    marginBottom: 24,
  },
  timeTabsBottomScrollContent: {
    paddingHorizontal: 16
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  menuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
  },
  refreshAccountButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginLeft: 8,
  },
  refreshAccountButtonUrgent: {
    backgroundColor: '#FFE5E5',
  },
  refreshAccountButtonText: {
    fontSize: 18,
    color: '#888',
  },
  refreshAccountButtonTextUrgent: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  reconnectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reconnectionText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reconnectButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  reconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncStatusContainer: {
    backgroundColor: '#F3F3F3',
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  syncStatusSynced: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    borderWidth: 1,
  },
  syncStatusUnsynced: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
    borderWidth: 1,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
  },
  syncStatusTextSynced: {
    color: '#2E7D32',
  },
  syncStatusTextUnsynced: {
    color: '#D32F2F',
  },
  manualSyncButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  manualSyncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});