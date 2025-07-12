import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { isTransferTransaction } from '../../utils/transactions'

// Category icons mapping
const CATEGORY_ICONS = {
  'Bills & Utilities': { icon: 'document-text-outline', color: '#0ea5e9' },
  'Food & Dining': { icon: 'restaurant-outline', color: '#22c55e' },
  'Restaurants & Bars': { icon: 'wine-outline', color: '#f59e0b' },
  'Coffee Shops': { icon: 'cafe-outline', color: '#b45309' },
  'Groceries': { icon: 'basket-outline', color: '#84cc16' },
  'Shopping': { icon: 'cart-outline', color: '#f59e0b' },
  'Clothing': { icon: 'shirt-outline', color: '#f472b6' },
  'Travel & Vacation': { icon: 'airplane-outline', color: '#14b8a6' },
  'Gas': { icon: 'car-sport-outline', color: '#fbbf24' },
  'Entertainment & Recreation': { icon: 'film-outline', color: '#ec4899' },
  'Medical': { icon: 'medkit-outline', color: '#ef4444' },
  'Dentist': { icon: 'medkit-outline', color: '#f87171' },
  'Fitness': { icon: 'barbell-outline', color: '#10b981' },
  'Insurance': { icon: 'shield-checkmark-outline', color: '#6366f1' },
  'Loan Repayment': { icon: 'cash-outline', color: '#a855f7' },
  'Credit Card Payment': { icon: 'card-outline', color: '#eab308' },
  'Student Loans': { icon: 'school-outline', color: '#6366f1' },
  'Business Income': { icon: 'briefcase-outline', color: '#06b6d4' },
  'Paycheck': { icon: 'cash-outline', color: '#22d3ee' },
  'Interest': { icon: 'trending-up-outline', color: '#0ea5e9' },
  'Charity': { icon: 'heart-outline', color: '#f43f5e' },
  'Gifts': { icon: 'gift-outline', color: '#a855f7' },
  'Pets': { icon: 'paw-outline', color: '#fbbf24' },
  'Child Care': { icon: 'happy-outline', color: '#f472b6' },
  'Education': { icon: 'school-outline', color: '#6366f1' },
  'Home Improvement': { icon: 'home-outline', color: '#f59e42' },
  'Rent': { icon: 'home-outline', color: '#f59e42' },
  'Mortgage': { icon: 'home-outline', color: '#f59e42' },
  'Water': { icon: 'water-outline', color: '#38bdf8' },
  'Gas & Electric': { icon: 'flash-outline', color: '#fde68a' },
  'Internet & Cable': { icon: 'wifi-outline', color: '#818cf8' },
  'Phone': { icon: 'call-outline', color: '#818cf8' },
  'Cash & ATM': { icon: 'cash-outline', color: '#fbbf24' },
  'Financial & Legal Services': { icon: 'briefcase-outline', color: '#06b6d4' },
  'Other': { icon: 'ellipsis-horizontal-outline', color: '#64748b' },
  'Transfers': { icon: 'swap-horizontal-outline', color: '#8b5cf6' },
  'Transfer': { icon: 'swap-horizontal-outline', color: '#8b5cf6' },
};

