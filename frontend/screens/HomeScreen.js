"use client"

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { FontAwesome5 } from "@expo/vector-icons"
import { LineChart, BarChart } from "react-native-chart-kit"
import axios from "axios"

const { width } = Dimensions.get("window")
const TIME_RANGES = ["1M", "3M", "6M", "YTD", "1Y", "ALL"]

const TIME_RANGES_LABELS = [
  { key: "1M", label: "1 month" },
  { key: "3M", label: "3 months" },
  { key: "6M", label: "6 months" },
  { key: "YTD", label: "Year to date" },
  { key: "1Y", label: "1 year" },
  { key: "ALL", label: "All time" },
]

export default function HomeScreen({ navigation: propNavigation, route }) {
  const navigation = propNavigation
  const insets = useSafeAreaInsets()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("networth") // networth, assets, liabilities
  const [selectedRange, setSelectedRange] = useState("1M")
  const [loadingNetWorth, setLoadingNetWorth] = useState(false)
  const [netWorthData, setNetWorthData] = useState({
    total: 0,
    assets: 0,
    liabilities: 0,
    accounts: [],
    creditCards: [],
  })
  const [menuVisible, setMenuVisible] = useState(false)
  // Add a new state for the chart modal
  const [chartModalVisible, setChartModalVisible] = useState(false)

  // Add a test function to check backend connectivity
  const testBackendConnection = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      const response = await fetch('https://raam-finance-app.onrender.com/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      console.log('✅ Backend is accessible. Status:', response.status);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  };

  // Add useFocusEffect for data fetching
  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen focused - fetching fresh data')
      // Check if we need to refresh (either from route params or normal focus)
      const shouldRefresh = route.params?.refresh || true;
      
      if (shouldRefresh) {
        // Test backend connection first
        testBackendConnection().then(isAccessible => {
          if (isAccessible) {
            fetchTransactions()
            fetchNetWorthData()
          } else {
            console.log('⚠️ Backend not accessible, skipping data fetch');
          }
        });
      }

      // Clear the refresh parameter after using it
      if (route.params?.refresh) {
        navigation.setParams({ refresh: undefined });
      }

      // Optional: Add cleanup function
      return () => {
        console.log('HomeScreen unfocused')
      }
    }, [selectedRange, route.params?.refresh]) // Add route.params?.refresh to dependencies
  )

  const fetchTransactions = async () => {
    try {
      console.log('🔍 Fetching transactions from:', 'https://raam-finance-app.onrender.com/api/transactions');
      const response = await fetch('https://raam-finance-app.onrender.com/api/transactions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json()
      console.log('📦 Fetched transactions data:', data);
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setTransactions(data)
      } else if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
      } else {
        console.error('Invalid transactions data format:', data)
        setTransactions([])
      }
    } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      console.error("❌ Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchNetWorthData = async () => {
    try {
      console.log('🔍 Fetching net worth data from:', 'https://raam-finance-app.onrender.com/api/accounts');
      const response = await axios.get('https://raam-finance-app.onrender.com/api/accounts', {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('📡 Net worth response status:', response.status);
      console.log('📡 Net worth response headers:', response.headers);
      
      const accounts = response.data || []
      console.log('📦 Fetched accounts data:', accounts);

      // Ensure accounts is an array and add null checks
      if (!Array.isArray(accounts)) {
        console.warn('⚠️ Accounts data is not an array:', accounts);
        setNetWorthData({
          total: 0,
          assets: 0,
          liabilities: 0,
          accounts: [],
          creditCards: [],
        });
        return;
      }

      // Separate accounts and credit cards
      const depositoryAccounts = accounts.filter((acc) => acc && acc.type === "depository") || []
      const creditAccounts = accounts.filter((acc) => acc && acc.type === "credit") || []

      // Calculate totals
      const totalAssets = depositoryAccounts.reduce((sum, acc) => sum + (acc?.current_balance || 0), 0)
      const totalLiabilities = creditAccounts.reduce((sum, acc) => sum + (acc?.current_balance || 0), 0)
      const totalNetWorth = totalAssets - totalLiabilities

      setNetWorthData({
        total: totalNetWorth,
        assets: totalAssets,
        liabilities: totalLiabilities,
        accounts: depositoryAccounts.map((acc) => ({
          id: acc?.account_id,
          name: acc?.official_name || acc?.name || 'Unknown Account',
          balance: acc?.current_balance || 0,
          type: acc?.type,
          subtype: acc?.subtype,
        })),
        creditCards: creditAccounts.map((acc) => ({
          id: acc?.account_id,
          name: acc?.official_name || acc?.name || 'Unknown Account',
          balance: acc?.current_balance || 0,
          limit: acc?.limit || 0,
          type: acc?.type,
          subtype: acc?.subtype,
        })),
      })
    } catch (error) {
      console.error("❌ Error fetching net worth data:", error);
      console.error("❌ Error details:", {
        message: error.message,
        name: error.name,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      // Set default values when there's an error
      setNetWorthData({
        total: 0,
        assets: 0,
        liabilities: 0,
        accounts: [],
        creditCards: [],
      })
    }
  }

  // Helper to get start date for a range
  const getStartDate = (range) => {
    const now = new Date()
    switch (range) {
      case "1M":
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      case "3M":
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      case "6M":
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      case "1Y":
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    }
  }

  // Calculate net worth change and percent for the selected period
  let netWorthChange = 0
  let netWorthChangePercent = 0
  let netWorthChangePositive = true

  // Add this function to handle chart press
  const handleChartPress = () => {
    setChartModalVisible(true)
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case "networth":
        return (
          <View style={styles.tabContent}>
            <View style={styles.netWorthHeader}>
              <View style={styles.netWorthInfo}>
                <Text style={styles.netWorthValue}>
                  {netWorthData.total < 0 ? "-" : ""}${Math.abs(netWorthData.total).toLocaleString()}
                </Text>
                <View style={styles.changeRow}>
                  <Ionicons
                    name={netWorthChange === 0 ? "remove" : netWorthChange > 0 ? "arrow-up" : "arrow-down"}
                    size={14}
                    color={netWorthChange === 0 ? "#b0b0b0" : netWorthChange > 0 ? "#19e68c" : "#ef4444"}
                  />
                 
                </View>
              </View>
              <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#b0b0b0" />
              </TouchableOpacity>
            </View>

            {/* Modify the chart container in the networth tab case to make it clickable */}
           
          </View>
        )
      case "assets":
        return (
          <View style={styles.tabContent}>
            <View style={styles.netWorthHeader}>
              <View style={styles.netWorthInfo}>
                <Text style={styles.netWorthValue}>
                  ${netWorthData.assets.toLocaleString()}
                </Text>
                <Text style={styles.netWorthLabel}>Total Assets</Text>
              </View>
              <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#b0b0b0" />
              </TouchableOpacity>
            </View>

           
          </View>
        )
      case "liabilities":
        return (
          <View style={styles.tabContent}>
            <View style={styles.netWorthHeader}>
              <View style={styles.netWorthInfo}>
                <Text style={styles.netWorthValue}>
                  ${Math.abs(netWorthData.liabilities).toLocaleString()}
                </Text>
                <Text style={styles.netWorthLabel}>Total Liabilities</Text>
              </View>
              <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#b0b0b0" />
              </TouchableOpacity>
            </View>

            
          </View>
        )
      default:
        return null
    }
  }

  const renderNetWorthWidget = () => (
    <View style={styles.netWorthCard}>
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "networth" && styles.activeTab]}
          onPress={() => setSelectedTab("networth")}
        >
          <Text style={[styles.tabText, selectedTab === "networth" && styles.activeTabText]}>Net Worth</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "assets" && styles.activeTab]}
          onPress={() => setSelectedTab("assets")}
        >
          <Text style={[styles.tabText, selectedTab === "assets" && styles.activeTabText]}>Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "liabilities" && styles.activeTab]}
          onPress={() => setSelectedTab("liabilities")}
        >
          <Text style={[styles.tabText, selectedTab === "liabilities" && styles.activeTabText]}>Liabilities</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </View>
  )

  // Helper to get daily cumulative spending for a given month
  function getCumulativeSpending(transactions, year, month) {
    if (!transactions || !Array.isArray(transactions)) return Array(new Date(year, month + 1, 0).getDate()).fill(0);
    
    // Only include expenses (debits)
    const filtered = transactions.filter(t => {
      const date = new Date(t.date)
      return date.getFullYear() === year && date.getMonth() === month && t.transaction_type === 'Debit'
    })
    // Group by day
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let daily = Array(daysInMonth).fill(0)
    filtered.forEach(t => {
      const day = new Date(t.date).getDate() - 1
      daily[day] += Math.abs(t.amount)
    })
    // Cumulative sum
    let cum = []
    let sum = 0
    for (let i = 0; i < daysInMonth; i++) {
      sum += daily[i]
      cum.push(sum)
    }
    return cum
  }

  const SpendingWidget = ({ transactions, navigation }) => {
    if (!transactions || !Array.isArray(transactions)) {
      return (
        <View style={{backgroundColor: '#18191a', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4}}>
          <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 2}}>Spending</Text>
          <Text style={{color: '#b0b0b0', fontSize: 13}}>Loading...</Text>
        </View>
      );
    }
    
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

    const thisMonthData = getCumulativeSpending(transactions, thisYear, thisMonth)
    const lastMonthData = getCumulativeSpending(transactions, lastMonthYear, lastMonth)
    const days = Math.max(thisMonthData.length, lastMonthData.length)

    // Pad shorter array with last value
    const pad = (arr, len) => arr.concat(Array(len - arr.length).fill(arr[arr.length-1] || 0))
    const thisMonthPadded = pad(thisMonthData, days)
    const lastMonthPadded = pad(lastMonthData, days)

    const chartData = {
      labels: Array.from({length: days}, (_, i) => (i === 0 || i === days - 1 || (days > 7 && i % Math.ceil(days / 5) === 0)) ? `${i+1}` : ""),
      datasets: [
        {
          data: thisMonthPadded,
          color: () => '#fb5607',
          strokeWidth: 3,
        },
        {
          data: lastMonthPadded,
          color: () => '#b0b0b0',
          strokeWidth: 3,
        },
      ],
      legend: ['This month', 'Last month'],
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const selectedMonth = `${monthNames[thisMonth]} ${thisYear}`;
          const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          });
          const monthData = {
            income: monthTransactions.filter(t => t.transaction_type === "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
            expenses: monthTransactions.filter(t => t.transaction_type !== "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
            transactions: monthTransactions,
          };
          navigation && navigation.navigate('CashFlow', { selectedMonth, monthData, allTransactions: transactions });
        }}
        style={{backgroundColor: '#18191a', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4}}
      >
        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 2}}>Spending</Text>
        <Text style={{color: '#b0b0b0', fontSize: 13, marginBottom: 8}}>This month vs. last month</Text>
        <LineChart
          data={chartData}
          width={width - 72}
          height={180}
          yAxisLabel="$"
          yLabelsOffset={8}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={false}
          withShadow={false}
          chartConfig={{
            backgroundColor: '#18191a',
            backgroundGradientFrom: '#18191a',
            backgroundGradientTo: '#18191a',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            labelColor: () => '#b0b0b0',
            propsForBackgroundLines: { stroke: '#232323' },
            propsForLabels: { fontSize: 10 },
          }}
          bezier={false}
          style={{ borderRadius: 12, marginLeft: -8 }}
          segments={6}
        />
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
          <View style={{width: 16, height: 3, backgroundColor: '#fb5607', marginRight: 6, borderRadius: 2}} />
          <Text style={{color: '#fb5607', fontSize: 13, marginRight: 16}}>This month</Text>
          <View style={{width: 16, height: 3, backgroundColor: '#b0b0b0', marginRight: 6, borderRadius: 2}} />
          <Text style={{color: '#b0b0b0', fontSize: 13}}>Last month</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#0284c7" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search" placeholderTextColor="gray" />
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications" size={24} color="#0284c7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle" size={24} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>r</Text>
        </View>
        <View style={styles.greetingText}>
          <Text style={styles.greetingMessage}>Hi rahil shah, Good afternoon!</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Widget */}
        {renderNetWorthWidget()}
        {/* Spending Widget */}
        <SpendingWidget transactions={transactions} navigation={navigation} />

        {/* Recent Transactions Card */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.cardHeader}
            onPress={() => navigation.navigate('Transactions', { initialTab: 'DAILY' })}
          >
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </TouchableOpacity>
          <View style={styles.cardContent}>
            {loading ? (
              <Text>Loading...</Text>
            ) : transactions.length > 0 ? (
              transactions.slice(0, 5).map((transaction, index) => {
                return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.transactionRow}
                  onPress={() => navigation.navigate('AddExpense', {
                    transactionId: transaction.id,
                  })}
                >
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionCategory}>{transaction.app_category || transaction.category || 'Other'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.transaction_type === "Credit" ? styles.positiveAmount : styles.negativeAmount,
                    ]}
                  >
                    {transaction.transaction_type === "Credit" ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )})
            ) : (
              <Text>No recent transactions</Text>
            )}
          </View>
        </View>

        {/* Accounts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Accounts</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.bankIcon}>
              <MaterialCommunityIcons name="bank" size={40} color="#90CAF9" />
            </View>
            <Text style={styles.cardText}>Link your account to pull transactions</Text>
            <Text style={styles.cardText}>automatically.</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={16} color="#0284c7" />
              <Text style={styles.addButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Bills */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bills</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="receipt" size={32} color="#00B0FF" />
            </View>
            <Text style={styles.cardText}>Add recurring bills & subscriptions</Text>
            <Text style={styles.cardText}>to get payment reminders.</Text>
            <TouchableOpacity style={styles.textButton} onPress={() => navigation.navigate("Bills")}>
              <Text style={styles.textButtonLabel}>+ Add Bill</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Top Expenses */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Top Expenses</Text>
              <Text style={styles.cardSubtitle}>|| May</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={[styles.cardContent, styles.expenseContent]}>
            <View style={styles.donutChart}>
              {/* This is a simplified donut chart */}
              <View style={styles.donutChartInner} />
            </View>
            <View style={styles.expenseDetails}>
              <View style={styles.expenseCategory}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="document-text" size={16} color="gray" />
                </View>
                <Text style={styles.categoryText}>Bills & Utilities</Text>
              </View>
              <View style={styles.expenseAmount}>
                <Text style={styles.amountText}>$90</Text>
                <Ionicons name="chevron-forward" size={16} color="gray" />
              </View>
            </View>
          </View>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Budget */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Budget</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="dollar-sign" size={24} color="#00B0FF" />
            </View>
            <Text style={styles.cardText}>Tap to create your first budget.</Text>
            <TouchableOpacity style={styles.textButton} onPress={() => navigation.navigate("Budget")}>
              <Text style={styles.textButtonLabel}>+ Create Budget</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cash Flow */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cash Flow</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={styles.cashFlowContent}>
            <View style={styles.cashFlowRow}>
              <Text style={styles.periodText}>May</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.percentText}>0.0%</Text>
                <Text style={styles.positiveAmount}>+ $0</Text>
              </View>
            </View>
            <View style={styles.progressBar} />
            <View style={styles.cashFlowRow}>
              <Text style={styles.periodText}>Monthly</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.negativePercent}>↑ 100.0%</Text>
                <Text style={styles.negativeAmount}>- $90</Text>
              </View>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceText}>Projected Balance of</Text>
              <Text style={styles.negativeBalance}>- $90</Text>
            </View>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Goals</Text>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="target" size={32} color="#00B0FF" />
            </View>
            <Text style={styles.cardText}>Tap to create your first goal.</Text>
            <TouchableOpacity style={styles.textButton}>
              <Text style={styles.textButtonLabel}>+ Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: 40 }]}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      {/* Chart Detail Modal */}
      <Modal visible={chartModalVisible} transparent animationType="fade" onRequestClose={() => setChartModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.chartModalContainer}>
            <View style={styles.chartModalHeader}>
              <Text style={styles.chartModalTitle}>Net Worth History</Text>
              <TouchableOpacity onPress={() => setChartModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.chartModalContent}>
              {loadingNetWorth ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No net worth history data available</Text>
                </View>
              )}
            </View>
          </View>
          </View>
        </Modal>
      {/* Menu Modal (global, not inside any widget) */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.dropdownMenu}>
          {/* Category Management menu item */}
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('CategoryManagementScreen');
            }}
          >
            <Ionicons name="list" size={20} color="#0284c7" style={{ marginRight: 8 }} />
            <Text style={styles.dropdownItemText}>Category Management</Text>
          </TouchableOpacity>
          {/* Existing time range items */}
          {TIME_RANGES_LABELS.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedRange(range.key)
                setMenuVisible(false)
              }}
            >
              <Text style={[styles.dropdownItemText, selectedRange === range.key && styles.dropdownItemTextSelected]}>
                {range.label}
              </Text>
              {selectedRange === range.key && (
                <Ionicons name="checkmark" size={20} color="#19e68c" style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
          ))}
          
        </View>
      </Modal>
    </View>
  )

  function calculateLineAngle(prevValue, currentValue, min, max, range) {
    const prevHeightPercent = (prevValue - min) / range
    const currentHeightPercent = (currentValue - min) / range
    const prevY = 200 - prevHeightPercent * 200
    const currentY = 200 - currentHeightPercent * 200

    // Calculate angle in degrees
    const deltaY = currentY - prevY
    const deltaX = 60 // Width between points
    const angleRadians = Math.atan2(deltaY, deltaX)
    const angleDegrees = angleRadians * (180 / Math.PI)

    return angleDegrees
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0f2fe",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#e0f2fe",
    zIndex: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
  },
  iconButton: {
    marginLeft: 8,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#bae6fd",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  greetingText: {
    marginLeft: 12,
  },
  greetingMessage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  cardContent: {
    alignItems: "center",
    paddingVertical: 16,
  },
  bankIcon: {
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e1f5fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: "#0284c7",
    marginLeft: 4,
  },
  textButton: {
    marginTop: 16,
  },
  textButtonLabel: {
    color: "#0284c7",
    fontSize: 16,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: "#94a3b8",
  },
  expenseContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  donutChart: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 8,
    borderColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  donutChartInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
  },
  expenseDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseCategory: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryText: {
    fontSize: 16,
    color: "#334155",
  },
  expenseAmount: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
  cashFlowContent: {
    paddingVertical: 8,
  },
  cashFlowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  periodText: {
    fontSize: 16,
    color: "#334155",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentText: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 8,
  },
  positiveAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  negativePercent: {
    fontSize: 14,
    color: "#ef4444",
    marginRight: 8,
  },
  negativeAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#fbbf24",
    borderRadius: 4,
    marginVertical: 8,
  },
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  balanceText: {
    fontSize: 16,
    color: "#1e293b",
  },
  negativeBalance: {
    fontSize: 16,
    color: "#ef4444",
    marginLeft: 4,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  summaryLabel: {
    color: "#b0b0b0",
    fontSize: 16,
    fontWeight: "500",
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: "#1e293b",
  },
  transactionCategory: {
    fontSize: 14,
    color: "#64748b",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  // NET WORTH WIDGET STYLES
  netWorthCard: {
    backgroundColor: "#18191a",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  tabNavigation: {
    flexDirection: "row",
    backgroundColor: "#232323",
    paddingHorizontal: 4,
    paddingVertical: 4,
    margin: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#18191a",
  },
  tabText: {
    fontSize: 14,
    color: "#b0b0b0",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  netWorthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  netWorthInfo: {
    flex: 1,
  },
  netWorthValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  netWorthLabel: {
    color: "#b0b0b0",
    fontSize: 16,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  dateRange: {
    fontSize: 12,
    color: "#94a3b8",
  },
  menuButton: {
    padding: 4,
    borderRadius: 16,
  },
  chartContainer: {
    alignItems: "center",
    backgroundColor: "#18191a",
    borderRadius: 12,
    overflow: "hidden",
  },
  loadingContainer: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#b0b0b0",
    fontSize: 16,
  },
  noDataContainer: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: "#b0b0b0",
    fontSize: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginBottom: 16,
  },
  itemsList: {
    gap: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  itemName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  itemValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  dropdownMenu: {
    position: "absolute",
    top: 120,
    right: 24,
    backgroundColor: "#18191a",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minWidth: 180,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: "#19e68c",
    fontWeight: "bold",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    color: "#b0b0b0",
    fontSize: 16,
    fontStyle: "italic",
  },
  // Add to the styles object
  chartTouchable: {
    position: "relative",
    width: "100%",
  },
  chartOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  chartOverlayText: {
    color: "#ffffff",
    fontSize: 12,
    marginTop: 4,
  },
  chartModalContainer: {
    backgroundColor: "#18191a",
    borderRadius: 20,
    margin: 16,
    padding: 16,
    maxHeight: "90%",
  },
  chartModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartModalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  chartModalContent: {
    flex: 1,
  },
  chartLegend: {
    marginVertical: 16,
  },
  chartLegendTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  chartStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#232323",
    borderRadius: 12,
    padding: 12,
  },
  chartStatItem: {
    alignItems: "center",
  },
  chartStatLabel: {
    color: "#b0b0b0",
    fontSize: 12,
    marginBottom: 4,
  },
  chartStatValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  chartDataTable: {
    flex: 1,
    backgroundColor: "#232323",
    borderRadius: 12,
    marginTop: 16,
    maxHeight: 200,
  },
  chartDataHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  chartDataHeaderText: {
    color: "#b0b0b0",
    fontSize: 14,
    fontWeight: "bold",
  },
  chartDataList: {
    flex: 1,
  },
  chartDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  chartDataDate: {
    color: "#fff",
    fontSize: 14,
  },
  chartDataValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  scrollableChartContainer: {
    flexDirection: "row",
    height: 250,
    marginVertical: 16,
    backgroundColor: "#232323",
    borderRadius: 12,
    overflow: "hidden",
  },
  yAxisContainer: {
    width: 50,
    height: "100%",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: "#444",
    backgroundColor: "#232323",
  },
  yAxisLabelContainer: {
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  yAxisLabel: {
    color: "#b0b0b0",
    fontSize: 10,
  },
  chartScrollView: {
    flex: 1,
  },
  chartGrid: {
    height: 220,
    paddingTop: 10,
    position: "relative",
  },
  horizontalGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#444",
  },
  chartDataContainer: {
    flexDirection: "row",
    height: "100%",
    alignItems: "flex-end",
    paddingBottom: 30, // Space for x-axis labels
  },
  dataPointColumn: {
    width: 60,
    height: "100%",
    alignItems: "center",
    position: "relative",
  },
  verticalGridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#444",
  },
  dataPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00d4ff",
    zIndex: 10,
  },
  dataLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#00d4ff",
    zIndex: 5,
    transformOrigin: "left center",
  },
  xAxisLabel: {
    position: "absolute",
    bottom: -25,
    color: "#b0b0b0",
    fontSize: 10,
    width: 60,
    textAlign: "center",
  },
  // Add these new styles for the scrollable chart
  scrollableChartWrapper: {
    flexDirection: "row",
    height: 220,
    backgroundColor: "#232323",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
  },
  fixedYAxis: {
    width: 60,
    height: "100%",
    justifyContent: "space-between",
    paddingVertical: 20,
    backgroundColor: "#232323",
    borderRightWidth: 1,
    borderRightColor: "#444",
  },
  yAxisLabelWrapper: {
    height: 30,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  yAxisLabelText: {
    color: "#b0b0b0",
    fontSize: 10,
    fontWeight: "500",
  },
  scrollableChartArea: {
    flex: 1,
    height: "100%",
  },
  chartScrollContainer: {
    flex: 1,
  },
  extendedChartContainer: {
    height: "100%",
    justifyContent: "center",
  },
})
