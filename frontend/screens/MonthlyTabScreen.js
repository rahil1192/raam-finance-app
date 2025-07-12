import { View, StyleSheet } from "react-native"
import MonthlyTab from "../components/transactions/MonthlyTab"

// Sample data - you can replace this with your actual data source
const transactions = [
  {
    id: "1",
    details: "Grocery Shopping",
    category: "Food",
    amount: 68,
    transaction_type: "Debit",
    date: "2023-05-15",
  },
  {
    id: "2",
    details: "Salary",
    category: "Income",
    amount: 2500,
    transaction_type: "Credit",
    date: "2023-04-30",
  },
  {
    id: "3",
    details: "Restaurant",
    category: "Food",
    amount: 45,
    transaction_type: "Debit",
    date: "2023-04-20",
  },
  {
    id: "4",
    details: "Freelance Work",
    category: "Income",
    amount: 350,
    transaction_type: "Credit",
    date: "2023-03-15",
  },
  {
    id: "5",
    details: "Utilities",
    category: "Bills",
    amount: 120,
    transaction_type: "Debit",
    date: "2023-03-10",
  },
  {
    id: "6",
    details: "Coffee Shop",
    category: "Food",
    amount: 25,
    transaction_type: "Debit",
    date: "2023-05-10",
  },
  {
    id: "7",
    details: "Gas Station",
    category: "Transportation",
    amount: 45,
    transaction_type: "Debit",
    date: "2023-05-08",
  },
  {
    id: "8",
    details: "Online Shopping",
    category: "Shopping",
    amount: 89,
    transaction_type: "Debit",
    date: "2023-05-05",
  },
]

const MonthlyTabScreen = ({ navigation }) => {
  const handleMonthSelect = (month, monthData) => {
    navigation.navigate("CashFlow", {
      selectedMonth: month,
      monthData: monthData,
      allTransactions: transactions,
    })
  }

  return (
    <View style={styles.container}>
      <MonthlyTab transactions={transactions} onMonthSelect={handleMonthSelect} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
})

export default MonthlyTabScreen