export default function CategoriesTab({ transactions: propTransactions, selectedFilter = 'Expenses', onSelectedFilterChange, currentDate, setCurrentDate }) {
  const navigation = useNavigation();
  const [includeBills, setIncludeBills] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Format date for display
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (propTransactions) {
      processTransactions(propTransactions);
      setLoading(false);
    } else {
      fetchCategoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTransactions, currentDate, selectedFilter, includeBills]);

  // Refresh data when screen comes back into focus (after editing transactions)
  useFocusEffect(
    React.useCallback(() => {
      fetchCategoryData();
    }, [currentDate, selectedFilter, includeBills])
  );

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      // Use the same direct axios call as DailyTab
      const response = await axios.get("http://192.168.2.19:8001/api/transactions");
      
      // Validate response data
      if (!response.data || !Array.isArray(response.data)) {
        console.error("Invalid response format:", response.data);
        throw new Error("Invalid response format from server");
      }
      
      let transactions = response.data;
      
      // Filter by month if needed (same logic as before)
      if (currentDate) {
        const monthYear = currentDate.toISOString().slice(0, 7); // Gets YYYY-MM format
        transactions = transactions.filter(txn => {
          const txnDate = new Date(txn.date);
          const txnMonthYear = txnDate.toISOString().slice(0, 7);
          return txnMonthYear === monthYear;
        });
      }
      
      if (!transactions || transactions.length === 0) {
        setCategoryData([]);
        setTotalAmount(0);
        setLoading(false);
        return;
      }
      
      // Filter transactions based on type and exclude transfers
      const filteredTransactions = transactions.filter(txn => {
        if (isTransferTransaction(txn)) return false;
        const isExpense = txn.transaction_type === 'Debit';
        const isIncome = txn.transaction_type === 'Credit';
        return (selectedFilter === 'Expenses' && isExpense) || (selectedFilter === 'Income' && isIncome);
      });

      if (filteredTransactions.length === 0) {
        setCategoryData([]);
        setTotalAmount(0);
        setLoading(false);
        return;
      }

      // Group transactions by app_category (not category)
      const categoryMap = {};
      filteredTransactions.forEach(txn => {
        const category = txn.app_category || 'Other';
        if (!categoryMap[category]) {
          categoryMap[category] = {
            amount: 0,
            count: 0,
            transactions: [] // Add array to store transactions
          };
        }
        categoryMap[category].amount += Math.abs(parseFloat(txn.amount));
        categoryMap[category].count += 1;
        categoryMap[category].transactions.push(txn); // Store the transaction
      });

      // Convert to array and calculate percentages
      const total = Object.values(categoryMap).reduce((sum, cat) => sum + cat.amount, 0);
      setTotalAmount(total);

      const categoryArray = Object.entries(categoryMap).map(([name, data], index) => ({
        id: String(index + 1),
        name,
        icon: CATEGORY_ICONS[name]?.icon || CATEGORY_ICONS['Other'].icon,
        iconBgColor: CATEGORY_ICONS[name]?.color || CATEGORY_ICONS['Other'].color,
        amount: selectedFilter === 'Expenses' ? -data.amount : data.amount,
        percentage: (data.amount / total) * 100,
        count: data.count,
        transactions: data.transactions // Include transactions in the category data
      }));

      // Sort by amount descending
      categoryArray.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      setCategoryData(categoryArray);
    } catch (error) {
      console.error('Error fetching category data:', error);
      setCategoryData([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (transactions) => {
    // Filter by month if needed (same logic as before)
    let filtered = transactions;
    if (currentDate) {
      const monthYear = currentDate.toISOString().slice(0, 7); // Gets YYYY-MM format
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.date);
        const txnMonthYear = txnDate.toISOString().slice(0, 7);
        return txnMonthYear === monthYear;
      });
    }
    if (!filtered || filtered.length === 0) {
      setCategoryData([]);
      setTotalAmount(0);
      return;
    }
    // Filter transactions based on type and exclude transfers
    let filteredTransactions = filtered.filter(txn => {
      if (isTransferTransaction(txn)) return false;
      const isExpense = txn.transaction_type === 'Debit';
      const isIncome = txn.transaction_type === 'Credit';
      return (selectedFilter === 'Expenses' && isExpense) || (selectedFilter === 'Income' && isIncome);
    });
    if (filteredTransactions.length === 0) {
      setCategoryData([]);
      setTotalAmount(0);
      return;
    }
    // Group transactions by app_category (not category)
    const categoryMap = {};
    filteredTransactions.forEach(txn => {
      const category = txn.app_category || 'Other';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          amount: 0,
          count: 0,
          transactions: []
        };
      }
      categoryMap[category].amount += Math.abs(parseFloat(txn.amount));
      categoryMap[category].count += 1;
      categoryMap[category].transactions.push(txn);
    });
    const total = Object.values(categoryMap).reduce((sum, cat) => sum + cat.amount, 0);
    setTotalAmount(total);
    const categoryArray = Object.entries(categoryMap).map(([name, data], index) => ({
      id: String(index + 1),
      name,
      icon: CATEGORY_ICONS[name]?.icon || CATEGORY_ICONS['Other'].icon,
      iconBgColor: CATEGORY_ICONS[name]?.color || CATEGORY_ICONS['Other'].color,
      amount: selectedFilter === 'Expenses' ? -data.amount : data.amount,
      percentage: (data.amount / total) * 100,
      count: data.count,
      transactions: data.transactions
    }));
    categoryArray.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    setCategoryData(categoryArray);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setCategoryTransactions(category.transactions || []);
    setShowModal(true);
  };

  const handleTransactionPress = (transaction) => {
    setShowModal(false); // Close the category modal
    
    // Determine which modal to open based on transaction type
    let modalName = "AddExpense"; // Default for expenses
    if (transaction.transaction_type === "Credit") {
      modalName = "AddIncome"; // Only for Credit transactions (income)
    }
    
    // Navigate to the appropriate modal with transaction details
    navigation.navigate(modalName, {
      transaction: {
        id: transaction.id,
        name: transaction.merchant || transaction.details,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        notes: transaction.notes || "",
        transaction_type: transaction.transaction_type,
        account_id: transaction.account_id,
        details: transaction.details,
        bank: transaction.bank,
        statement_type: transaction.statement_type,
        originalDate: transaction.date, // Pass original date for proper date handling
      }
    });
  };

  const renderTransactionItem = ({ item }) => {
    // Determine color based on transaction type
    let amountColor = "#f59e0b"; // Default for expenses (orange/amber)
    if (isTransferTransaction(item)) {
      amountColor = "#8b5cf6"; // Purple for transfers
    } else if (item.transaction_type === 'Credit') {
      amountColor = "#22c55e"; // Green for income
    }
    // For 'Debit' transactions, keep the default orange color

    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => handleTransactionPress(item)}
      >
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.merchant || item.details || 'No description'}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: amountColor }
        ]}>
          {item.transaction_type === 'Credit' ? '+' : '-'}${Math.abs(parseFloat(item.amount)).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCategoryModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCategory?.name} Transactions
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSummary}>
            <Text style={styles.modalTotal}>
              Total: {selectedCategory?.amount >= 0 ? '+' : '-'}${Math.abs(selectedCategory?.amount || 0).toFixed(2)}
            </Text>
            <Text style={styles.modalCount}>
              {categoryTransactions.length} transactions
            </Text>
          </View>

          <FlatList
            data={categoryTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.transactionList}
            ListEmptyComponent={
              <Text style={styles.noTransactionsText}>
                No transactions found for this category
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <>
      {/* Filters and Month Selection */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterToggle}>
          {['Expenses', 'Income'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.activeFilterButton
              ]}
              onPress={() => onSelectedFilterChange && onSelectedFilterChange(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.activeFilterText
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            onPress={handlePreviousMonth}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <View style={styles.monthTextContainer}>
            <Text style={styles.monthText}>{currentMonth} {currentYear}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleNextMonth}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Donut Chart - Only show if there are transactions */}
      {categoryData.length > 0 ? (
        <View style={styles.chartContainer}>
          <View style={styles.donutChartContainer}>
            <Svg height="240" width="240" viewBox="0 0 100 100">
              {/* Background circle */}
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke="#1e293b"
                strokeWidth="1"
                fill="transparent"
              />
              {/* Donut chart */}
              <Circle
                cx="50"
                cy="50"
                r="35"
                stroke="#0ea5e9"
                strokeWidth="20"
                fill="transparent"
              />
              {/* Inner circle */}
              <Circle
                cx="50"
                cy="50"
                r="25"
                stroke="#1e293b"
                strokeWidth="1"
                fill="#0f172a"
              />
            </Svg>
            <View style={styles.donutCenterText}>
              <Text style={styles.donutLabel}>{selectedFilter}</Text>
              <Text style={styles.donutAmount}>
                {selectedFilter === 'Expenses' ? '-' : '+'}${totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyStateText}>
            No {selectedFilter.toLowerCase()} found for {currentMonth} {currentYear}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Add transactions or import statements to see your spending breakdown
          </Text>
        </View>
      )}

      {/* Include Bills Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleInfo}>
          <Ionicons name="information-circle-outline" size={24} color="#94a3b8" />
          <Text style={styles.toggleLabel}>Include Bills</Text>
        </View>
        <Switch
          value={includeBills}
          onValueChange={setIncludeBills}
          trackColor={{ false: "#1e293b", true: "#0ea5e9" }}
          thumbColor="#ffffff"
        />
      </View>
    </>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.iconBgColor }]}>
        <Ionicons name={item.icon} size={24} color="white" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryPercentage}>
          {item.percentage.toFixed(1)}% • {item.count} transactions
        </Text>
      </View>
      <Text style={[
        styles.categoryAmount,
        { color: item.amount >= 0 ? '#22c55e' : '#f59e0b' }
      ]}>
        {item.amount >= 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={categoryData}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.noDataText}>
            No transactions found for {currentMonth} {currentYear}
          </Text>
        }
      />
      {renderCategoryModal()}
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80, // Add padding for FAB
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: '#0c4a6e',
  },
  filterText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  activeFilterText: {
    color: '#0ea5e9',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthArrow: {
    padding: 4,
  },
  monthTextContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  donutChartContainer: {
    position: 'relative',
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabel: {
    fontSize: 18,
    color: 'white',
    marginBottom: 4,
  },
  donutAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  categoryPercentage: {
    fontSize: 14,
    color: '#94a3b8',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  noDataText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  modalCount: {
    fontSize: 14,
    color: '#94a3b8',
  },
  transactionList: {
    paddingBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionDescription: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  noTransactionsText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginVertical: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});