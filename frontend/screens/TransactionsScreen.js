import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CategoriesTab from '../components/transactions/CategoriesTab';
import MerchantsTab from '../components/transactions/MerchantsTab';
import MonthlyTab from '../components/transactions/MonthlyTab';
import DailyTab from '../components/transactions/DailyTab';
import RecurringTab from '../components/transactions/RecurringTab';
import TransactionFilterModal from '../components/TransactionFilterModal';
import { transactionService } from '../services/api';

const { width } = Dimensions.get('window');
const TABS = ['CATEGORIES', 'MERCHANTS', 'DAILY', 'MONTHLY', 'RECURRING'];

export default function TransactionsScreen({ route }) {
  const navigation = useNavigation();
  const initialTab = route.params?.initialTab || 'CATEGORIES';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeTabIndex, setActiveTabIndex] = useState(TABS.indexOf(initialTab));
  const horizontalScrollRef = useRef(null);
  const tabScrollRef = useRef(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({});
  const [filterModalTab, setFilterModalTab] = useState(null);
  const [categoriesCurrentDate, setCategoriesCurrentDate] = useState(new Date());
  
  useEffect(() => {
    loadData();
    // Scroll to the initial tab
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({ x: activeTabIndex * width, animated: false });
    }
  }, []);
  
  useFocusEffect(
    React.useCallback(() => {
      // Refresh data when screen is focused or refresh param is set
      const shouldRefresh = route.params?.refresh || true;
      if (shouldRefresh) {
        loadData();
      }
      // Clear the refresh parameter after using it
      if (route.params?.refresh) {
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh])
  );
  
  const handleAddTransaction = (type) => {
    let screen = 'AddExpense';
    if (type) {
      switch (type.toUpperCase()) {
        case 'INCOME':
          screen = 'AddIncome';
          break;
        case 'TRANSFER':
          screen = 'AddTransfer';
          break;
        case 'BILLS':
          screen = 'AddBill';
          break;
        case 'EXPENSE':
        default:
          screen = 'AddExpense';
      }
    }
    navigation.navigate(screen);
  };

  const handleTabPress = (tab, index) => {
    setActiveTab(tab);
    setActiveTabIndex(index);
    
    // Scroll to the selected tab content
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({ x: index * width, animated: true });
    }
    
    // Ensure the selected tab is visible in the tab bar
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollTo({ 
        x: index * 120 - width / 2 + 60, 
        animated: true 
      });
    }
  };

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / width);
    
    if (index !== activeTabIndex) {
      setActiveTabIndex(index);
      setActiveTab(TABS[index]);
      
      // Ensure the selected tab is visible in the tab bar
      if (tabScrollRef.current) {
        tabScrollRef.current.scrollTo({ 
          x: index * 120 - width / 2 + 60, 
          animated: true 
        });
      }
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [transactionsData, summaryData] = await Promise.all([
        transactionService.getTransactions(),
        transactionService.getSummary()
      ]);
      
      if (Array.isArray(transactionsData)) {
        setTransactions(transactionsData);
      } else if (transactionsData && Array.isArray(transactionsData.transactions)) {
        setTransactions(transactionsData.transactions);
      } else {
        console.error('Invalid transactions data format:', transactionsData);
        setTransactions([]);
      }
      
      if (summaryData) {
        setSummary(summaryData);
      } else {
        console.error('Summary data is missing or invalid:', summaryData);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        'Error',
        'Failed to load transactions. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  function applyFilters(transactions, filters) {
    if (!filters) return transactions;
    return transactions.filter(txn => {
      // Filter by type
      if (filters.selectedFilter && filters.selectedFilter !== 'All') {
        if (filters.selectedFilter === 'Expenses' && txn.transaction_type !== 'Debit') return false;
        if (filters.selectedFilter === 'Income' && txn.transaction_type !== 'Credit') return false;
        if (filters.selectedFilter === 'Transfer' && txn.transaction_type !== 'Transfer') return false;
      }
      // Category (multi-select, objects or strings, compare to app_category)
      if (
        filters.category &&
        Array.isArray(filters.category) &&
        filters.category.length > 0 &&
        !filters.category.some(cat =>
          ((typeof cat === 'object' ? cat.name : cat) || '').toLowerCase() === (txn.app_category || '').toLowerCase()
        )
      ) return false;
      // Account (multi-select, objects or strings)
      if (
        filters.account &&
        Array.isArray(filters.account) &&
        filters.account.length > 0 &&
        !filters.account.some(acc => (typeof acc === 'object' ? acc.account_id : acc) === txn.account_id)
      ) return false;
      // Date range
      if (filters.dateFrom) {
        const txnDate = new Date(txn.date);
        const fromDate = new Date(filters.dateFrom);
        if (txnDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const txnDate = new Date(txn.date);
        const toDate = new Date(filters.dateTo);
        if (txnDate > toDate) return false;
      }
      // Amount
      if (filters.amountMin && Math.abs(Number(txn.amount)) < Number(filters.amountMin)) return false;
      if (filters.amountMax && Math.abs(Number(txn.amount)) > Number(filters.amountMax)) return false;
      // Notes
      if (filters.notes && filters.notes.length > 0) {
        const notes = (txn.notes || '').toLowerCase();
        if (!notes.includes(filters.notes.toLowerCase())) return false;
      }
      return true;
    });
  }

  // Helper to get filtered transactions for a tab
  function getFilteredTransactions(tab) {
    return applyFilters(transactions, filters[tab]);
  }

  function countActiveFilters(filterObj) {
    if (!filterObj) return 0;
    let count = 0;
    if (filterObj.selectedFilter && filterObj.selectedFilter !== 'All') count++;
    if (filterObj.category && filterObj.category.length > 0) count++;
    if (filterObj.account && filterObj.account.length > 0) count++;
    if (filterObj.dateFrom) count++;
    if (filterObj.dateTo) count++;
    if (filterObj.amountMin) count++;
    if (filterObj.amountMax) count++;
    if (filterObj.notes && filterObj.notes.length > 0) count++;
    return count;
  }

  const activeFilterCount = countActiveFilters(filters[activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c4a6e" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu" size={24} color="#0ea5e9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="download-outline" size={24} color="#0ea5e9" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => { setFilterModalTab(activeTab); setShowFilterModal(true); }}>
            <Ionicons name="filter" size={24} color="#0ea5e9" />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('SearchTransactions', { transactions: getFilteredTransactions(activeTab) })}>
            <Ionicons name="search" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView 
          ref={tabScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
        >
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => handleTabPress(tab, index)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Horizontally Swipeable Tab Content */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.horizontalScroll}
      >
        {/* CATEGORIES Tab */}
        <View style={[styles.tabPage, { width }]}>
          {activeTab === 'CATEGORIES' && (
            <CategoriesTab 
              key={`categories-tab-${filters['CATEGORIES']?.selectedFilter || 'Expenses'}-${JSON.stringify(filters['CATEGORIES']?.category || [])}`}
              transactions={getFilteredTransactions('CATEGORIES')} 
              selectedFilter={filters['CATEGORIES']?.selectedFilter || 'Expenses'}
              onSelectedFilterChange={selected => setFilters(prev => ({
                ...prev,
                CATEGORIES: {
                  ...prev.CATEGORIES,
                  selectedFilter: selected
                }
              }))}
              currentDate={categoriesCurrentDate}
              setCurrentDate={setCategoriesCurrentDate}
            />
          )}
        </View>
        
        {/* MERCHANTS Tab */}
        <View style={[styles.tabPage, { width }]}>
          {activeTab === 'MERCHANTS' && <MerchantsTab transactions={getFilteredTransactions('MERCHANTS')} />}
        </View>
        
        {/* DAILY Tab */}
        <View style={[styles.tabPage, { width }]}>
          {activeTab === 'DAILY' && <DailyTab transactions={getFilteredTransactions('DAILY')} />}
        </View>
        
        {/* MONTHLY Tab */}
        <View style={[styles.tabPage, { width }]}>
          {activeTab === 'MONTHLY' && <MonthlyTab transactions={getFilteredTransactions('MONTHLY')} summary={summary} key={`monthly-${getFilteredTransactions('MONTHLY').length}-${summary ? 'with-summary' : 'no-summary'}`} />}
        </View>
        
        {/* RECURRING Tab */}
        <View style={[styles.tabPage, { width }]}>
          {activeTab === 'RECURRING' && <RecurringTab transactions={getFilteredTransactions('RECURRING')} />}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => handleAddTransaction()}
          onLongPress={() => {
            // Show a menu to select transaction type
            // This is just a placeholder - you might want to implement a proper menu
            Alert.alert(
              "Add Transaction",
              "Select transaction type",
              [
                { text: "Expense", onPress: () => handleAddTransaction('Expense') },
                { text: "Income", onPress: () => handleAddTransaction('Income') },
                { text: "Transfer", onPress: () => handleAddTransaction('Transfer') },
                { text: "Cancel", style: "cancel" }
              ]
            );
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <TransactionFilterModal
        key={`filter-modal-${filterModalTab}-${JSON.stringify(filters[filterModalTab])}`}
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={() => setShowFilterModal(false)}
        onClear={() => {
          setFilters(prev => ({ ...prev, [filterModalTab]: {
            selectedFilter: 'Expenses',
            category: [],
            account: [],
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: '',
            notes: ''
          }}));
          setShowFilterModal(false);
        }}
        selectedFilter={filters[filterModalTab]?.selectedFilter || 'Expenses'}
        onSelectedFilterChange={val => setFilters(prev => ({
          ...prev,
          [filterModalTab]: {
            ...prev[filterModalTab],
            selectedFilter: val
          }
        }))}
        category={filters[filterModalTab]?.category || []}
        onCategoryChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], category: val } }))}
        account={filters[filterModalTab]?.account || []}
        onAccountChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], account: val } }))}
        dateFrom={filters[filterModalTab]?.dateFrom || ''}
        onDateFromChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], dateFrom: val } }))}
        dateTo={filters[filterModalTab]?.dateTo || ''}
        onDateToChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], dateTo: val } }))}
        amountMin={filters[filterModalTab]?.amountMin || ''}
        onAmountMinChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], amountMin: val } }))}
        amountMax={filters[filterModalTab]?.amountMax || ''}
        onAmountMaxChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], amountMax: val } }))}
        notes={filters[filterModalTab]?.notes || ''}
        onNotesChange={val => setFilters(prev => ({ ...prev, [filterModalTab]: { ...prev[filterModalTab], notes: val } }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0c4a6e',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
  tabContainer: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 120, // Ensure tabs have a minimum width
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0ea5e9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#0ea5e9',
  },
  horizontalScroll: {
    flex: 1,
  },
  tabPage: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f87171',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 10,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});