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
  const isStale = () => {
    if (!lastRefresh) return true;
    const last = new Date(lastRefresh);
    return (Date.now() - last.getTime()) > 24 * 60 * 60 * 1000;
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

  // Centralized needsUpdate logic using plaidItems from context
  const needsUpdate = React.useMemo(() => {
    let plaidNeedsUpdate = false;
    if (Array.isArray(plaidItems)) {
      plaidNeedsUpdate = plaidItems.some(item => item.needs_update || item.status === 'ITEM_LOGIN_REQUIRED');
    }
    return isStale() || plaidNeedsUpdate;
  }, [lastRefresh, plaidItems]);

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
    
    if (isStale()) {
      // needsUpdate is now derived from context
    }
    try {
      // Always refresh all accounts regardless of selected tab
      await refreshAccounts();
      setLastRefreshMessage('Accounts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      setLastRefreshMessage('Error refreshing accounts');
    } finally {
      setRefreshing(false);
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
            await refreshAccounts();
            console.log('✅ Accounts refreshed');
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
                        {(isStale() || needsUpdate) && (
                          <View style={styles.warningContainer}>
                            <AntDesign name="warning" size={16} color="#FF3B30" />
                            <Text style={styles.warningText}>Needs Update</Text>
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
                              
                              // Update the account's last_updated immediately in local state
                              const updatedAccounts = accounts.map(acc => 
                                acc.id === account.id 
                                  ? { ...acc, last_updated: new Date().toISOString() }
                                  : acc
                              );
                              setAccounts(updatedAccounts);
                              
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
                                // Refresh all accounts to show updated data
                                await refreshAccounts();
                              } else {
                                setLastRefreshMessage(`❌ Error: ${result.error}`);
                                // Revert the local state change if refresh failed
                                setAccounts(accounts);
                              }
                            } catch (error) {
                              console.error('❌ Error refreshing account:', error);
                              setLastRefreshMessage(`❌ Failed to refresh account: ${error.message}`);
                              // Revert the local state change if refresh failed
                              setAccounts(accounts);
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
});