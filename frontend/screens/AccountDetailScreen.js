import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, TouchableWithoutFeedback, FlatList, SafeAreaView, TextInput, BackHandler } from 'react-native';
import { create, open } from 'react-native-plaid-link-sdk';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FilterModal from '../components/FilterModal';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useAccounts } from '../context/AccountsContext';
import { apiConfig } from '../config/api';

const TIME_RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];
const DATE_RANGES = ['All time', 'This month', 'Last month', 'Custom'];
const SORT_OPTIONS = ['Date (new to old)', 'Date (old to new)', 'Amount (high to low)', 'Amount (low to high)'];

// In all filters, displays, and normalization, use txn.app_category (with fallback to category for legacy data). Remove PLAID_TO_APP_CATEGORY and normalizeCategory.

export default function AccountDetailScreen({ route, navigation }) {
  const { accounts, plaidItems, lastRefresh, refreshAccounts } = useAccounts();
  const { account: initialAccount } = route.params;
  const [account, setAccount] = useState(initialAccount);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(account.last_updated);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1M');
  const [transactions, setTransactions] = useState([]);
  const [graphData, setGraphData] = useState([]); // Placeholder for graph data
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [allAccounts, setAllAccounts] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: 'All time',
    sortBy: 'Date (new to old)',
    selectedAccounts: [account.account_id],
    categories: [],
    merchants: [],
    amounts: [],
    tags: [],
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const isFocused = useIsFocused();

  // Debug account object
  console.log('🔍 AccountDetailScreen Debug:');
  console.log('📦 Initial account:', initialAccount);
  console.log('📦 Current account:', account);
  console.log('📦 Account ID:', account?.account_id);
  console.log('📦 Account name:', account?.name);

  useEffect(() => {
    const fetchAllAccounts = async () => {
      try {
        const res = await axios.get(`${apiConfig.baseURL}/api/accounts`);
        if (Array.isArray(res.data)) {
          setAllAccounts(res.data);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setAllAccounts([]);
      }
    };
    fetchAllAccounts();
  }, []);

  useEffect(() => {
    const fetchLastRefresh = async () => {
      try {
        const res = await axios.get(`${apiConfig.baseURL}/api/plaid/last_refresh`);
        // Don't call setLastRefresh since it's managed by the context
        // The context will update automatically when refreshAccounts() is called
      } catch (e) {
        console.error('Error fetching last refresh:', e);
      }
    };
    fetchLastRefresh();
  }, []);

  useEffect(() => {
    // Fetch recent transactions for this account (placeholder logic)
    const fetchTransactions = async () => {
      try {
        console.log('🔍 Fetching transactions for account:', account.account_id);
        console.log('🔧 API URL:', `${apiConfig.baseURL}/api/transactions?account_id=${account.account_id}`);
        
        const res = await axios.get(`${apiConfig.baseURL}/api/transactions?account_id=${account.account_id}`);
        console.log('📦 Transactions API response:', res.data);
        console.log('📊 Response type:', typeof res.data);
        console.log('📊 Is array:', Array.isArray(res.data));
        console.log('📊 Response length:', res.data?.length);
        
        // Handle different response formats
        let transactionsData = res.data;
        if (res.data && res.data.success && res.data.transactions) {
          transactionsData = res.data.transactions;
        }
        
        console.log('✅ Processed transactions data:', transactionsData);
        console.log('📊 Processed data length:', transactionsData?.length);
        
        setTransactions(transactionsData.slice(0, 4)); // Show 4 recent
      } catch (e) {
        console.error('❌ Error fetching transactions:', e);
        console.error('❌ Error response:', e.response?.data);
        console.error('❌ Error status:', e.response?.status);
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [account.account_id]);

  useEffect(() => {
    // Fetch all transactions for selected accounts
    const fetchAllTransactions = async () => {
      try {
        // If no accounts selected, use current account
        const accountIds = filters.selectedAccounts.length > 0 
          ? filters.selectedAccounts 
          : [account.account_id];

        console.log('🔍 Fetching all transactions for accounts:', accountIds);

        // Fetch transactions for each selected account
        const allTxnPromises = accountIds.map(accountId => {
          const url = `${apiConfig.baseURL}/api/transactions?account_id=${accountId}`;
          console.log('🔧 API URL for account', accountId, ':', url);
          return axios.get(url);
        });
        
        const responses = await Promise.all(allTxnPromises);
        console.log('📦 All transaction responses:', responses.map(r => r.data));
        
        const allTxns = responses.flatMap(res => {
          // Handle different response formats
          let transactionsData = res.data;
          if (res.data && res.data.success && res.data.transactions) {
            transactionsData = res.data.transactions;
          }
          return transactionsData || [];
        });
        
        console.log('✅ Processed all transactions:', allTxns);
        console.log('📊 Total transactions count:', allTxns.length);
        
        setAllTransactions(allTxns);
      } catch (e) {
        console.error('❌ Error fetching all transactions:', e);
        console.error('❌ Error response:', e.response?.data);
        
        if (
          (e.response && e.response.data && e.response.data.error === 'ITEM_LOGIN_REQUIRED') ||
          (e.response && e.response.status === 500)
        ) {
          setNeedsUpdate(true);
        } else {
          setNeedsUpdate(false);
        }
        setAllTransactions([]);
      }
    };
    fetchAllTransactions();
  }, [filters.selectedAccounts, account.account_id]);

  // Filtering and sorting logic
  function applyFiltersToTransactions(transactions, filters) {
    let filtered = [...transactions];

    // Filter by accounts (should always be current account, but keep logic for future reuse)
    if (filters.selectedAccounts.length > 0) {
      filtered = filtered.filter(txn => filters.selectedAccounts.includes(txn.account_id));
    }

    // Filter by categories (using normalized category from backend)
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(txn =>
        filters.categories.includes(txn.app_category)
      );
    }

    // Filter by merchants
    if (filters.merchants && filters.merchants.length > 0) {
      filtered = filtered.filter(txn => {
        let merchant = txn.details || 'Other';
        if (merchant !== 'Other') {
          const words = merchant.split(' ');
          // Filter out words that are all digits
          const nonNumericWords = words.filter(w => !/^\d+$/.test(w));
          merchant = nonNumericWords.slice(0, 5).join(' ');
        }
        return filters.merchants.includes(merchant);
      });
    }

    // Filter by date range
    if (filters.dateRange && filters.dateRange !== 'All time') {
      const now = new Date();
      let startDate = null;
      let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // exclusive upper bound
      switch (filters.dateRange) {
        case 'Last 7 days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          break;
        case 'Last 14 days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
          break;
        case 'Last 30 days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
          break;
        case 'Last 60 days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
          break;
        case 'This month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'Last month': {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDate = lastMonth;
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        }
        case 'This year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'Last year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }
      if (startDate) {
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.date);
          return txnDate >= startDate && txnDate < endDate;
        });
      }
    }

    // Sort
    if (filters.sortBy === 'Date (new to old)') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (filters.sortBy === 'Date (old to new)') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (filters.sortBy === 'Amount (high to low)') {
      filtered.sort((a, b) => {
        const amountA = Math.abs(parseFloat(a.amount));
        const amountB = Math.abs(parseFloat(b.amount));
        return amountB - amountA;
      });
    } else if (filters.sortBy === 'Amount (low to high)') {
      filtered.sort((a, b) => {
        const amountA = Math.abs(parseFloat(a.amount));
        const amountB = Math.abs(parseFloat(b.amount));
        return amountA - amountB;
      });
    }

    return filtered;
  }

  const filteredTransactions = applyFiltersToTransactions(
    allTransactions && Array.isArray(allTransactions) ? allTransactions.filter(txn =>
      txn.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [],
    filters
  );

  // Debug filtered transactions
  console.log('🔍 Filtered transactions debug:');
  console.log('📊 allTransactions length:', allTransactions?.length);
  console.log('📊 searchQuery:', searchQuery);
  console.log('📊 filteredTransactions length:', filteredTransactions?.length);
  console.log('📊 Sample filtered transaction:', filteredTransactions?.[0]);

  const isStale = () => {
    if (!lastRefresh) return true;
    const last = new Date(lastRefresh);
    return (Date.now() - last.getTime()) > 24 * 60 * 60 * 1000;
  };

  // Check if sync is needed (more than 24 hours since last sync)
  const needsSync = () => {
    if (!lastRefresh) return true;
    const last = new Date(lastRefresh);
    const hoursSinceLastSync = (Date.now() - last.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync > 24;
  };

  // Show sync reminder if needed
  useEffect(() => {
    if (needsSync() && !needsUpdate) {
      const hoursSinceLastSync = lastRefresh ? 
        ((Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)).toFixed(1) : 
        'unknown';
      
      Alert.alert(
        'Sync Reminder',
        `It's been ${hoursSinceLastSync} hours since your last sync. Would you like to sync your transactions now?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Sync Now', onPress: handleUpdate }
        ]
      );
    }
  }, [lastRefresh, needsUpdate]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      console.log('Account data:', account);
      
      // Use Plaid's recommended sync API instead of fetch_transactions
      console.log('🔄 Syncing transactions for account:', account.account_id);
      
      // Get the Plaid item ID from the account
      const plaidRes = await axios.get(`${apiConfig.baseURL}/api/plaid/items`);
      console.log('📦 Plaid items response:', plaidRes.data);
      console.log('📊 Response type:', typeof plaidRes.data);
      console.log('📊 Is array:', Array.isArray(plaidRes.data));
      
      // Check if the API call was successful
      if (!plaidRes.data) {
        console.error('❌ No response data from plaid items API');
        Alert.alert('Error', 'Failed to fetch Plaid items. Please try again.');
        setUpdating(false);
        return;
      }
      
      // Handle different response formats
      let plaidItems = [];
      if (plaidRes.data && plaidRes.data.success && Array.isArray(plaidRes.data.items)) {
        plaidItems = plaidRes.data.items;
      } else if (plaidRes.data && Array.isArray(plaidRes.data)) {
        plaidItems = plaidRes.data;
      } else if (plaidRes.data && plaidRes.data.success && Array.isArray(plaidRes.data.data)) {
        plaidItems = plaidRes.data.data;
      } else {
        console.error('❌ Unexpected plaid items response format:', plaidRes.data);
        Alert.alert('Error', 'Failed to fetch Plaid items. Please try again.');
        setUpdating(false);
        return;
      }
      
      console.log('✅ Processed plaid items:', plaidItems);
      
      const plaidItem = plaidItems.find(item => 
        item.accounts && item.accounts.some(acc => acc.account_id === account.account_id)
      );
      
      if (!plaidItem) {
        console.error('❌ No Plaid item found for account:', account.account_id);
        console.error('❌ Available plaid items:', plaidItems.map(item => ({
          item_id: item.item_id,
          institution_name: item.institution_name,
          accounts: item.accounts?.map(acc => acc.account_id) || []
        })));
        Alert.alert('Error', 'No Plaid item found for this account. Please try reconnecting your bank account.');
        setUpdating(false);
        return;
      }

      console.log('📦 Found Plaid item:', plaidItem.item_id);
      console.log('📦 Item status:', plaidItem.status);
      console.log('📦 Item needs_update:', plaidItem.needs_update);

      // Check if the item needs update (credentials expired)
      if (plaidItem.needs_update || plaidItem.status === 'ITEM_LOGIN_REQUIRED') {
        Alert.alert(
          'Credentials Expired', 
          'Your bank credentials have expired. You need to re-authenticate with your bank.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Re-authenticate', 
              onPress: async () => {
                try {
                  // Create link token for update mode
                  const res = await axios.post(`${apiConfig.baseURL}/api/plaid/create_link_token`, 
                    { update_mode: true, item_id: plaidItem.item_id }, 
                    { headers: { 'Content-Type': 'application/json' } }
                  );
                  
                  const linkToken = res.data.link_token;
                  if (!linkToken) throw new Error('No link token received');
                  
                  create({ token: linkToken, noLoadingState: false });
                  open({
                    onSuccess: async (result) => {
                      try {
                        await axios.post(`${apiConfig.baseURL}/api/plaid/exchange_public_token`, { public_token: result.publicToken });
                        await refreshAccounts();
                        Alert.alert('Success', 'Account updated successfully!');
                        setRefreshMessage("");
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update account. Please try again.');
                      } finally {
                        setUpdating(false);
                      }
                    },
                    onExit: (result) => {
                      if (result.error) {
                        Alert.alert('Error', result.error.displayMessage || 'Could not update account');
                      }
                      setUpdating(false);
                    },
                  });
                } catch (error) {
                  console.error('Error creating link token:', error);
                  Alert.alert('Error', 'Failed to create update link. Please try again.');
                  setUpdating(false);
                }
              }
            }
          ]
        );
        setUpdating(false);
        return;
      }

      // If credentials are still valid, use Plaid's sync API
      console.log('✅ Credentials are valid, syncing transactions...');
      
      const syncResponse = await axios.post(`${apiConfig.baseURL}/api/plaid/sync_transactions`);
      console.log('📦 Sync response:', syncResponse.data);
      
      if (syncResponse.data.success) {
        const { added, modified, removed } = syncResponse.data;
        let message = '';
        
        if (added > 0 || modified > 0 || removed > 0) {
          const changes = [];
          if (added > 0) changes.push(`${added} new`);
          if (modified > 0) changes.push(`${modified} updated`);
          if (removed > 0) changes.push(`${removed} removed`);
          message = `${changes.join(', ')} transaction${changes.length > 1 ? 's' : ''} synced`;
        } else {
          message = 'No new transactions found';
        }
        
        setRefreshMessage(message);
      } else {
        setRefreshMessage('Sync completed');
      }

      // Refresh account data
      await refreshAccounts();
      
      // Refetch transactions for this account
      const res = await axios.get(`${apiConfig.baseURL}/api/transactions?account_id=${account.account_id}`);
      let transactionsData = res.data;
      if (res.data && res.data.success && res.data.transactions) {
        transactionsData = res.data.transactions;
      }
      setAllTransactions(transactionsData);
      
      // Refetch last refresh time
      try {
        const lastRes = await axios.get(`${apiConfig.baseURL}/api/plaid/last_refresh`);
        console.log('📦 Last refresh response:', lastRes.data);
        // Don't call setLastRefresh since it's managed by the context
        // The context will update automatically when refreshAccounts() is called
      } catch (e) {
        console.error('Error fetching last refresh:', e);
      }

      // Reset needsUpdate state after successful sync
      setRefreshMessage("");

      Alert.alert('Success', 'Account synced successfully!');
      
    } catch (error) {
      console.error('❌ Error syncing account:', error);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.response?.data?.error === 'ITEM_LOGIN_REQUIRED' || 
          error.response?.data?.message?.includes('ITEM_LOGIN_REQUIRED')) {
        Alert.alert(
          'Credentials Expired', 
          'Your bank credentials have expired. You need to re-authenticate with your bank.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Re-authenticate', 
              onPress: () => {
                // This will trigger the re-authentication flow
                handleUpdate();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to sync account. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Menu logic
  const handleMenuPress = () => setMenuVisible(true);
  const handleMenuClose = () => setMenuVisible(false);
  const handleRefreshAll = async () => {
    setMenuVisible(false);
    setRefreshing(true);
    setRefreshMessage("");
    try {
      const response = await axios.post(`${apiConfig.baseURL}/api/plaid/fetch_transactions`);
      if (response.data.transactions_imported > 0) {
        setRefreshMessage(`${response.data.transactions_imported} new transactions imported`);
      } else {
        setRefreshMessage('No new transactions found');
      }
      // Refetch transactions
      const res = await axios.get(`${apiConfig.baseURL}/api/transactions?account_id=${account.account_id}`);
      setAllTransactions(res.data);
      // Refetch lastRefresh
      try {
        const lastRes = await axios.get(`${apiConfig.baseURL}/api/plaid/last_refresh`);
        console.log('📦 Last refresh response:', lastRes.data);
        // Don't call setLastRefresh since it's managed by the context
        // The context will update automatically when refreshAccounts() is called
      } catch {}
    } catch (e) {
      console.log('Full error response:', e.response);
      if (
        (e.response && e.response.data && e.response.data.error === 'ITEM_LOGIN_REQUIRED') ||
        (e.response && e.response.status === 500)
      ) {
        setNeedsUpdate(true);
        setRefreshMessage('Bank credentials need updating. Please use the update button.');
      } else {
        setRefreshMessage('Error refreshing transactions');
      }
    } finally {
      setRefreshing(false);
      // Auto-dismiss after 6 seconds
      setTimeout(() => setRefreshMessage(""), 6000);
    }
  };
  const handleViewInstitutionSettings = () => {
    setMenuVisible(false);
    // Placeholder: navigate to institution settings
  };

  // Placeholder for graph/chart
  const renderGraph = () => (
    <View style={styles.graphContainer}>
      <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#B0C4DE' }}>[Graph Placeholder]</Text>
      </View>
    </View>
  );

  // Placeholder for recent transactions
  const renderTransaction = (txn, idx) => (
    <View key={idx} style={styles.txnRow}>
      <Text style={styles.txnIcon}>{txn.category === 'Interac' ? '🔄' : '💳'}</Text>
      <Text style={styles.txnName}>{txn.details || txn.category || 'Tangerine'}</Text>
      <Text style={[styles.txnAmount, txn.transaction_type === 'Credit' ? styles.txnAmountCredit : styles.txnAmountDebit]}>
        {txn.transaction_type === 'Credit' ? '+' : '-'}${Math.abs(parseFloat(txn.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );

  // Calculate last update string
  let lastUpdateString = 'Never';
  if (lastRefresh) {
    const diffMs = Date.now() - new Date(lastRefresh);
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin === 0) {
      lastUpdateString = 'Just now';
    } else if (diffMin < 60) {
      lastUpdateString = `${diffMin} minutes ago`;
    } else {
      const diffHr = Math.floor(diffMin / 60);
      lastUpdateString = `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    }
  }

  // Add this function to handle filter apply
  const handleApplyFilters = () => {
    // console.log('Applying filters:', pendingFilters);
    // console.log('Current filters before update:', filters);
    setFilters(pendingFilters);
    // console.log('Filters updated to:', pendingFilters);
    setFilterModalVisible(false);
  };

  // Add this function to handle clear all
  const handleClearAllFilters = () => {
    setPendingFilters({
      dateRange: 'All time',
      sortBy: 'Date (new to old)',
      selectedAccounts: [account.account_id], // Reset to current account
      categories: [],
      merchants: [],
      amounts: [],
      tags: [],
    });
  };

  useEffect(() => {
    console.log('Full account object:', JSON.stringify(account, null, 2));
    console.log('account.needs_update:', account?.needs_update);
    if (account && account.needs_update) {
      setNeedsUpdate(true);
    } else {
      setNeedsUpdate(false);
    }
  }, [account]);

  // Add logging for initialAccount
  useEffect(() => {
    console.log('Initial account object:', JSON.stringify(initialAccount, null, 2));
  }, [initialAccount]);

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This will remove all associated transactions.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${apiConfig.baseURL}/api/accounts/${account.account_id}`);
              await refreshAccounts();
              Alert.alert('Success', 'Account deleted successfully', [
                { text: 'OK', onPress: () => handleGoBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Add delete button to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleDeleteAccount}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Find the latest account from context
  useEffect(() => {
    const updated = accounts.find(a => a.account_id === initialAccount.account_id);
    if (updated) {
      setAccount(updated);
    }
  }, [accounts, initialAccount.account_id]);

  // Centralized needsUpdate logic using plaidItems from context
  useEffect(() => {
    let plaidNeedsUpdate = false;
    const plaidItem = plaidItems.find(item =>
      item.accounts.some(acc => acc.account_id === account.account_id)
    );
    
    console.log('🔍 Centralized needsUpdate logic:');
    console.log('📦 plaidItems count:', plaidItems.length);
    console.log('📦 account.account_id:', account.account_id);
    console.log('📦 plaidItem:', plaidItem);
    console.log('📦 plaidItem.needs_update:', plaidItem?.needs_update);
    console.log('📦 plaidItem.status:', plaidItem?.status);
    console.log('📦 lastRefresh:', lastRefresh);
    console.log('📦 lastRefresh type:', typeof lastRefresh);
    
    if (plaidItem && (plaidItem.needs_update || plaidItem.status === 'ITEM_LOGIN_REQUIRED')) {
      plaidNeedsUpdate = true;
      console.log('⚠️ Setting plaidNeedsUpdate to true because:');
      if (plaidItem.needs_update) console.log('  - plaidItem.needs_update is true');
      if (plaidItem.status === 'ITEM_LOGIN_REQUIRED') console.log('  - plaidItem.status is ITEM_LOGIN_REQUIRED');
    }
    
    const stale = !lastRefresh || (Date.now() - new Date(lastRefresh).getTime()) > 24 * 60 * 60 * 1000;
    console.log('📦 lastRefresh exists:', !!lastRefresh);
    if (lastRefresh) {
      const hoursSinceRefresh = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60);
      console.log('📦 hours since last refresh:', hoursSinceRefresh);
      console.log('📦 is stale (>24 hours):', hoursSinceRefresh > 24);
    }
    console.log('📦 plaidNeedsUpdate:', plaidNeedsUpdate);
    console.log('📦 stale:', stale);
    console.log('📦 final needsUpdate:', stale || plaidNeedsUpdate);
    
    setNeedsUpdate(stale || plaidNeedsUpdate);
  }, [plaidItems, account, lastRefresh]);

  // Add debug log before return
  console.log('needsUpdate state:', needsUpdate);

  // Add navigation debugging
  console.log('🔍 Navigation debug:');
  console.log('📦 navigation object:', navigation);
  console.log('📦 route object:', route);

  // Handle back navigation properly
  const handleGoBack = () => {
    console.log('🔍 Attempting to go back...');
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // If we can't go back, navigate to the main screen
        navigation.navigate('Main');
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to main screen
      navigation.navigate('Main');
    }
  };

  // Handle hardware back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('🔍 Hardware back button pressed');
      handleGoBack();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, []);

  // Debug screen focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 AccountDetailScreen focused');
      console.log('📦 Current navigation state:', navigation.getState());
      return () => {
        console.log('🔍 AccountDetailScreen unfocused');
      };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Text style={styles.headerIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{account.name}</Text>
        <TouchableOpacity onPress={handleMenuPress} disabled={needsUpdate}>
          <Text style={[styles.headerIcon, needsUpdate && { color: '#ccc' }]}>⋯</Text>
        </TouchableOpacity>
      </View>
      {/* Update Notification Banner (now below header) */}
      {needsUpdate && (
        <View style={{ backgroundColor: '#FFEB3B', padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: '#222', fontWeight: 'bold', flex: 1 }}>
            {'Bank connection needs updating. Please sync to continue syncing transactions and balances.'}
          </Text>
          <TouchableOpacity style={[styles.updateBtnTop, { marginLeft: 8 }]} onPress={handleUpdate} disabled={updating}>
            <Text style={styles.updateBtnTextTop}>{updating ? 'Syncing...' : 'Sync'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Sync Reminder Banner */}
      {!needsUpdate && needsSync() && (
        <View style={{ backgroundColor: '#E3F2FD', padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: '#1976D2', fontWeight: 'bold', flex: 1 }}>
            {`It's been ${lastRefresh ? ((Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)).toFixed(1) : 'unknown'} hours since last sync.`}
          </Text>
          <TouchableOpacity style={[styles.updateBtnTop, { marginLeft: 8, backgroundColor: '#1976D2' }]} onPress={handleUpdate} disabled={updating}>
            <Text style={styles.updateBtnTextTop}>{updating ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <TouchableWithoutFeedback onPress={handleMenuClose}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={handleRefreshAll} disabled={needsUpdate}>
                  <Text style={[styles.menuItemText, needsUpdate && { color: '#ccc' }]}>Refresh all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleViewInstitutionSettings}>
                  <Text style={styles.menuItemText}>View institution settings</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Current Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
          <Text style={styles.balanceValue}>${parseFloat(account.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.balanceSubtext}>$0.00 (0%) 1 month</Text>
        </View>
        {/* Graph and Time Filters */}
        <View style={styles.graphBg}>
          {renderGraph()}
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
        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.txnList}>
          {(() => {
            console.log('🔍 Rendering recent transactions:');
            console.log('📊 allTransactions length:', allTransactions.length);
            console.log('📊 allTransactions slice:', allTransactions.slice(0, 4));
            console.log('📊 transactions state:', transactions);
            
            const recentTransactions = allTransactions.slice(0, 4);
            
            if (recentTransactions.length > 0) {
              return recentTransactions.map(renderTransaction);
            } else {
              return <Text style={{ color: '#aaa', margin: 16 }}>No recent transactions.</Text>;
            }
          })()}
        </View>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAllTransactionsModal(true)}>
          <Text style={styles.viewAllBtnText}>View all transactions</Text>
        </TouchableOpacity>
        {/* Summary Section */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}><Text style={styles.summaryIcon}>📦</Text><Text style={styles.summaryLabel}>Institution</Text><Text style={styles.summaryValue}>{account.bank || 'Tangerine - Personal'}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryIcon}>🏦</Text><Text style={styles.summaryLabel}>Account type</Text><Text style={styles.summaryValue}>{account.subtype || account.type}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryIcon}>💲</Text><Text style={styles.summaryLabel}>Total transactions</Text><Text style={styles.summaryValue}>{allTransactions.length}</Text></View>
        </View>
        {/* Refresh Notification Message (bottom, before connection status) */}
        {refreshMessage ? (
          <View style={{ backgroundColor: '#E3F2FD', padding: 10, alignItems: 'center', marginHorizontal: 16, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#1976D2', fontSize: 14 }}>{refreshMessage}</Text>
          </View>
        ) : null}
        {/* Connection Status Section */}
        <Text style={styles.sectionTitle}>Connection status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>⟳</Text>
          <Text style={styles.statusLabel2}>Last sync</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.statusValue2, isStale() && { color: '#FF3B30' }]}>{lastUpdateString}</Text>
            {isStale() && (
              <View style={styles.staleIndicator}>
                <AntDesign name="warning" size={14} color="#FF3B30" />
              </View>
            )}
          </View>
        </View>
        {lastRefresh && (
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>⏰</Text>
            <Text style={styles.statusLabel2}>Time since sync</Text>
            <Text style={[styles.statusValue2, needsSync() && { color: '#FF9800' }]}>
              {((Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)).toFixed(1)} hours
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Full Screen Transactions Modal */}
      <Modal
        visible={showAllTransactionsModal}
        animationType="slide"
        onRequestClose={() => setShowAllTransactionsModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#18181b' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#18181b' }}>
            <TouchableOpacity onPress={() => setShowAllTransactionsModal(false)}>
              <Text style={{ color: '#fff', fontSize: 24, marginRight: 8 }}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{account.name}</Text>
          </View>
          {/* Search and Filter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#23232a', margin: 8, borderRadius: 8, paddingHorizontal: 8 }}>
            <Ionicons name="search" size={20} color="#aaa" style={{ marginRight: 6 }} />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 8 }}
              placeholder="Search"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
              <Ionicons name="filter" size={22} color="#f59e42" />
              <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#f59e42', borderRadius: 8, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>1</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* Transactions List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            {filteredTransactions.length === 0 ? (
              <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 32, fontSize: 16 }}>
                No transactions found for the selected filter.
              </Text>
            ) : (
              filteredTransactions.map((txn, idx) => (
                <View key={txn.id || idx}>
                  <View style={{ backgroundColor: '#23232a', paddingVertical: 6, paddingHorizontal: 16 }}>
                    <Text style={{ color: '#ccc', fontWeight: 'bold', fontSize: 13 }}>
                      {new Date(txn.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#23232a', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#222' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{txn.category === 'Interac' ? '🔄' : txn.category === 'Jean Coutu' ? '💊' : '💳'}</Text>
                    <Text style={{ flex: 1, color: '#fff', fontSize: 15 }}>{txn.details || txn.category || 'Tangerine'}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: txn.transaction_type === 'Credit' ? '#1DB954' : '#fff' }}>
                      {txn.transaction_type === 'Credit' ? '+' : '-'}${Math.abs(parseFloat(txn.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          {/* Filter Modal (reusable) */}
          <FilterModal
            visible={filterModalVisible}
            filters={pendingFilters}
            setFilters={setPendingFilters}
            onApply={handleApplyFilters}
            onClear={handleClearAllFilters}
            accounts={allAccounts}
            onClose={() => setFilterModalVisible(false)}
            transactions={allTransactions}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: '#fff',
  },
  headerIcon: { fontSize: 24, marginHorizontal: 6 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 8 },
  updateBtnTop: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 8 },
  updateBtnTextTop: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  menuItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemText: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  balanceSection: { alignItems: 'flex-start', marginTop: 16, marginLeft: 16 },
  balanceLabel: { color: '#888', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  balanceValue: { fontSize: 32, fontWeight: 'bold', color: '#222' },
  balanceSubtext: { color: '#888', fontSize: 14, marginTop: 2 },
  graphBg: { backgroundColor: '#E3F4FF', borderRadius: 18, margin: 16, marginTop: 18, paddingBottom: 8 },
  graphContainer: { backgroundColor: '#fff', borderRadius: 18, margin: 8, paddingVertical: 12, alignItems: 'center', elevation: 2 },
  timeTabsBottomScrollContent: { paddingHorizontal: 16 },
  timeTab: { padding: 8, marginHorizontal: 4, borderRadius: 12 },
  timeTabSelected: { backgroundColor: '#EDEDED' },
  timeTabText: { fontSize: 14, color: '#888' },
  timeTabTextSelected: { color: '#222', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 24, marginLeft: 16, marginBottom: 8 },
  txnList: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  txnIcon: { fontSize: 22, marginRight: 10 },
  txnName: { flex: 1, fontSize: 15 },
  txnAmount: { fontSize: 15, fontWeight: 'bold' },
  txnAmountCredit: { color: '#1DB954' },
  txnAmountDebit: { color: '#222' },
  viewAllBtn: { backgroundColor: '#F3F3F3', borderRadius: 8, marginHorizontal: 16, marginTop: 4, marginBottom: 16, padding: 12, alignItems: 'center' },
  viewAllBtnText: { color: '#222', fontWeight: 'bold', fontSize: 15 },
  summaryBox: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  summaryIcon: { fontSize: 18, marginRight: 8 },
  summaryLabel: { flex: 1, color: '#888', fontSize: 14 },
  summaryValue: { fontWeight: 'bold', fontSize: 14, color: '#222' },
  statusBox: { backgroundColor: '#E3F7FF', borderRadius: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 8, padding: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { color: '#1976D2', fontSize: 14, flex: 1 },
  statusRow2: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8 },
  statusIcon: { fontSize: 18, marginRight: 8 },
  statusLabel2: { color: '#888', fontSize: 14, flex: 1 },
  statusValue2: { fontWeight: 'bold', fontSize: 14, color: '#222' },
  staleIndicator: {
    marginLeft: 8,
    backgroundColor: '#FFE5E5',
    padding: 4,
    borderRadius: 8,
  },
}); 