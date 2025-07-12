import React, { useState } from "react"
import { View, StyleSheet } from "react-native"
import CashFlowPage from "../components/transactions/CashFlowPage"
import axios from "axios"
import { useFocusEffect } from "@react-navigation/native"
import { isTransferTransaction } from "../utils/transactions"

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
        setReady(false)
        const res = await axios.get("http://192.168.2.19:8001/api/transactions")
        const txns = res.data || []
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
        let monthToUse = navSelectedMonth && grouped[navSelectedMonth] ? navSelectedMonth : Object.keys(grouped)[0]
        setSelectedMonthState(monthToUse)
        setMonthData(grouped[monthToUse] || { income: 0, expenses: 0, transactions: [] })
        setReady(true)
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
