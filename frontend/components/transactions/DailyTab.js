"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import React from "react"
import { isTransferTransaction } from '../../utils/transactions'
import { transactionService } from '../../services/api'

export default function DailyTab({ transactions: propTransactions }) {
  const navigation = useNavigation()
  const [activeFilter, setActiveFilter] = useState("All")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (propTransactions) {
      processTransactions(propTransactions)
      setLoading(false)
    } else {
      fetchTransactions()
    }
  }, [propTransactions])

  useFocusEffect(
    React.useCallback(() => {
      if (!propTransactions) fetchTransactions()
    }, [propTransactions])
  )

  const processTransactions = (txns) => {
    // Group transactions by date
    const groupedTransactions = txns.reduce((groups, transaction) => {
      if (!transaction || !transaction.date || !transaction.amount) return groups
      
      // Parse date properly to avoid timezone issues
      let parsedDate;
      if (typeof transaction.date === 'string') {
        // Handle date string format (e.g., "2025-08-28")
        if (transaction.date.includes('-')) {
          const [year, month, day] = transaction.date.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day, 12, 0, 0);
        } else {
          // Handle ISO string format (e.g., "2025-08-28T00:00:00.000Z")
          parsedDate = new Date(transaction.date);
        }
      } else {
        parsedDate = new Date(transaction.date);
      }
      
      const date = parsedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      
      if (!groups[date]) {
        groups[date] = {
          date,
          total: 0,
          transactions: [],
        }
      }
      const amount = transaction.transaction_type === "Debit" ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)
      const displayCategory = transaction.app_category || "Other"
      groups[date].transactions.push({
        id: transaction.id,
        name: transaction.details,
        icon: getTransactionIcon(displayCategory),
        iconBgColor: getCategoryColor(displayCategory),
        amount: amount,
        category: displayCategory,
        date: date,
        bank: transaction.bank,
        statementType: transaction.statement_type,
        fullDate: transaction.date,
        originalDate: transaction.date,
        notes: transaction.notes || "",
        transactionType: transaction.transaction_type,
        account_id: transaction.account_id,
      })
      groups[date].total += amount
      return groups
    }, {})
    const sortedTransactions = Object.values(groupedTransactions).sort((a, b) => new Date(b.date) - new Date(a.date))
    setTransactions(sortedTransactions)
    setError(null)
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await transactionService.getTransactions()
      if (!response || !Array.isArray(response)) {
        console.error("Invalid response format:", response)
        throw new Error("Invalid response format from server")
      }
      processTransactions(response)
    } catch (err) {
      console.error("Error details:", err)
      setError(err.message || "Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (category) => {
    const iconMap = {
      Transfers: "swap-horizontal-outline",
      Transfer: "swap-horizontal-outline",
      "Food & Dining": "restaurant-outline",
      "Restaurants & Bars": "wine-outline",
      "Coffee Shops": "cafe-outline",
      "Groceries": "basket-outline",
      Shopping: "cart-outline",
      Clothing: "shirt-outline",
      "Travel & Vacation": "airplane-outline",
      Gas: "car-sport-outline",
      "Entertainment & Recreation": "film-outline",
      Medical: "medkit-outline",
      Dentist: "medkit-outline",
      Fitness: "barbell-outline",
      Insurance: "shield-checkmark-outline",
      "Loan Repayment": "cash-outline",
      "Credit Card Payment": "card-outline",
      "Student Loans": "school-outline",
      "Business Income": "briefcase-outline",
      Paycheck: "cash-outline",
      Interest: "trending-up-outline",
      Charity: "heart-outline",
      Gifts: "gift-outline",
      Pets: "paw-outline",
      "Child Care": "happy-outline",
      Education: "school-outline",
      "Home Improvement": "home-outline",
      Rent: "home-outline",
      Mortgage: "home-outline",
      Water: "water-outline",
      "Gas & Electric": "flash-outline",
      "Internet & Cable": "wifi-outline",
      Phone: "call-outline",
      "Cash & ATM": "cash-outline",
      "Financial & Legal Services": "briefcase-outline",
      Other: "ellipsis-horizontal-outline",
      // Add more as needed
    }
    return iconMap[category] || iconMap.Other
  }

  const getCategoryColor = (category) => {
    const colorMap = {
      Transfers: "#8b5cf6",
      Transfer: "#8b5cf6",
      "Food & Dining": "#22c55e",
      "Restaurants & Bars": "#f59e0b",
      "Coffee Shops": "#b45309",
      "Groceries": "#84cc16",
      Shopping: "#f59e0b",
      Clothing: "#f472b6",
      "Travel & Vacation": "#14b8a6",
      Gas: "#fbbf24",
      "Entertainment & Recreation": "#ec4899",
      Medical: "#ef4444",
      Dentist: "#f87171",
      Fitness: "#10b981",
      Insurance: "#6366f1",
      "Loan Repayment": "#a855f7",
      "Credit Card Payment": "#eab308",
      "Student Loans": "#6366f1",
      "Business Income": "#06b6d4",
      Paycheck: "#22d3ee",
      Interest: "#0ea5e9",
      Charity: "#f43f5e",
      Gifts: "#a855f7",
      Pets: "#fbbf24",
      "Child Care": "#f472b6",
      Education: "#6366f1",
      "Home Improvement": "#f59e42",
      Rent: "#f59e42",
      Mortgage: "#f59e42",
      Water: "#38bdf8",
      "Gas & Electric": "#fde68a",
      "Internet & Cable": "#818cf8",
      Phone: "#818cf8",
      "Cash & ATM": "#fbbf24",
      "Financial & Legal Services": "#06b6d4",
      Other: "#64748b",
      // Add more as needed
    }
    return colorMap[category] || colorMap.Other
  }

  const handleTransactionPress = (transaction) => {
    let transactionType = "AddExpense"
    if (transaction.category === "Income" || transaction.amount > 0) {
      transactionType = "AddIncome"
    }
    // Only support AddExpense and AddIncome for now
    navigation.navigate(transactionType, {
      transaction,
    })
  }

  const filterTransactions = (data) => {
    if (activeFilter === "All") return data
    if (activeFilter === "Transfers") {
      console.log("Filtering for Transfers...");
      const result = data
        .map((group) => {
          if (!group.transactions || !Array.isArray(group.transactions)) {
            return { ...group, transactions: [], total: 0 };
          }
          const filteredTransactions = group.transactions.filter((transaction) => {
            const isTransfer = isTransferTransaction(transaction);
            if (isTransfer) {
              console.log("Found transfer:", transaction.details, transaction.category);
            }
            return isTransfer;
          });
          const newTotal = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
          return {
            ...group,
            transactions: filteredTransactions,
            total: newTotal,
          }
        })
        .filter((group) => group.transactions.length > 0)
      console.log("Transfer filter result:", result.length, "groups");
      return result;
    }
    return data
      .map((group) => {
        if (!group.transactions || !Array.isArray(group.transactions)) {
          return { ...group, transactions: [], total: 0 };
        }
        const filteredTransactions = group.transactions.filter((transaction) => {
          // Exclude transfers from expense and income calculations
          if (isTransferTransaction(transaction)) {
            return false
          }
          if (activeFilter === "Expenses") return transaction.amount < 0
          if (activeFilter === "Income") return transaction.amount > 0
          return true
        })
        const newTotal = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
        return {
          ...group,
          transactions: filteredTransactions,
          total: newTotal,
        }
      })
      .filter((group) => group.transactions.length > 0)
  }

  const renderTransactionItem = ({ item }) => {
    // Get first three words of the transaction name
    const shortName = item.name.split(" ").slice(0, 5).join(" ")

    // Determine color based on transaction type
    let amountColor = "white";
    let indicatorColor = "#f59e0b";
    
    if (isTransferTransaction(item)) {
      // Use purple for transfers
      amountColor = "#8b5cf6";
      indicatorColor = "#8b5cf6";
    } else if (item.amount > 0) {
      // Use green for income
      amountColor = "#22c55e";
      indicatorColor = "#22c55e";
    }

    return (
      <TouchableOpacity style={styles.transactionItem} onPress={() => handleTransactionPress(item)}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor }]}>
          <Ionicons name={item.icon} size={24} color="white" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionName}>{item.category}</Text>
          <Text style={styles.transactionMeta}>
            {item.bank}.{shortName}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: amountColor }]}>
          {item.amount > 0 ? "+" : "-"} ${Math.abs(item.amount).toFixed(2)}
        </Text>
        <View style={[styles.transactionIndicator, { backgroundColor: indicatorColor }]} />
      </TouchableOpacity>
    )
  }

  const renderDateGroup = ({ item }) => {
    // Determine color for date total based on transaction types
    let totalColor = "white";
    if (activeFilter === "Transfers") {
      totalColor = "#8b5cf6"; // Purple for transfers
    } else if (item.total > 0) {
      totalColor = "#22c55e"; // Green for income
    }

    return (
      <View style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={[styles.dateTotalAmount, { color: totalColor }]}>
            {item.total > 0 ? "+" : "-"} ${Math.abs(item.total).toFixed(2)}
          </Text>
        </View>
        <FlatList
          data={item.transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>
    )
  }

  const filteredData = filterTransactions(transactions)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterContainer}>
        {["All", "Expenses", "Income", "Transfers"].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, activeFilter === filter && styles.activeFilterButton]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredData}
        renderItem={renderDateGroup}
        keyExtractor={(item) => item.date}
        style={styles.transactionsList}
        refreshing={loading}
        onRefresh={fetchTransactions}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0f172a",
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginHorizontal: 2,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterButton: {
    backgroundColor: "#0c4a6e",
  },
  filterText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#0ea5e9",
  },
  transactionsList: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  dateTotalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 14,
    color: "#94a3b8",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginLeft: 8,
  },
  transactionIndicator: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: "#f59e0b",
  },
})
