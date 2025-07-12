import React, { useEffect, useState, useCallback } from 'react';
import { Button, View, Text, TouchableOpacity, FlatList, StyleSheet, Image, RefreshControl, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { create, open } from 'react-native-plaid-link-sdk';
import axios from 'axios';
import { AntDesign } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useAccounts } from '../context/AccountsContext';

const API_BASE_URL = 'http://192.168.2.19:8001/api';

const TABS = ['NET WORTH', 'CASH', 'CREDIT CARDS'];
const TIME_RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export default function App({ navigation }) {
  const { accounts, plaidItems, lastRefresh, refreshAccounts } = useAccounts();
  const [selectedTab, setSelectedTab] = useState('NET WORTH');
  const [selectedRange, setSelectedRange] = useState('1M');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshMessage, setLastRefreshMessage] = useState('');
  const [expandedBanks, setExpandedBanks] = useState({});
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [loadingNetWorth, setLoadingNetWorth] = useState(false);
  const [tabTotals, setTabTotals] = useState({ netWorth: 0, cash: 0, credit: 0 });
  const [menuVisible, setMenuVisible] = useState(false);

  // Calculate net worth: sum of account balances (positive for assets, negative for liabilities)
  const calculateNetWorth = (accounts) => {
    return accounts.reduce((sum, account) => {
      const balance = account.current_balance || 0;
      const subtype = (account.subtype || "").toLowerCase();
      
      if (subtype.includes('credit')) {
        // Credit accounts are liabilities, so subtract their balance
        return sum - balance;
      } else {
        // All other accounts are assets, so add their balance
        return sum + balance;
      }
    }, 0);
  };

  // Calculate cash (chequing + savings)
  const calculateCash = (accounts) => {
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
    return accounts.reduce((sum, account) => {
      const subtype = (account.subtype || '').toLowerCase();
      if (subtype.includes('credit')) {
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
    if (isStale()) {
      // needsUpdate is now derived from context
    }
    try {
      // Use the new sync endpoint
      const response = await axios.post(`${API_BASE_URL}/plaid/sync_transactions`);
      if (typeof response.data.added === 'number' || typeof response.data.modified === 'number' || typeof response.data.removed === 'number') {
        setLastRefreshMessage(`Added: ${response.data.added}, Modified: ${response.data.modified}, Removed: ${response.data.removed}`);
      } else if (response.data.transactions_imported > 0) {
        setLastRefreshMessage(`${response.data.transactions_imported} new transactions imported`);
      } else {
        setLastRefreshMessage('No new transactions found');
      }
      await refreshAccounts();
    } catch (error) {
      if (error.response?.data?.error === 'ITEM_LOGIN_REQUIRED') {
        setLastRefreshMessage('Bank credentials need updating. Please use the update button.');
      } else {
        setLastRefreshMessage('Error refreshing transactions');
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshAccounts, plaidItems, lastRefresh]);

  // Filter accounts for selected tab
  const getFilteredAccounts = () => {
    if (selectedTab === 'CASH') {
      return accounts.filter(account => {
        const subtype = (account.subtype || '').toLowerCase();
        return subtype.includes('chequing') || subtype.includes('checking') || subtype.includes('savings');
      });
    } else if (selectedTab === 'CREDIT CARDS') {
      return accounts.filter(account => {
        const subtype = (account.subtype || '').toLowerCase();
        return subtype.includes('credit');
      });
    }
    // NET WORTH: show all
    return accounts;
  };

  // Group filtered accounts by bank name
  const groupedAccounts = getFilteredAccounts().reduce((acc, account) => {
    const bank = account.official_name ? account.official_name.split(' ')[0] : 'Other';
    if (!acc[bank]) acc[bank] = [];
    acc[bank].push(account);
    return acc;
  }, {});

  // Calculate total for a bank using the same logic as net worth
  const getBankTotal = (accounts) => calculateNetWorth(accounts);

  // Toggle expand/collapse for a bank
  const toggleBank = (bank) => {
    setExpandedBanks(prev => ({ ...prev, [bank]: !prev[bank] }));
  };

  // Helper to get start date for a range
  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case '1M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '3M': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case '6M': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case 'YTD': return new Date(now.getFullYear(), 0, 1);
      case '1Y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'ALL': return null;
      default: return null;
    }
  };

  // Helper to get the backend type for the selected tab
  const getHistoryType = (tab) => {
    if (tab === 'NET WORTH') return 'networth';
    if (tab === 'CASH') return 'cash';
    if (tab === 'CREDIT CARDS') return 'credit';
    return 'networth';
  };

  // Fetch net worth history when selectedRange or selectedTab changes
  useEffect(() => {
    const fetchNetWorthHistory = async () => {
      setLoadingNetWorth(true);
      try {
        const now = new Date();
        const startDate = getStartDate(selectedRange);
        let url = `${API_BASE_URL}/networth/history?type=${getHistoryType(selectedTab)}`;
        if (startDate) {
          const startStr = startDate.toISOString().slice(0, 10);
          const endStr = now.toISOString().slice(0, 10);
          url += `&start=${startStr}&end=${endStr}`;
        }
        const res = await axios.get(url);
        setNetWorthHistory(res.data);
      } catch (e) {
        console.error('Error fetching net worth history:', e);
        setNetWorthHistory([]);
      } finally {
        setLoadingNetWorth(false);
      }
    };
    fetchNetWorthHistory();
  }, [selectedRange, selectedTab]);

  // Prepare chart data
  const chartData = {
    labels: netWorthHistory.length > 0 ? netWorthHistory.map((d, i) => {
      // Show only a few labels for clarity
      if (i === 0 || i === netWorthHistory.length - 1 || (netWorthHistory.length > 7 && i % Math.ceil(netWorthHistory.length / 5) === 0)) {
        return d.date.slice(5); // MM-DD
      }
      return '';
    }) : [],
    datasets: [
      {
        data: netWorthHistory.map(d => (typeof d.value === 'number' && !isNaN(d.value)) ? d.value : 0)
      }
    ]
  };

  // Handler for three-dot menu
  const handleMenuPress = () => setMenuVisible(true);
  const handleMenuClose = () => setMenuVisible(false);
  const handleRefreshAll = async () => {
    setMenuVisible(false);
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

  // Add Plaid Link handler for adding accounts
  const handlePlaidLink = async () => {
    try {
      setLastRefreshMessage('Connecting to bank...');
      // First fetch the link token
      const res = await axios.post(`${API_BASE_URL}/plaid/create_link_token`, {
        update_mode: false
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const token = res.data.link_token;
      if (!token) {
        setLastRefreshMessage('Error: Could not connect to bank');
        return;
      }
      create({ token, noLoadingState: false });
      open({
        onSuccess: async (result) => {
          setLastRefreshMessage('Successfully connected to bank');
          await axios.post(`${API_BASE_URL}/plaid/exchange_public_token`, {
            public_token: result.publicToken,
          });
          await refreshAccounts();
        },
        onExit: (result) => {
          if (result.error) {
            setLastRefreshMessage(`Error: ${result.error.displayMessage || 'Could not connect to bank'}`);
          }
        },
      });
    } catch (error) {
      let errorMessage = 'Error connecting to bank';
      if (error.response?.data?.detail) {
        errorMessage = `Error: ${error.response.data.detail}`;
      }
      setLastRefreshMessage(errorMessage);
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
        <TouchableWithoutFeedback onPress={handleMenuClose}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={handleRefreshAll}>
                  <Text style={styles.menuItemText}>Refresh all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleViewInstitutionSettings}>
                  <Text style={styles.menuItemText}>View institution settings</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Top Net Worth / Cash / Credit Cards Tabs with values */}
      <View style={styles.topTabsContainer}>
        {TABS.map(tab => (
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

      {/* Main Scrollable Content */}
      <FlatList
        data={[{ key: 'header' }, ...Object.entries(groupedAccounts)]}
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
                  ) : netWorthHistory.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.graphScrollContent}
                    >
                      <LineChart
                        data={chartData}
                        width={Math.max(Dimensions.get('window').width - 32, netWorthHistory.length * 50)}
                        height={220}
                        yAxisLabel="$"
                        chartConfig={{
                          backgroundColor: '#fff',
                          backgroundGradientFrom: '#fff',
                          backgroundGradientTo: '#fff',
                          decimalPlaces: 2,
                          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                          style: { borderRadius: 16 },
                          propsForDots: { r: '3', strokeWidth: '2', stroke: '#007AFF' }
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                      />
                    </ScrollView>
                  ) : (
                    <Text style={{ color: '#aaa', marginVertical: 16 }}>No data for this period.</Text>
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
});