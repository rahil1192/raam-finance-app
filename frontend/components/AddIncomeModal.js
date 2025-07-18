import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, Switch } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import MerchantPickerModal from "./MerchantPickerModal"
import CategoryPickerModal from "./CategoryPickerModal"
import AccountPickerModal from "./AccountPickerModal"
import axios from "axios"
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddIncomeModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const transaction = route.params?.transaction

  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Select Category")
  const [categoryCode, setCategoryCode] = useState("");
  const [merchant, setMerchant] = useState("Select Merchant")
  const [account, setAccount] = useState("Select Account")
  const [date, setDate] = useState(new Date())
  const [notes, setNotes] = useState("")
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showMerchantPicker, setShowMerchantPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isTransfer, setIsTransfer] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [previousCategory, setPreviousCategory] = useState(category);

  // Fetch accounts when modal mounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('http://192.168.2.19:8001/api/accounts');
        setAccounts(res.data);
      } catch (e) {
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (transaction) {
      setAmount(Math.abs(transaction.amount).toString())
      setCategory(transaction.category || "Income")
      setCategoryCode(transaction.category_code || ""); // Initialize categoryCode
      setMerchant(transaction.name || "Payer")
      setNotes(transaction.notes || "")
      
      // Check if transaction is a transfer
      const transferKeywords = ['transfer', 'move', 'send', 'receive', 'wire', 'ach'];
      const details = transaction.details?.toLowerCase() || '';
      const category = transaction.category?.toLowerCase() || '';
      const isPlaidTransfer = transaction.category?.includes('TRANSFER') || 
                             transaction.category?.includes('TRANSFER_IN') ||
                             transaction.category?.includes('TRANSFER_OUT');
      
      const isTransferTransaction = category === 'transfers' || 
                                   category === 'transfer' ||
                                   isPlaidTransfer ||
                                   transferKeywords.some(keyword => details.includes(keyword)) ||
                                   transaction.transaction_type === 'Transfer';
      
      setIsTransfer(isTransferTransaction);
      setRecurring(transaction.is_recurring || false);
      
      // Fix date handling for existing transactions
      let transactionDate = new Date();
      if (transaction.originalDate) {
        // Use the original date from the transaction
        transactionDate = new Date(transaction.originalDate);
      } else if (transaction.date) {
        // Handle different date formats from backend
        if (typeof transaction.date === 'string') {
          transactionDate = new Date(transaction.date);
        } else if (transaction.date instanceof Date) {
          transactionDate = transaction.date;
        }
        
        // Check if the date is valid
        if (isNaN(transactionDate.getTime())) {
          console.warn('Invalid date received:', transaction.date);
          transactionDate = new Date();
        }
      }
      setDate(transactionDate);
      
      if (transaction.account_id && accounts.length > 0) {
        const found = accounts.find(acc => acc.account_id === transaction.account_id);
        setSelectedAccount(found ? { account_id: found.account_id, name: found.name } : null);
      } else {
        setSelectedAccount(null);
      }
    } else {
      setDate(new Date());
      setIsTransfer(false);
      setRecurring(false);
    }
  }, [transaction, accounts]);

  const handleClose = () => {
    navigation.goBack()
  }

  const handleSave = async () => {
    console.log('handleSave called');
    let transactionData;
    try {
      let validDate = date instanceof Date && !isNaN(date) ? date : new Date();
      
      // Determine the category based on transfer toggle
      let finalCategory = category;
      if (isTransfer) {
        finalCategory = "Transfers";
      }
      
      transactionData = {
        id: transaction?.id || Date.now().toString(),
        name: merchant,
        amount: Math.abs(Number.parseFloat(amount)),
        category: categoryCode || category, // Use categoryCode for backend
        date: validDate.toISOString(),
        notes: notes,
        type: "INCOME",
        account_id: selectedAccount?.account_id || null,
        is_transfer: isTransfer, // Add transfer flag
        is_recurring: recurring, // Add recurring flag
      }
      console.log('transactionData constructed:', transactionData);
    } catch (err) {
      console.error('Error constructing transactionData:', err);
      alert('Error constructing transactionData: ' + err.message);
      return;
    }
    console.log('Before try');
    try {
      if (transaction?.id) {
        const res = await axios.put(`http://192.168.2.19:8001/api/transactions/${transaction.id}`, transactionData);
        console.log('Update response:', res.data);
      } else {
        const res = await axios.post(`http://192.168.2.19:8001/api/transactions`, transactionData);
        console.log('Create response:', res.data);
      }
      console.log('After try, before navigation');
      navigation.goBack();
      console.log('After navigation');
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction: ' + (error?.response?.data?.detail || error.message));
      console.log('After catch');
    }
    console.log('After try/catch');
  }

  const formatDate = (date) => {
    // Handle invalid dates
    if (!date || isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    return date.toLocaleString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://192.168.2.19:8001/api/transactions');
      setTransactions(res.data);
    } catch (e) {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToggle = (value) => {
    setIsTransfer(value);
    if (value) {
      setPreviousCategory(category); // Save the current category
      setCategory("Transfers");
    } else {
      setCategory(previousCategory || "Select Category"); // Restore previous category
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {transaction?.id ? `Edit Income` : `Add Income`}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Ionicons name="checkmark" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <View style={styles.amountContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="logo-usd" size={20} color="white" />
            </View>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.divider} />
          {/* Income Source */}
          <TouchableOpacity style={styles.row} onPress={() => setShowCategoryPicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#22c55e" }]}> 
              <Ionicons name="cash" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{category}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Payer */}
          <TouchableOpacity style={styles.row} onPress={async () => { await fetchTransactions(); setShowMerchantPicker(true); }}>
            <View style={[styles.rowIcon, { backgroundColor: "#16a34a" }]}> 
              <Ionicons name="person" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{merchant}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Account Selection */}
          <TouchableOpacity style={styles.row} onPress={() => setShowAccountPicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="card" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{selectedAccount?.name || "Select Account"}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Date */}
          <TouchableOpacity style={styles.row} onPress={() => setShowDatePicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="calendar" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{formatDate(date)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
          <View style={styles.divider} />
          {/* Notes */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="list" size={20} color="white" />
            </View>
            <TextInput
              style={styles.rowTextInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes..."
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.divider} />
          {/* Transfer Toggle */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#8b5cf6" }]}> 
              <Ionicons name="swap-horizontal" size={20} color="white" />
            </View>
            <View style={styles.transferToggleContainer}>
              <Text style={styles.rowText}>Mark as Transfer</Text>
              <Text style={styles.transferDescription}>
                {isTransfer ? "This transaction will be excluded from income calculations" : "This transaction will be included in income calculations"}
              </Text>
            </View>
            <Switch
              value={isTransfer}
              onValueChange={handleTransferToggle}
              trackColor={{ false: "#374151", true: "#8b5cf6" }}
              thumbColor={isTransfer ? "#ffffff" : "#f4f3f4"}
            />
          </View>
          <View style={styles.divider} />
          {/* Recurring Toggle */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#0ea5e9" }]}> 
              <Ionicons name="repeat" size={20} color="white" />
            </View>
            <View style={styles.transferToggleContainer}>
              <Text style={styles.rowText}>Mark as Recurring</Text>
              <Text style={styles.transferDescription}>
                {recurring ? "This transaction will be shown in Recurring tab" : "This transaction will not be shown in Recurring tab"}
              </Text>
            </View>
            <Switch
              value={recurring}
              onValueChange={setRecurring}
              trackColor={{ false: "#374151", true: "#0ea5e9" }}
              thumbColor={recurring ? "#ffffff" : "#f4f3f4"}
            />
          </View>
        </ScrollView>
        {/* Pickers */}
        <MerchantPickerModal
          visible={showMerchantPicker}
          selectedMerchants={[merchant]}
          onClose={() => setShowMerchantPicker(false)}
          onApply={async (selected) => {
            if (selected.length > 0) {
              const newMerchant = selected[0];
              setMerchant(newMerchant);
            }
            setShowMerchantPicker(false);
          }}
          transactions={transactions}
        />
        <CategoryPickerModal
          visible={showCategoryPicker}
          selectedCategories={[category]}
          onClose={() => setShowCategoryPicker(false)}
          onApply={async (selected) => {
            if (selected.length > 0) {
              const newCategory = selected[0];
              setCategory(newCategory.label);
              setCategoryCode(newCategory.value);
            }
            setShowCategoryPicker(false);
          }}
          multiSelect={false}
        />
        <AccountPickerModal
          visible={showAccountPicker}
          selectedAccount={selectedAccount}
          onClose={() => setShowAccountPicker(false)}
          onApply={async (account) => {
            setSelectedAccount(account);
            setShowAccountPicker(false);
          }}
        />
      </View>
    </KeyboardAvoidingView>
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
    paddingVertical: 12,
    backgroundColor: "#1e40af",
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#64748b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#374151",
    marginHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#64748b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: "white",
  },
  rowTextInput: {
    flex: 1,
    fontSize: 16,
    color: "white",
    padding: 0,
  },
  transferToggleContainer: {
    flex: 1,
  },
  transferDescription: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
}) 