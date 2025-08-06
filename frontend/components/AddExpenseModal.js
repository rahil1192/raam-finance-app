import React, { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, Switch, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import MerchantPickerModal from "./MerchantPickerModal"
import CategoryPickerModal from "./CategoryPickerModal"
import AccountPickerModal from "./AccountPickerModal"
import RecurrencePickerModal from "./RecurrencePickerModal"
import DateTimePicker from '@react-native-community/datetimepicker';
import { transactionService } from '../services/api';

export default function AddExpenseModal() {
  console.log("Rendering AddExpenseModal");
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
  const [accounts, setAccounts] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [alwaysRecurring, setAlwaysRecurring] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [previousCategory, setPreviousCategory] = useState(category);
  const [recurrence, setRecurrence] = useState('none');
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await transactionService.getAccounts();
        if (response && Array.isArray(response)) {
          setAccounts(response);
          // If we have a transaction and accounts are now loaded, process the transaction
          if (transaction && response.length > 0) {
            processTransactionWithAccounts(transaction, response);
          }
        } else {
          console.error('Invalid accounts response:', response);
          setAccounts([]);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  // Separate function to process transaction when accounts are available
  const processTransactionWithAccounts = (transaction, accounts) => {
    setAmount(Math.abs(transaction.amount).toString())
    setCategory(transaction.app_category || transaction.category || "Misc Expenses")
    setMerchant(transaction.name || "Rogers")
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
    setRecurrence(transaction.recurrence_pattern || 'none');
    
    // Fix date handling for existing transactions
    let transactionDate = new Date();
    if (transaction.originalDate) {
      console.log('🔍 Original transaction.originalDate:', transaction.originalDate);
      // Parse the originalDate string properly
      if (typeof transaction.originalDate === 'string') {
        const [year, month, day] = transaction.originalDate.split('-').map(Number);
        console.log('🔍 Parsed originalDate components:', { year, month, day });
        transactionDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        transactionDate = new Date(transaction.originalDate);
      }
    } else if (transaction.date) {
      // Handle different date formats from backend
      console.log('🔍 Original transaction.date:', transaction.date);
      console.log('🔍 Original transaction.date type:', typeof transaction.date);
      console.log('🔍 Original transaction.date toISOString:', transaction.date?.toISOString?.());
      
      if (typeof transaction.date === 'string') {
        // Parse the date string as local date to avoid timezone issues
        const [year, month, day] = transaction.date.split('-').map(Number);
        console.log('🔍 Parsed date components:', { year, month, day });
        // Create date at noon local time to avoid timezone shifts
        transactionDate = new Date(year, month - 1, day, 12, 0, 0);
        console.log('🔍 Created transactionDate:', transactionDate);
        console.log('🔍 transactionDate.toISOString():', transactionDate.toISOString());
      } else if (transaction.date instanceof Date) {
        console.log('🔍 transaction.date is a Date:', transaction.date);
        transactionDate = transaction.date;
      }
      
      // Check if the date is valid
      if (isNaN(transactionDate.getTime())) {
        console.warn('Invalid date received:', transaction.date);
        transactionDate = new Date();
      }
    }
    console.log('🔍 Final transactionDate being set:', transactionDate);
    setDate(transactionDate);
    
    // Set selectedAccount with accounts now available
    if (transaction.account_id) {
      console.log('🔍 Setting selectedAccount from transaction:', transaction.account_id);
      const found = accounts.find(acc => acc.account_id === transaction.account_id);
      if (found) {
        console.log('🔍 Found matching account:', found.name);
        setSelectedAccount({ account_id: found.account_id, name: found.name });
      } else {
        console.log('🔍 No matching account found, creating placeholder');
        setSelectedAccount({ account_id: transaction.account_id, name: 'Unknown Account' });
      }
    } else {
      console.log('🔍 No account_id in transaction');
      setSelectedAccount(null);
    }
  };

  useEffect(() => {
    if (transaction) {
      // If accounts are already loaded, process immediately
      if (accounts.length > 0) {
        processTransactionWithAccounts(transaction, accounts);
      } else {
        // If accounts aren't loaded yet, create a placeholder
        console.log('🔍 Accounts not loaded yet, creating placeholder');
        setSelectedAccount({ account_id: transaction.account_id, name: 'Loading...' });
      }
    } else {
      setDate(new Date());
      setIsTransfer(false);
      setRecurring(false);
      setSelectedAccount(null);
    }
  }, [transaction, accounts]);

  // Update selectedAccount name when accounts are loaded
  useEffect(() => {
    if (selectedAccount && selectedAccount.account_id && accounts.length > 0) {
      const found = accounts.find(acc => acc.account_id === selectedAccount.account_id);
      if (found && found.name !== selectedAccount.name) {
        console.log('🔍 Updating selectedAccount name:', found.name);
        setSelectedAccount({ account_id: found.account_id, name: found.name });
      }
    }
  }, [accounts, selectedAccount]);

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  const handleSave = async () => {
    if (!amount || !category || !selectedAccount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Ensure we have valid data
    const details = merchant !== 'Select Merchant' ? merchant : (notes || 'Expense Transaction');
    const transactionAmount = parseFloat(amount);
    
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Get the correct account_id - always use Plaid account ID, not database ID
    const accountId = selectedAccount?.account_id || transaction?.account_id;

    const transactionData = {
      amount: transactionAmount,
      category: category,
      app_category: category,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      details: details,
      notes: notes || '',
      transaction_type: 'Debit',
      account_id: accountId,
      is_recurring: recurrence !== 'none',
      recurrence_pattern: recurrence,
    };

    console.log('📊 Transaction data being sent:', transactionData);

    try {
      if (transaction?.id) {
        console.log('🔄 Updating existing transaction:', transaction.id);
        console.log('🔍 Transaction object:', transaction);
        console.log('🔍 Using ID type:', typeof transaction.id);
        
        // Ensure we're using the database ID, not the Plaid transaction_id
        const transactionId = typeof transaction.id === 'number' ? transaction.id : 
                            (transaction.database_id || transaction.id);
        
        console.log('🔍 Final transaction ID to use:', transactionId);
        
        const res = await transactionService.updateTransaction(transactionId, transactionData);
        console.log('✅ Update response:', res);
      } else {
        console.log('🆕 Creating new transaction');
        const res = await transactionService.createTransaction(transactionData);
        console.log('✅ Create response:', res);
      }
      console.log('✅ Transaction saved successfully');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Unknown error occurred';
      
      Alert.alert('Error', `Failed to save transaction: ${errorMessage}`);
    }

    if (alwaysRecurring && merchant && merchant !== 'Select Merchant') {
      setSavingRule(true);
      try {
        await transactionService.createRecurringRule({
          merchant: merchant,
          match_type: 'exact',
        });
      } catch (e) {
        // Optionally show error
      } finally {
        setSavingRule(false);
      }
    }
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRecurrenceDisplayText = (recurrenceId) => {
    if (recurrenceId === 'none') return 'Select repeat option';
    if (recurrenceId === 'daily') return 'Repeats Every Day';
    if (recurrenceId === 'weekly') return 'Repeats Every Week';
    if (recurrenceId === 'bi-weekly') return 'Repeats Every Bi-weekly';
    if (recurrenceId === 'monthly') return 'Repeats Every Month';
    if (recurrenceId === 'bi-monthly') return 'Repeats Every Bi-monthly';
    if (recurrenceId === 'annually') return 'Repeats Every Year';
    if (recurrenceId === 'custom') return 'Custom recurrence';
    return 'Select repeat option';
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionService.getTransactions();
      if (res && Array.isArray(res)) {
        setTransactions(res);
      } else {
        console.error('Invalid transactions response:', res);
        setTransactions([]);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
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
            {transaction?.id ? `Edit Expense` : `Add Expense`}
          </Text>
          <TouchableOpacity onPress={() => { console.log("Checkmark pressed"); handleSave(); }}>
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
          {/* Category */}
          <TouchableOpacity style={styles.row} onPress={() => setShowCategoryPicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#e11d48" }]}> 
              <Ionicons name="receipt" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{category}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Merchant/Name */}
          <TouchableOpacity style={styles.row} onPress={async () => { await fetchTransactions(); setShowMerchantPicker(true); }}>
            <View style={[styles.rowIcon, { backgroundColor: "#dc2626" }]}> 
              <Ionicons name="business" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{merchant}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Account Selection */}
          <TouchableOpacity style={styles.row} onPress={() => {
            setShowAccountPicker(true);
          }}>
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
                {isTransfer ? "This transaction will be excluded from expense calculations" : "This transaction will be included in expense calculations"}
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
          {/* Recurrence Option */}
          <TouchableOpacity style={styles.row} onPress={() => setShowRecurrencePicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#0ea5e9" }]}> 
              <Ionicons name="repeat" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{getRecurrenceDisplayText(recurrence)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 56, marginTop: 4 }}>
            <Switch
              value={alwaysRecurring}
              onValueChange={setAlwaysRecurring}
              trackColor={{ false: '#374151', true: '#0ea5e9' }}
              thumbColor={alwaysRecurring ? '#ffffff' : '#f4f3f4'}
              disabled={savingRule}
            />
            <Text style={{ color: '#94a3b8', marginLeft: 8 }}>
              Always mark transactions from this merchant as recurring
            </Text>
            {savingRule && <ActivityIndicator size="small" color="#0ea5e9" style={{ marginLeft: 8 }} />}
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
        <RecurrencePickerModal
          visible={showRecurrencePicker}
          selectedRecurrence={recurrence}
          onClose={() => setShowRecurrencePicker(false)}
          onSelect={(selectedRecurrence) => {
            setRecurrence(selectedRecurrence);
            setShowRecurrencePicker(false);
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