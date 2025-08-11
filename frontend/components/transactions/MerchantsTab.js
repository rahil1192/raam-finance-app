import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import axios from 'axios';
import { isTransferTransaction } from '../../utils/transactions'

export default function MerchantsTab({ transactions: propTransactions }) {
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [merchantData, setMerchantData] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantTransactions, setMerchantTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Format date for display
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (propTransactions) {
      processTransactions(propTransactions);
      setLoading(false);
    } else {
      fetchMerchantData();
    }
  }, [propTransactions, currentDate]);

  const processTransactions = (transactions) => {
    if (!transactions || !Array.isArray(transactions)) {
      setMerchantData([]);
      setTotalAmount(0);
      return;
    }
    
    // Filter by month
    const monthYear = currentDate.toISOString().slice(0, 7);
    let filtered = transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      const txnMonthYear = txnDate.toISOString().slice(0, 7);
      return txnMonthYear === monthYear;
    });
    // Group transactions by merchant
    const merchantMap = {};
    filtered.forEach(txn => {
      let merchant = txn.details || 'Other';
      if (merchant !== 'Other') {
        const words = merchant.split(' ');
        const nonNumericWords = words.filter(w => !/^[0-9]+$/.test(w));
        merchant = nonNumericWords.slice(0, 5).join(' ');
      }
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = {
          amount: 0,
          count: 0,
          transactions: [],
          icon: getMerchantIcon(merchant),
          iconBgColor: getMerchantColor(merchant)
        };
      }
      // Fix: Correct logic for transaction amounts
      // Credit (money IN) = Positive, Debit (money OUT) = Negative
      const amount = txn.transaction_type === 'Credit'
        ? Math.abs(parseFloat(txn.amount))
        : -Math.abs(parseFloat(txn.amount));
      merchantMap[merchant].amount += amount;
      merchantMap[merchant].count += 1;
      merchantMap[merchant].transactions.push(txn);
    });
    const total = Object.values(merchantMap).reduce((sum, m) => sum + m.amount, 0);
    setTotalAmount(total);
    const merchantArray = Object.entries(merchantMap).map(([name, data], index) => ({
      id: String(index + 1),
      name,
      icon: data.icon,
      iconBgColor: data.iconBgColor,
      amount: data.amount,
      percentage: (data.amount / total) * 100,
      count: data.count,
      transactions: data.transactions,
      indicatorColor: data.iconBgColor
    }));
    merchantArray.sort((a, b) => b.amount - a.amount);
    setMerchantData(merchantArray);
  };

  const fetchMerchantData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://raam-finance-app.onrender.com/api/transactions');
      let transactions = response.data;
      processTransactions(transactions);
    } catch (error) {
      console.error('Error fetching merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMerchantIcon = (merchant) => {
    const icons = {
      'Rogers': 'radio-outline',
      'Bell': 'phone-portrait-outline',
      'Amazon': 'cart-outline',
      'Walmart': 'storefront-outline',
      'Tim Hortons': 'cafe-outline',
      'Starbucks': 'cafe-outline',
      'Uber': 'car-outline',
      'Lyft': 'car-outline',
      'Netflix': 'film-outline',
      'Spotify': 'musical-notes-outline',
      'Other': 'storefront-outline'
    };
    return icons[merchant] || 'storefront-outline';
  };

  const getMerchantColor = (merchant) => {
    const colors = {
      'Rogers': '#dc2626',
      'Bell': '#0284c7',
      'Amazon': '#f59e0b',
      'Walmart': '#2563eb',
      'Tim Hortons': '#16a34a',
      'Starbucks': '#16a34a',
      'Uber': '#000000',
      'Lyft': '#f43f5e',
      'Netflix': '#dc2626',
      'Spotify': '#16a34a',
      'Other': '#9ca3af'
    };
    return colors[merchant] || '#9ca3af';
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

  const handleMerchantPress = (merchant) => {
    setSelectedMerchant(merchant);
    setMerchantTransactions(merchant.transactions);
    setShowModal(true);
  };

  const handleTransactionPress = (transaction) => {
    setShowModal(false);
    let screen = 'AddExpense';
    if (transaction.category === 'Income' || transaction.amount > 0) {
      screen = 'AddIncome';
    }
    navigation.navigate(screen, { transaction });
  };

  const renderTransactionItem = ({ item }) => (
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
        { color: item.transaction_type === 'Credit' ? '#22c55e' : '#f59e0b' }
      ]}>
        {item.transaction_type === 'Credit' ? '+' : '-'}${Math.abs(parseFloat(item.amount)).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const renderMerchantModal = () => {
    // Calculate modal total from merchantTransactions to ensure accuracy
    const modalTotal = merchantTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
    return (
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMerchant?.name} Transactions
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSummary}>
              <Text style={[styles.modalTotal, { color: modalTotal >= 0 ? '#22c55e' : '#f59e0b' }] }>
                Total: {modalTotal >= 0 ? '+' : '-'}${Math.abs(modalTotal).toFixed(2)}
              </Text>
              <Text style={styles.modalCount}>
                {merchantTransactions.length} transactions
              </Text>
            </View>

            <FlatList
              data={merchantTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={styles.transactionList}
              ListEmptyComponent={
                <Text style={styles.noTransactionsText}>
                  No transactions found for this merchant
                </Text>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  const renderHeader = () => (
    <>
      {/* Month Selection */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePreviousMonth}>
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{currentMonth} {currentYear}</Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Donut Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.donutChartContainer}>
          <Svg height="240" width="240" viewBox="0 0 100 100">
            {merchantData.map((merchant, index) => {
              const startAngle = (index / merchantData.length) * 360;
              const endAngle = ((index + 1) / merchantData.length) * 360;
              const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
              const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

              return (
                <Path
                  key={merchant.id}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={merchant.iconBgColor}
                />
              );
            })}
            {/* Inner circle */}
            <Circle
              cx="50"
              cy="50"
              r="30"
              stroke="#1e293b"
              strokeWidth="1"
              fill="#0f172a"
            />
          </Svg>
          <View style={styles.donutCenterText}>
            <Text style={styles.donutLabel}>Total</Text>
            <Text style={styles.donutAmount}>{totalAmount >= 0 ? '+' : '-'}${Math.abs(totalAmount).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderMerchantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.merchantItem}
      onPress={() => handleMerchantPress(item)}
    >
      <View style={[styles.merchantIcon, { backgroundColor: item.iconBgColor }]}>
        <Ionicons name={item.icon} size={24} color="white" />
      </View>
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantName}>{item.name}</Text>
        <Text style={styles.merchantPercentage}>{item.percentage.toFixed(1)}% • {item.count} transactions</Text>
      </View>
      <Text style={[styles.merchantAmount, { color: item.amount >= 0 ? '#22c55e' : '#f59e0b' }]}> 
        {item.amount >= 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
      </Text>
      <View style={styles.indicatorContainer}>
        <View 
          style={[
            styles.indicatorBar, 
            { backgroundColor: item.indicatorColor }
          ]} 
        />
      </View>
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
        data={merchantData}
        renderItem={renderMerchantItem}
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
      {renderMerchantModal()}
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80, // Add padding for FAB
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginHorizontal: 12,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginVertical: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
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
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,

  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  merchantPercentage: {
    fontSize: 14,
    color: '#94a3b8',
  },
  merchantAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 16,
  },
  indicatorContainer: {
    width: 80,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
  },
  indicatorBar: {
    height: 4,
    width: '100%',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
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
  noDataText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});