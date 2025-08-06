"use client"

import { useState, useMemo, useEffect, useCallback, useReducer } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, FlatList, Modal, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LineChart } from "react-native-chart-kit"
import DateTimePicker from '@react-native-community/datetimepicker'
import { isTransferTransaction } from '../../utils/transactions'

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const FILTERS = [
  { key: "all", label: "All" },
  { key: "expenses", label: "Expenses" },
  { key: "income", label: "Income" },
]

const CashFlowPage = ({ selectedMonth: initialSelectedMonth, monthData: initialMonthData, onBack, allTransactions = [], monthsData = {} }) => {
  // Generate complete list of months from January 2025 to current month
  const generateCompleteMonthsData = () => {
    const completeMonthsData = { ...monthsData };
    const startDate = new Date(2025, 0, 1); // January 2025
    const currentDate = new Date();
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // First day of current month
    
    let currentMonth = new Date(startDate);
    
    while (currentMonth <= endDate) {
      const monthKey = currentMonth.toLocaleString("default", { month: "long" }) + " " + currentMonth.getFullYear();
      if (!completeMonthsData[monthKey]) {
        completeMonthsData[monthKey] = { income: 0, expenses: 0, transactions: [] };
      }
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return completeMonthsData;
  };

  // Fallback: if monthsData is empty or invalid, create a single-entry monthsData/monthsList for the current month
  let fallbackMonth = initialSelectedMonth
  let fallbackMonthData = initialMonthData
  let fallbackMonthsData = generateCompleteMonthsData()
  
  // Helper function to parse month and year
  const parseMonthYear = (monthYearStr) => {
    const [month, year] = monthYearStr.split(' ');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = monthNames.indexOf(month);
    return { monthIndex, year: parseInt(year) };
  };

  const monthsList = Object.keys(fallbackMonthsData)
    .sort((a, b) => {
      const dateA = parseMonthYear(a);
      const dateB = parseMonthYear(b);
      
      // Compare years first, then months
      if (dateA.year !== dateB.year) {
        return dateA.year - dateB.year;
      }
      return dateA.monthIndex - dateB.monthIndex;
    });
  let initialIndex = monthsList.findIndex(m => m === fallbackMonth)
  if (initialIndex === -1) initialIndex = monthsList.length - 1

  // Add safety checks for empty monthsList
  if (monthsList.length === 0) {
    console.warn('CashFlowPage: No months data available, showing empty state');
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#e2e8f0', fontSize: 16 }}>No transaction data available</Text>
      </View>
    );
  }

  // Ensure initialIndex is within bounds
  if (initialIndex < 0 || initialIndex >= monthsList.length) {
    console.warn('CashFlowPage: Invalid initialIndex, using 0');
    initialIndex = 0;
  }

  console.log('CashFlowPage Debug:', {
    initialSelectedMonth,
    monthsList,
    initialIndex,
    fallbackMonthsData: Object.keys(fallbackMonthsData)
  });

  // Define action types
  const ACTIONS = {
    SET_MONTH: 'SET_MONTH',
    SET_FILTER: 'SET_FILTER',
    SET_FILTER_PERIOD: 'SET_FILTER_PERIOD',
    SET_FILTER_TYPE: 'SET_FILTER_TYPE',
    SET_FILTER_DATE: 'SET_FILTER_DATE',
    SET_VIEW_MODE: 'SET_VIEW_MODE',
    SET_TRANSACTIONS_EXPANDED: 'SET_TRANSACTIONS_EXPANDED',
    SET_FILTER_MODAL_VISIBLE: 'SET_FILTER_MODAL_VISIBLE',
    SET_SHOW_DATE_PICKER: 'SET_SHOW_DATE_PICKER'
  };

  // Initial state
  const initialState = {
    monthIndex: initialIndex,
    selectedMonth: monthsList[initialIndex],
    monthData: fallbackMonthsData[monthsList[initialIndex]],
    filter: "all",
    filterType: 'Monthly',
    filterDate: new Date(),
    filterPeriod: null,
    viewMode: "chart",
    isTransactionsExpanded: false,
    filteredTransactions: [],
    filterModalVisible: false,
    showDatePicker: false,
    periodData: {
      income: fallbackMonthsData[monthsList[initialIndex]]?.income || 0,
      expenses: fallbackMonthsData[monthsList[initialIndex]]?.expenses || 0,
      transactions: fallbackMonthsData[monthsList[initialIndex]]?.transactions || [],
      balance: (fallbackMonthsData[monthsList[initialIndex]]?.income || 0) - (fallbackMonthsData[monthsList[initialIndex]]?.expenses || 0)
    }
  };

  // Reducer function
  const reducer = (state, action) => {
    switch (action.type) {
      case ACTIONS.SET_MONTH: {
        const newMonthData = fallbackMonthsData[monthsList[action.payload]];
        // Filter out transfers for periodData
        const nonTransferTxns = (newMonthData?.transactions || []).filter(t => !isTransferTransaction(t));
        const income = nonTransferTxns.filter(t => t.transaction_type === "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        const expenses = nonTransferTxns.filter(t => t.transaction_type !== "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        return {
          ...state,
          monthIndex: action.payload,
          selectedMonth: monthsList[action.payload],
          monthData: newMonthData,
          periodData: {
            income,
            expenses,
            transactions: nonTransferTxns,
            balance: income - expenses
          }
        };
      }
      case ACTIONS.SET_FILTER:
        return { ...state, filter: action.payload };
      case ACTIONS.SET_FILTER_TYPE:
        return { ...state, filterType: action.payload };
      case ACTIONS.SET_FILTER_DATE:
        return { ...state, filterDate: action.payload };
      case ACTIONS.SET_VIEW_MODE:
        return { ...state, viewMode: action.payload };
      case ACTIONS.SET_TRANSACTIONS_EXPANDED:
        return { ...state, isTransactionsExpanded: action.payload };
      case ACTIONS.SET_FILTER_PERIOD: {
        const { startDate, endDate } = action.payload;
        let periodTransactions = [];
        // Filter transactions based on period type
        switch (state.filterType) {
          case 'Weekly':
          case 'Bi-Weekly':
          case 'Custom': {
            if (!allTransactions || !Array.isArray(allTransactions)) {
              periodTransactions = [];
            } else {
              periodTransactions = allTransactions.filter(txn => {
                if (!txn || !txn.date) return false;
                const txnDate = new Date(txn.date);
                txnDate.setHours(0, 0, 0, 0);
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return txnDate >= start && txnDate <= end;
              });
            }
            break;
          }
          case 'Monthly': {
            const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            if (!allTransactions || !Array.isArray(allTransactions)) {
              periodTransactions = [];
            } else {
              periodTransactions = allTransactions.filter(txn => {
                if (!txn || !txn.date) return false;
                const txnDate = new Date(txn.date);
                txnDate.setHours(0, 0, 0, 0);
                const start = new Date(monthStart);
                start.setHours(0, 0, 0, 0);
                const end = new Date(monthEnd);
                end.setHours(23, 59, 59, 999);
                return txnDate >= start && txnDate <= end;
              });
            }
            break;
          }
        }
        // Filter out transfers
        const nonTransferTxns = (periodTransactions || []).filter(t => !isTransferTransaction(t));
        // Calculate period totals
        const periodIncome = (nonTransferTxns || [])
          .filter(t => t.transaction_type === "Credit")
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        const periodExpenses = (nonTransferTxns || [])
          .filter(t => t.transaction_type !== "Credit")
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        const periodBalance = periodIncome - periodExpenses;
        return {
          ...state,
          filterPeriod: action.payload,
          filteredTransactions: nonTransferTxns,
          periodData: {
            income: periodIncome,
            expenses: periodExpenses,
            transactions: nonTransferTxns,
            balance: periodBalance
          }
        };
      }
      case ACTIONS.SET_FILTER_MODAL_VISIBLE:
        return { ...state, filterModalVisible: action.payload };
      case ACTIONS.SET_SHOW_DATE_PICKER:
        return { ...state, showDatePicker: action.payload };
      default:
        return state;
    }
  };

  // Use reducer
  const [state, dispatch] = useReducer(reducer, initialState);

  // Memoize the filtered transactions
  const filteredTxns = useMemo(() => {
    // Always filter out transfers
    return (state.periodData.transactions || []).filter(txn => {
      if (isTransferTransaction(txn)) return false;
      if (state.filter === "all") return true;
      if (state.filter === "income") return txn.transaction_type === "Credit";
      if (state.filter === "expenses") return txn.transaction_type !== "Credit";
      return true;
    });
  }, [state.periodData.transactions, state.filter]);

  // Update handlers
  const handleMonthChange = (newIndex) => {
    console.log('CashFlowPage handleMonthChange:', {
      currentIndex: state.monthIndex,
      newIndex: newIndex,
      currentMonth: monthsList[state.monthIndex],
      newMonth: monthsList[newIndex],
      totalMonths: monthsList.length,
      monthsList: monthsList
    });
    dispatch({ type: ACTIONS.SET_MONTH, payload: newIndex });
  };

  const handleFilterChange = (newFilter) => {
    dispatch({ type: ACTIONS.SET_FILTER, payload: newFilter });
  };

  const handleFilterTypeChange = (newType) => {
    dispatch({ type: ACTIONS.SET_FILTER_TYPE, payload: newType });
  };

  const handleFilterDateChange = (newDate) => {
    dispatch({ type: ACTIONS.SET_FILTER_DATE, payload: newDate });
  };

  const handleViewModeChange = (newMode) => {
    dispatch({ type: ACTIONS.SET_VIEW_MODE, payload: newMode });
  };

  const handleTransactionsExpandedChange = (expanded) => {
    dispatch({ type: ACTIONS.SET_TRANSACTIONS_EXPANDED, payload: expanded });
  };

  const handleApplyFilter = () => {
    const startDate = new Date(state.filterDate);
    let endDate = new Date();

    switch (state.filterType) {
      case 'Weekly':
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Always 7 days from start
        break;
      case 'Bi-Weekly':
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 14);
        break;
      case 'Monthly':
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        break;
      case 'Custom':
        endDate = new Date(startDate);
        break;
    }

    dispatch({ 
      type: ACTIONS.SET_FILTER_PERIOD, 
      payload: { startDate, endDate } 
    });
    
    // Close the modal after applying the filter
    dispatch({ type: ACTIONS.SET_FILTER_MODAL_VISIBLE, payload: false });
  };

  const handleResetFilter = () => {
    dispatch({ type: ACTIONS.SET_FILTER_TYPE, payload: 'Monthly' });
    dispatch({ type: ACTIONS.SET_FILTER_DATE, payload: new Date() });
    dispatch({ type: ACTIONS.SET_FILTER_PERIOD, payload: null });
    handleMonthChange(state.monthIndex);
  };

  const handlePeriodNavigation = (direction) => {
    if (!state.filterPeriod || (state.filterType !== 'Weekly' && state.filterType !== 'Bi-Weekly')) return;
    
    const { startDate, endDate } = state.filterPeriod;
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    const increment = state.filterType === 'Weekly' ? 7 : 14;
    
    if (direction === 'next') {
      newStartDate.setDate(newStartDate.getDate() + increment);
      newEndDate.setDate(newEndDate.getDate() + increment);
    } else {
      newStartDate.setDate(newStartDate.getDate() - increment);
      newEndDate.setDate(newEndDate.getDate() - increment);
    }
    
    dispatch({ type: ACTIONS.SET_FILTER_DATE, payload: newStartDate });
    dispatch({
      type: ACTIONS.SET_FILTER_PERIOD,
      payload: { startDate: newStartDate, endDate: newEndDate }
    });
  };

  const monthName = state.selectedMonth ? state.selectedMonth.split(" ")[0] : "May"

  // Helper function to format date range
  const formatDateRange = (startDate, endDate) => {
    const formatDate = (date) => {
      return date.toLocaleDateString('en-GB', { 
        month: 'short',
        day: 'numeric'
      });
    };
    return `${formatDate(startDate)}-${formatDate(endDate)}`;
  };

  // Helper function to get filter period display
  const getFilterPeriodDisplay = () => {
    if (!state.filterPeriod) return null;
    const { startDate, endDate } = state.filterPeriod;
    
    if (state.filterType === 'Monthly') {
      return 'Monthly';
    }

    // Only show the date range for non-monthly filters
    return formatDateRange(startDate, endDate);
  };

  // Get current month data for chart
  const chartData = useMemo(() => {
    if (!state.filterPeriod || state.filterType === 'Monthly') {
      // Show all months but highlight selected month
      return {
        labels: monthsList.map(month => {
          const [monthName] = month.split(' ');
          return monthName.slice(0, 3); // "Jan", "Feb", etc.
        }),
        dataPoints: monthsList.map((month, idx) => {
          const data = fallbackMonthsData[month];
          if (!data) return 0;
          const nonTransferTxns = (data.transactions || []).filter(t => !isTransferTransaction(t));
          const income = (nonTransferTxns || [])
            .filter(t => t.transaction_type === "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const expenses = (nonTransferTxns || [])
            .filter(t => t.transaction_type !== "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          return income - expenses;
        }),
        selectedIndex: state.monthIndex
      };
    }

    const { startDate, endDate } = state.filterPeriod;
    const points = [];
    const labels = [];
    const weeksToShow = 8; // Show 8 weeks of data

    switch (state.filterType) {
      case 'Weekly': {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - (weeksToShow - 1) * 7); // Start 7 weeks before selected date
        
        for (let i = 0; i < weeksToShow; i++) {
          const weekStart = new Date(currentDate);
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(weekEnd.getDate() + 6); // End of week
          
          // Format label as "DD MMM"
          labels.push(weekStart.toLocaleDateString('en-GB', { 
            day: 'numeric',
            month: 'short'
          }));
          
          // Get transactions for this week
          const weekTransactions = allTransactions && Array.isArray(allTransactions) ? allTransactions.filter(txn => {
            if (!txn || !txn.date) return false;
            const txnDate = new Date(txn.date);
            txnDate.setHours(0, 0, 0, 0);
            const start = new Date(weekStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(weekEnd);
            end.setHours(23, 59, 59, 999);
            return txnDate >= start && txnDate <= end;
          }) : [];
          
          // Filter out transfers
          const nonTransferTxns = (weekTransactions || []).filter(t => !isTransferTransaction(t));
          // Calculate week's income and expenses
          const income = (nonTransferTxns || [])
            .filter(t => t.transaction_type === "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          const expenses = (nonTransferTxns || [])
            .filter(t => t.transaction_type !== "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          // Store the net balance for this week
          points.push(income - expenses);
          
          currentDate.setDate(currentDate.getDate() + 7); // Move to next week
        }
        break;
      }

      case 'Bi-Weekly': {
        // Show 8 bi-weekly periods (16 weeks)
        const periodsToShow = 8;
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - (periodsToShow - 1) * 14); // Go back 14 days per period

        for (let i = 0; i < periodsToShow; i++) {
          const periodStart = new Date(currentDate);
          const periodEnd = new Date(currentDate);
          periodEnd.setDate(periodEnd.getDate() + 13); // 14 days total

          // Label as "DD MMM"
          labels.push(periodStart.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
          }));
          
          // Get transactions for this bi-weekly period
          const periodTransactions = allTransactions && Array.isArray(allTransactions) ? allTransactions.filter(txn => {
            if (!txn || !txn.date) return false;
            const txnDate = new Date(txn.date);
            txnDate.setHours(0, 0, 0, 0);
            const start = new Date(periodStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(periodEnd);
            end.setHours(23, 59, 59, 999);
            return txnDate >= start && txnDate <= end;
          }) : [];
          
          // Filter out transfers
          const nonTransferTxns = (periodTransactions || []).filter(t => !isTransferTransaction(t));
          // Calculate income and expenses for this period
          const income = (nonTransferTxns || [])
            .filter(t => t.transaction_type === "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const expenses = (nonTransferTxns || [])
            .filter(t => t.transaction_type !== "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          points.push(income - expenses);

          currentDate.setDate(currentDate.getDate() + 14); // Move to next bi-weekly period
        }
        break;
      }

      case 'Custom': {
        // For custom, show daily points between start and end date
        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        for (let i = 0; i <= diffDays; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          labels.push(date.toLocaleDateString('en-GB', { day: 'numeric' }));
          
          const dayTransactions = allTransactions && Array.isArray(allTransactions) ? allTransactions.filter(txn => {
            if (!txn || !txn.date) return false;
            const txnDate = new Date(txn.date);
            // Set hours to 0 for proper date comparison
            txnDate.setHours(0, 0, 0, 0);
            const compareDate = new Date(date);
            compareDate.setHours(0, 0, 0, 0);
            return txnDate.getTime() === compareDate.getTime();
          }) : [];
          
          // Filter out transfers
          const nonTransferTxns = (dayTransactions || []).filter(t => !isTransferTransaction(t));
          // Calculate day's income and expenses
          const income = (nonTransferTxns || [])
            .filter(t => t.transaction_type === "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const expenses = (nonTransferTxns || [])
            .filter(t => t.transaction_type !== "Credit")
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          // Store the net balance for this day
          points.push(income - expenses);
        }
        break;
      }
    }

    return { 
      labels, 
      dataPoints: points, 
      selectedIndex: state.filterType === 'Weekly' ? weeksToShow - 1 : -1 // Highlight the selected week
    };
  }, [state.filterPeriod, state.filterType, allTransactions, monthsList, fallbackMonthsData, state.monthIndex]);

  // Update the actual values to use state.periodData
  const actualIncome = state.periodData.income;
  const actualExpenses = state.periodData.expenses;
  const actualBalance = state.periodData.balance;
  const maxAbsValue = Math.max(...chartData.dataPoints.map(Math.abs), 100);
  const barPercent = maxAbsValue ? Math.abs(actualBalance) / maxAbsValue : 0;

  // Calculate overall balance from the full month data, excluding transfers
  const monthData = fallbackMonthsData[monthsList[state.monthIndex]] || { income: 0, expenses: 0, transactions: [] };
  const nonTransferMonthTxns = (monthData.transactions || []).filter(t => !isTransferTransaction(t));
  const overallIncome = nonTransferMonthTxns.filter(t => t.transaction_type === "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const overallExpenses = nonTransferMonthTxns.filter(t => t.transaction_type !== "Credit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const overallBalance = overallIncome - overallExpenses;

  // Chart dimensions
  const chartHeight = 200;
  const baselineY = chartHeight / 2;

  // Render bar chart
  const renderBarChart = () => (
    <View style={{ marginHorizontal: 16, marginVertical: 16, padding: 16, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, marginBottom: 32, paddingHorizontal: 8 }}>
        {chartData.dataPoints.map((value, idx) => {
          const isPositive = value >= 0;
          const barHeight = Math.max((Math.abs(value) / maxAbsValue) * (chartHeight / 2 - 6), 4);
          const isSelected = idx === chartData.selectedIndex;
          return (
            <View key={idx} style={{ 
              flex: 1, 
              alignItems: 'center', 
              height: chartHeight, 
              justifyContent: 'flex-end', 
              position: 'relative',
              marginHorizontal: 4 // Add horizontal spacing between bars
            }}>
              {/* Baseline in the middle */}
              <View style={{ 
                position: 'absolute', 
                top: baselineY, 
                left: 0, 
                right: 0, 
                height: 2, 
                backgroundColor: '#334155', 
                zIndex: 1 
              }} />
              {/* Bar */}
              {isPositive ? (
                <View style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  bottom: baselineY, 
                  width: 16, // Slightly thinner bars
                  height: barHeight, 
                  backgroundColor: isSelected ? '#22c55e' : '#1e293b', 
                  borderTopLeftRadius: 4, 
                  borderTopRightRadius: 4, 
                  transform: [{ translateX: -8 }], // Half of bar width
                  zIndex: 2,
                  opacity: isSelected ? 1 : 0.5
                }} />
              ) : (
                <View style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: baselineY, 
                  width: 16, // Slightly thinner bars
                  height: barHeight, 
                  backgroundColor: isSelected ? '#f59e42' : '#1e293b', 
                  borderBottomLeftRadius: 4, 
                  borderBottomRightRadius: 4, 
                  transform: [{ translateX: -8 }], // Half of bar width
                  zIndex: 2,
                  opacity: isSelected ? 1 : 0.5
                }} />
              )}
              {/* Value label */}
              {isSelected && (
                isPositive ? (
                  <Text style={{ 
                    color: '#22c55e', 
                    fontSize: 10, // smaller font
                    minWidth: 36, // wider for 4 digits
                    maxWidth: 48,
                    textAlign: 'center',
                    lineHeight: 12, // tighter line height
                    position: 'absolute', 
                    left: '50%', 
                    bottom: baselineY + barHeight + 6, 
                    transform: [{ translateX: -18 }], // half of minWidth
                    zIndex: 3,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 2, // less padding
                    fontVariant: ['tabular-nums'], // monospace numbers if supported
                  }}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                  >
                    +${Math.abs(value).toFixed(0)}
                  </Text>
                ) : (
                  <Text style={{ 
                    color: '#f59e42', 
                    fontSize: 10, // smaller font
                    minWidth: 36, // wider for 4 digits
                    maxWidth: 48,
                    textAlign: 'center',
                    lineHeight: 12, // tighter line height
                    position: 'absolute', 
                    left: '50%', 
                    top: baselineY + barHeight + 8, 
                    transform: [{ translateX: -18 }], // half of minWidth
                    zIndex: 3,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 2, // less padding
                    fontVariant: ['tabular-nums'], // monospace numbers if supported
                  }}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                  >
                    -${Math.abs(value).toFixed(0)}
                  </Text>
                )
              )}
            </View>
          );
        })}
      </View>
      {/* Day labels */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 4,
        paddingHorizontal: 8 
      }}>
        {chartData.labels.map((label, idx) => (
          <Text key={idx} style={{ 
            color: idx === chartData.selectedIndex ? '#e2e8f0' : '#b0b0b0', 
            fontSize: 12, 
            textAlign: 'center', 
            flex: 1,
            fontWeight: idx === chartData.selectedIndex ? 'bold' : 'normal',
            marginHorizontal: 4 // Add horizontal spacing between labels
          }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );

  // Render filter tabs
  const renderFilters = () => (
    <View style={styles.filterTabs}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.filterTab, state.filter === f.key && styles.activeFilterTab]}
          onPress={() => handleFilterChange(f.key)}
        >
          <Text style={[styles.filterTabText, state.filter === f.key && styles.activeFilterTabText]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  // Render calendar
  const renderCalendar = () => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Create calendar grid
    const calendarDays = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day)
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>
            {new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}
          </Text>
        </View>

        {/* Days of week header */}
        <View style={styles.calendarWeekHeader}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <Text key={index} style={styles.calendarWeekDay}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.calendarDay, day === currentDate.getDate() && styles.calendarDayToday]}
              disabled={!day}
            >
              {day && (
                <>
                  <Text style={[styles.calendarDayText, day === currentDate.getDate() && styles.calendarDayTextToday]}>
                    {day}
                  </Text>
                  {/* Show transaction indicator for days with transactions */}
                  {state.filteredTransactions.some((txn) => {
                    const txnDate = new Date(txn.date)
                    return txnDate.getDate() === day && txnDate.getMonth() === month && txnDate.getFullYear() === year
                  }) && <View style={styles.transactionIndicator} />}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  // Render single transaction
  const renderTransaction = ({ item }) => {
    const transactionDate = new Date(item.date);
    const formattedDate = transactionDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDetails} numberOfLines={1}>
            {item.details}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            <Text style={styles.transactionDate}>{formattedDate}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            item.transaction_type === "Credit" ? styles.creditAmount : styles.debitAmount,
          ]}
        >
          {item.transaction_type === "Credit" ? "+" : "-"}${Math.abs(Number.parseFloat(item.amount)).toFixed(2)}
        </Text>
      </View>
    );
  };

  // Add modal handlers
  const handleOpenFilterModal = () => {
    dispatch({ type: ACTIONS.SET_FILTER_MODAL_VISIBLE, payload: true });
  };

  const handleCloseFilterModal = () => {
    dispatch({ type: ACTIONS.SET_FILTER_MODAL_VISIBLE, payload: false });
  };

  const handleDatePickerChange = (event, selectedDate) => {
    dispatch({ type: ACTIONS.SET_SHOW_DATE_PICKER, payload: false });
    if (selectedDate) {
      handleFilterDateChange(selectedDate);
    }
  };

  const handleOpenDatePicker = () => {
    dispatch({ type: ACTIONS.SET_SHOW_DATE_PICKER, payload: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Cash Flow</Text>
          <Text style={styles.headerSubtitle}>
            {state.filterPeriod ? getFilterPeriodDisplay() : monthName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => handleViewModeChange(state.viewMode === "chart" ? "calendar" : "chart")}
          >
            <Ionicons
              name={state.viewMode === "chart" ? "calendar-outline" : "bar-chart-outline"}
              size={24}
              color="#3b82f6"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleOpenFilterModal}>
            <Ionicons name="settings-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month/Week Navigation */}
      <View style={styles.monthNavigation}>
        {/* Left arrow (previous month) */}
        <TouchableOpacity 
          disabled={(state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') ? false : state.monthIndex <= 0} 
          onPress={() => {
            if (state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') {
              handlePeriodNavigation('prev');
            } else if (state.monthIndex > 0) {
              // Go to previous month (lower index since monthsList is sorted oldest first)
              handleMonthChange(state.monthIndex - 1);
            }
          }}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={(state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') ? "#e2e8f0" : (state.monthIndex <= 0 ? "#334155" : "#e2e8f0")} 
          />
        </TouchableOpacity>
        <View style={styles.monthInfo}>
          {state.filterType === 'Monthly' ? (
            <>
              <Text style={styles.monthTitle}>{monthName}</Text>
              <Text style={styles.monthSubtitle}>Monthly</Text>
            </>
          ) : (
            <Text style={[styles.monthTitle, { fontSize: 20 }]}>
              {state.filterPeriod ? getFilterPeriodDisplay() : 'Select Period'}
            </Text>
          )}
        </View>
        {/* Right arrow (next month) */}
        <TouchableOpacity 
          disabled={(state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') ? false : state.monthIndex >= monthsList.length - 1} 
          onPress={() => {
            if (state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') {
              handlePeriodNavigation('next');
            } else if (state.monthIndex < monthsList.length - 1) {
              // Go to next month (higher index since monthsList is sorted oldest first)
              handleMonthChange(state.monthIndex + 1);
            }
          }}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={(state.filterType === 'Weekly' || state.filterType === 'Bi-Weekly') ? "#e2e8f0" : (state.monthIndex >= monthsList.length - 1 ? "#334155" : "#e2e8f0")} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Chart or Calendar */}
        {state.viewMode === "chart" ? renderBarChart() : renderCalendar()}

        {/* Projected Button */}
        <TouchableOpacity style={styles.projectedButton}>
          <Text style={styles.projectedButtonText}>Projected</Text>
        </TouchableOpacity>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceMonth}>
              {(!state.filterPeriod || state.filterType === 'Monthly')
                ? monthName
                : getFilterPeriodDisplay()}
            </Text>
            <View style={styles.balanceHeaderRight}>
              {actualBalance >= 0 && (
                <>
                  <View style={styles.percentageTag}>
                    <Text style={styles.percentageText}>{((barPercent * 100).toFixed(1))}%</Text>
                  </View>
                  <Text style={styles.balancePositive}>
                    + ${Math.abs(actualBalance).toFixed(2)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Bar visualization: positive = up, negative = down */}
          <View style={styles.balanceBar}>
            {actualBalance >= 0 ? (
              <View style={{
                height: "100%",
                width: `${barPercent * 100}%`,
                backgroundColor: "#22c55e",
                borderRadius: 4,
              }} />
            ) : (
              <View style={{
                height: "100%",
                width: `${barPercent * 100}%`,
                backgroundColor: "#f59e42",
                borderRadius: 4,
                alignSelf: "flex-end",
              }} />
            )}
          </View>

          <View style={styles.balanceFooter}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={[styles.balanceNegative, actualBalance >= 0 ? styles.positive : styles.negative]}>
                {actualBalance >= 0 ? "+" : "-"} ${Math.abs(actualBalance).toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceRight}>
              {actualBalance < 0 && (
                <>
                  <View style={styles.percentageTagRed}>
                    <Ionicons name="trending-up" size={12} color="#f59e42" />
                    <Text style={styles.percentageTextRed}>{((barPercent * 100).toFixed(1))}%</Text>
                  </View>
                  <Text style={styles.balanceAmount}>
                    - ${Math.abs(actualBalance).toFixed(2)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Income/Expense Breakdown */}
        <View style={styles.breakdownCard}>
          {/* Total Income */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <View style={styles.breakdownIconContainer}>
                <View style={styles.incomeIcon}>
                  <Ionicons name="trending-up" size={18} color="#22c55e" />
                </View>
                <Text style={styles.breakdownTitle}>Total Income</Text>
              </View>
              <Text style={styles.incomeAmount}>+ ${Math.abs(actualIncome).toFixed(2)}</Text>
            </View>
          </View>

          {/* Total Expense */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <View style={styles.breakdownIconContainer}>
                <View style={styles.expenseIcon}>
                  <Ionicons name="trending-down" size={18} color="#ef4444" />
                </View>
                <Text style={styles.breakdownTitle}>Total Expense</Text>
              </View>
              <Text style={styles.expenseAmount}>- ${actualExpenses.toFixed(2)}</Text>
            </View>
          </View>

          {/* Balance Summary */}
          <View style={styles.balanceSummary}>
            <View style={styles.balanceSummaryItem}>
              <Text style={styles.balanceSummaryLabel}>Balance</Text>
              <Text style={[styles.balanceSummaryNegative, actualBalance >= 0 ? styles.positive : styles.negative]}>
                {actualBalance >= 0 ? "+" : "-"} ${Math.abs(actualBalance).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions Dropdown Section */}
          <View style={styles.transactionsSection}>
            <TouchableOpacity
              style={styles.transactionsHeader}
            onPress={() => handleTransactionsExpandedChange(!state.isTransactionsExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.transactionsHeaderLeft}>
                <Text style={styles.transactionsTitle}>Transactions</Text>
                <View style={styles.transactionsBadge}>
                  <Text style={styles.transactionsBadgeText}>{filteredTxns.length}</Text>
                </View>
              </View>
            <Ionicons name={state.isTransactionsExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
            </TouchableOpacity>

          {state.isTransactionsExpanded && (
              <View style={styles.transactionsContent}>
                {/* Filter Tabs inside transactions dropdown */}
                <View style={styles.transactionsFilterTabs}>
                  {FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f.key}
                    style={[styles.transactionsFilterTab, state.filter === f.key && styles.activeTransactionsFilterTab]}
                    onPress={() => handleFilterChange(f.key)}
                    >
                      <Text
                        style={[
                          styles.transactionsFilterTabText,
                        state.filter === f.key && styles.activeTransactionsFilterTabText,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

              {filteredTxns.length === 0 ? (
                <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 16 }}>
                  No transactions found for this period.
                </Text>
              ) : (
                <FlatList
                  data={filteredTxns}
                  renderItem={renderTransaction}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={styles.transactionsList}
                />
            )}
          </View>
        )}
        </View>
        {/* Add extra space at the end for cleaner UI */}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={state.filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseFilterModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseFilterModal} />
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Date Range</Text>
            <TouchableOpacity onPress={handleCloseFilterModal} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Date Range Type Buttons */}
            <View style={styles.dateRangeButtons}>
              {['Monthly', 'Weekly', 'Bi-Weekly', 'Custom'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.dateRangeButton,
                    state.filterType === type && styles.dateRangeButtonActive
                  ]}
                  onPress={() => handleFilterTypeChange(type)}
                >
                  <Text style={[
                    styles.dateRangeButtonText,
                    state.filterType === type && styles.dateRangeButtonTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Date Section */}
            <Text style={styles.startDateLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={handleOpenDatePicker}
            >
              <Text style={styles.datePickerText}>
                {state.filterDate.toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.dateHelpText}>
              {state.filterType === 'Monthly' && `Month will start from ${state.filterDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              })}`}
              {state.filterType === 'Weekly' && `Week will start from ${state.filterDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              })}`}
              {state.filterType === 'Bi-Weekly' && `Bi-weekly period will start from ${state.filterDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              })}`}
              {state.filterType === 'Custom' && `Custom period will start from ${state.filterDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              })}`}
            </Text>

            {state.showDatePicker && (
              <DateTimePicker
                value={state.filterDate}
                mode="date"
                display="default"
                onChange={handleDatePickerChange}
              />
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={handleResetFilter}
              >
                <Text style={styles.resetButtonText}>RESET</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={handleApplyFilter}
              >
                <Text style={styles.applyButtonText}>APPLY</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  headerAction: {
    padding: 4,
  },
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#000",
  },
  monthInfo: {
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  monthSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    marginHorizontal: 6,
  },
  activeFilterTab: {
    backgroundColor: "#0ea5e9",
  },
  filterTabText: {
    color: "#94a3b8",
    fontWeight: "500",
    fontSize: 15,
  },
  activeFilterTabText: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: "#0f172a",
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  chartValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartValueText: {
    color: "#e2e8f0",
    fontSize: 12,
    textAlign: "center",
    flex: 1,
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLabelText: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    flex: 1,
  },
  projectedButton: {
    backgroundColor: "#0c4a6e",
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  projectedButtonText: {
    color: "#e2e8f0",
    textAlign: "center",
    fontWeight: "500",
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceMonth: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  balanceHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentageTag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  percentageText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  balancePositive: {
    color: "#22c55e",
    fontWeight: "500",
  },
  balanceBar: {
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  balanceBarFill: {
    height: "100%",
    backgroundColor: "#f59e42",
    width: "100%",
    borderRadius: 4,
  },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceLabel: {
    color: "#94a3b8",
    marginRight: 8,
  },
  balanceNegative: {
    color: "#f59e42",
    fontWeight: "500",
  },
  balanceRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentageTagRed: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  percentageTextRed: {
    color: "#f59e42",
    fontSize: 12,
    marginLeft: 4,
  },
  balanceAmount: {
    color: "#e2e8f0",
    fontWeight: "500",
  },
  breakdownCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  breakdownIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  incomeIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#0c4a6e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#0c4a6e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  breakdownTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "500",
  },
  incomeAmount: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "500",
  },
  expenseAmount: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "500",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 44,
    marginBottom: 12,
  },
  breakdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  breakdownItemText: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  breakdownItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownItemAmount: {
    color: "#e2e8f0",
    fontSize: 14,
    marginRight: 8,
  },
  balanceSummary: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 16,
  },
  balanceSummaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceSummaryLabel: {
    color: "#e2e8f0",
    fontSize: 16,
  },
  balanceSummaryNegative: {
    color: "#f59e42",
    fontSize: 16,
    fontWeight: "500",
  },
  transactionsSection: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#1e293b",
  },
  transactionsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
    marginRight: 8,
  },
  transactionsBadge: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  transactionsBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  transactionsContent: {
    backgroundColor: "#0f172a",
  },
  transactionsList: {
    paddingBottom: 16,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionDetails: {
    fontSize: 16,
    color: "#e2e8f0",
    marginBottom: 4,
  },
  transactionMeta: {
    marginTop: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "500",
  },
  creditAmount: {
    color: "#22c55e",
  },
  debitAmount: {
    color: "#ef4444",
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#f59e42",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarContainer: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
  },
  calendarHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  calendarDayToday: {
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    color: "#e2e8f0",
    fontWeight: "500",
  },
  calendarDayTextToday: {
    color: "#fff",
    fontWeight: "600",
  },
  transactionIndicator: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f59e42",
  },
  transactionsFilterTabs: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  transactionsFilterTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    marginHorizontal: 4,
  },
  activeTransactionsFilterTab: {
    backgroundColor: "#0ea5e9",
  },
  transactionsFilterTabText: {
    color: "#94a3b8",
    fontWeight: "500",
    fontSize: 14,
  },
  activeTransactionsFilterTabText: {
    color: "#fff",
  },
  chartBarsContainer: {
    height: 140,
    marginBottom: 8,
  },
  chartPositiveArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
  },
  chartNegativeArea: {
    flexDirection: "row",
    alignItems: "flex-start",
    height: 60,
  },
  chartBaseline: {
    height: 2,
    backgroundColor: "#94a3b8",
    marginVertical: 1,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartBarPositive: {
    width: "80%",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  chartBarNegative: {
    width: "80%",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  chartBarBackground: {
    width: "80%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '20%',
    backgroundColor: '#374151',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  dateRangeButton: {
    backgroundColor: '#4b5563',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  dateRangeButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '500',
  },
  dateRangeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  startDateLabel: {
    color: '#d1d5db',
    fontSize: 18,
    marginBottom: 12,
    fontWeight: '500',
  },
  datePickerButton: {
    backgroundColor: '#4b5563',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerText: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '500',
  },
  dateHelpText: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#4b5563',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  applyButton: {
    backgroundColor: '#3b82f6',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
})

export default CashFlowPage