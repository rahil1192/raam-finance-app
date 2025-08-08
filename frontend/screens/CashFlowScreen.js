import React, { useState } from "react"
import { View, StyleSheet } from "react-native"
import CashFlowPage from "../components/transactions/CashFlowPage"
import axios from "axios"
import { useFocusEffect } from "@react-navigation/native"
import { isTransferTransaction } from "../utils/transactions"
import { getApiUrl } from "../config/api"

const CashFlowScreen = ({ navigation, route }) => {
  const { selectedMonth: navSelectedMonth } = route.params || {}
  const [allTransactions, setAllTransactions] = useState([])
  const [monthsData, setMonthsData] = useState({})
  const [monthData, setMonthData] = useState({})
  const [selectedMonthState, setSelectedMonthState] = useState(null)
  const [ready, setReady] = useState(false)

  // Fetch latest transactions when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          setReady(false)
          const res = await axios.get(getApiUrl("/api/transactions"))
          console.log('CashFlowScreen API Response:', res.data);
          
          // Handle different response structures
          let txns = [];
          if (res.data && Array.isArray(res.data)) {
            // Direct array response
            txns = res.data;
          } else if (res.data && Array.isArray(res.data.transactions)) {
            // Nested transactions array
            txns = res.data.transactions;
          } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
            // Success wrapper with data array
            txns = res.data.data;
          } else {
            console.warn('CashFlowScreen: Unexpected API response structure:', res.data);
            txns = [];
          }
          
          setAllTransactions(txns)

          // Group by month, excluding transfers from income/expenses
          const grouped = {}
          txns.forEach((txn) => {
            if (!txn || !txn.date) return
            const date = new Date(txn.date)
            const month = date.toLocaleString("default", { month: "long" }) + " " + date.getFullYear()
            if (!grouped[month]) grouped[month] = { income: 0, expenses: 0, transactions: [] }
            if (!isTransferTransaction(txn)) {
              if (txn.transaction_type === "Credit") {
                grouped[month].income += Math.abs(Number.parseFloat(txn.amount))
              } else {
                grouped[month].expenses += Math.abs(Number.parseFloat(txn.amount))
              }
            }
            grouped[month].transactions.push(txn)
          })
          setMonthsData(grouped)
          // Determine which month to use
          let monthToUse;
          if (navSelectedMonth) {
            // Use the selected month from navigation, even if it has no transactions
            monthToUse = navSelectedMonth;
          } else {
            // Fallback to first month with transactions, or current month if no transactions
            monthToUse = Object.keys(grouped)[0] || new Date().toLocaleString("default", { month: "long" }) + " " + new Date().getFullYear();
          }
          setSelectedMonthState(monthToUse)
          setMonthData(grouped[monthToUse] || { income: 0, expenses: 0, transactions: [] })
          setReady(true)
        } catch (error) {
          console.error('Error fetching transactions for CashFlow:', error)
          setReady(true) // Set ready even on error to show empty state
        }
      }
      fetchData()
    }, [navSelectedMonth])
  )

  const handleBack = () => {
    navigation.goBack()
  }

  if (!ready || !selectedMonthState) {
    return <View style={styles.container} />
  }

  console.log('CashFlowScreen Debug:', {
    selectedMonthState,
    monthsDataKeys: Object.keys(monthsData),
    allTransactionsLength: allTransactions.length,
    monthData: monthsData[selectedMonthState]
  });

  return (
    <View style={styles.container}>
      <CashFlowPage
        selectedMonth={selectedMonthState}
        monthData={monthsData[selectedMonthState] || { income: 0, expenses: 0, transactions: [] }}
        onBack={handleBack}
        allTransactions={allTransactions}
        monthsData={monthsData}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
})

export default CashFlowScreen
