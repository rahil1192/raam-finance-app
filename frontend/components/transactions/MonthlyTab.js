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

  // Prepare month list for bar/list view
  const monthList = useMemo(() => {
    return Object.entries(grouped)
      .map(([month, data]) => {
        let value = 0
        if (filter === "all") value = data.income - data.expenses
        else if (filter === "income") value = data.income
        else value = -data.expenses
        return { month, value, ...data }
      })
      .sort((a, b) => {
        // Sort by date descending
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
  const renderMonthBar = ({ item }) => (
    <TouchableOpacity
      style={styles.monthBar}
      onPress={() => handleMonthSelect(item.month, grouped[item.month])}
      activeOpacity={0.7}
    >
      <View style={styles.monthBarHeader}>
        <Text style={styles.monthBarTitle}>{item.month}</Text>
        <Text style={[styles.monthBarValue, item.value >= 0 ? styles.positive : styles.negative]}>
          {item.value >= 0 ? "+" : "-"}${Math.abs(item.value).toFixed(2)}
        </Text>
      </View>
      <View style={styles.monthBarLineContainer}>
        <View
          style={[
            styles.monthBarLine,
            {
              backgroundColor: item.value >= 0 ? "#22c55e" : "#f59e42",
              width: `${Math.min(Math.abs(item.value) / 1000, 1) * 100}%`,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={monthList}
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
  monthBarValue: {
    fontSize: 18,
    fontWeight: "700",
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
