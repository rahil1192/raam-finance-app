"use client"

import { useState, useMemo } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { isTransferTransaction } from '../../utils/transactions'

const FILTERS = [
  { key: "all", label: "All" },
  { key: "expenses", label: "Expenses" },
  { key: "income", label: "Income" },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getMonthYear(dateStr) {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "Unknown"
  return `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`
}

const MonthlyTab = ({ transactions = [], summary = null }) => {
  const navigation = useNavigation()
  const [filter, setFilter] = useState("all")

  // Group transactions by month and filter, excluding transfers from income/expenses
  const grouped = useMemo(() => {
    const map = {}
    transactions.forEach((txn) => {
      if (!txn || !txn.date) return
      const month = getMonthYear(txn.date)
      if (!map[month]) {
        map[month] = { income: 0, expenses: 0, transactions: [] }
      }
      if (!isTransferTransaction(txn)) {
        if (txn.transaction_type === "Credit") {
          map[month].income += Math.abs(Number.parseFloat(txn.amount))
        } else {
          map[month].expenses += Math.abs(Number.parseFloat(txn.amount))
        }
      }
      map[month].transactions.push(txn)
    })
    return map
  }, [transactions])

  // Generate complete list of months from January 2025 to current month
  const generateMonthList = useMemo(() => {
    const months = []
    const startDate = new Date(2025, 0, 1) // January 2025
    const currentDate = new Date()
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) // First day of current month
    
    let currentMonth = new Date(startDate)
    
    while (currentMonth <= endDate) {
      const monthKey = currentMonth.toLocaleString("default", { month: "long" }) + " " + currentMonth.getFullYear()
      const monthData = grouped[monthKey] || { income: 0, expenses: 0, transactions: [] }
      
      let value = 0
      if (filter === "all") value = monthData.income - monthData.expenses
      else if (filter === "income") value = monthData.income
      else value = -monthData.expenses
      
      months.push({
        month: monthKey,
        value: value,
        ...monthData
      })
      
      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1)
    }
    
    // Sort by date descending (most recent first)
    return months.sort((a, b) => {
      const dA = new Date(a.month)
      const dB = new Date(b.month)
      return dB - dA
    })
  }, [grouped, filter])

  const handleMonthSelect = (month, monthData) => {
    navigation.navigate("CashFlow", {
      selectedMonth: month,
      monthData: monthData,
      allTransactions: transactions,
      monthsData: grouped,
    })
  }

  // Render filter tabs
  const renderFilters = () => (
    <View style={styles.filterTabs}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.filterTab, filter === f.key && styles.activeFilterTab]}
          onPress={() => setFilter(f.key)}
        >
          <Text style={[styles.filterTabText, filter === f.key && styles.activeFilterTabText]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  // Render month bar/list
  const renderMonthBar = ({ item }) => {
    const hasTransactions = item.transactions && item.transactions.length > 0;
    
    return (
      <TouchableOpacity
        style={[styles.monthBar, !hasTransactions && styles.monthBarEmpty]}
        onPress={() => handleMonthSelect(item.month, grouped[item.month] || { income: 0, expenses: 0, transactions: [] })}
        activeOpacity={0.7}
      >
        <View style={styles.monthBarHeader}>
          <Text style={[styles.monthBarTitle, !hasTransactions && styles.monthBarTitleEmpty]}>{item.month}</Text>
          <Text style={[
            styles.monthBarValue, 
            item.value >= 0 ? styles.positive : styles.negative,
            !hasTransactions && styles.monthBarValueEmpty
          ]}>
            {hasTransactions ? (
              `${item.value >= 0 ? "+" : "-"}$${Math.abs(item.value).toFixed(2)}`
            ) : (
              "No transactions"
            )}
          </Text>
        </View>
        <View style={styles.monthBarLineContainer}>
          <View
            style={[
              styles.monthBarLine,
              {
                backgroundColor: hasTransactions ? (item.value >= 0 ? "#22c55e" : "#f59e42") : "#64748b",
                width: hasTransactions ? `${Math.min(Math.abs(item.value) / 1000, 1) * 100}%` : "0%",
                opacity: hasTransactions ? 1 : 0.3,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={generateMonthList}
        renderItem={renderMonthBar}
        keyExtractor={(item) => item.month}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.noDataText}>No monthly data available.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  listContent: {
    padding: 16,
  },
  filterTabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 12,
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
  monthBar: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
  },
  monthBarEmpty: {
    backgroundColor: "#262626",
    opacity: 0.7,
  },
  monthBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monthBarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  monthBarTitleEmpty: {
    color: "#64748b",
  },
  monthBarValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthBarValueEmpty: {
    color: "#64748b",
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#f59e42",
  },
  monthBarLineContainer: {
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 4,
    overflow: "hidden",
  },
  monthBarLine: {
    height: 8,
    borderRadius: 4,
  },
  noDataText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 24,
  },
})

export default MonthlyTab
