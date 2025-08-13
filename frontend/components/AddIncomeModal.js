import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MerchantPickerModal from "./MerchantPickerModal"
import CategoryPickerModal from "./CategoryPickerModal"
import AccountPickerModal from "./AccountPickerModal"
import RecurrencePickerModal from "./RecurrencePickerModal"
import { transactionService } from '../services/api';

export default function AddIncomeModal() {
  const navigation = useNavigation();
  const route = useRoute();
  const transaction = route.params?.transaction;

  // State variables
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [category, setCategory] = useState(transaction?.category || 'Select Category');
  const [categoryCode, setCategoryCode] = useState("");
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [merchant, setMerchant] = useState(transaction?.merchant || 'Select Merchant');
  const [account, setAccount] = useState(transaction?.account_id?.toString() || 'Select Account');
  const [selectedAccount, setSelectedAccount] = useState(transaction?.account_id?.toString() || 'Select Account');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMerchantPicker, setShowMerchantPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isTransfer, setIsTransfer] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [previousCategory, setPreviousCategory] = useState('');
  const [recurrence, setRecurrence] = useState(transaction?.recurrence_pattern || 'none');
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await transactionService.getAccounts();
      if (response && Array.isArray(response)) {
        setAccounts(response);
      } else {
        console.error('Invalid accounts response:', response);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  useEffect(() => {
    if (transaction) {
      // Set all the transaction data directly
      setAmount(Math.abs(transaction.amount).toString());
      setCategory(transaction.app_category || transaction.category || "Income");
      setCategoryCode(transaction.category_code || "");
      setMerchant(transaction.details || transaction.name || "Select Merchant");
      setNotes(transaction.notes || "");
      setRecurrence(transaction.recurrence_pattern || 'none');
      setRecurring(transaction.is_recurring || false);
      
      // Handle date
      let transactionDate = new Date();
      if (transaction.originalDate) {
        if (typeof transaction.originalDate === 'string') {
          const [year, month, day] = transaction.originalDate.split('-').map(Number);
          transactionDate = new Date(year, month - 1, day, 12, 0, 0);
        } else {
          transactionDate = new Date(transaction.originalDate);
        }
      } else if (transaction.date) {
        if (typeof transaction.date === 'string') {
          const [year, month, day] = transaction.date.split('-').map(Number);
          transactionDate = new Date(year, month - 1, day, 12, 0, 0);
        } else if (transaction.date instanceof Date) {
          transactionDate = transaction.date;
        }
      }
      setDate(transactionDate);
      
      // Handle transfer detection
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
    } else {
      // Reset for new transaction
      setAmount('');
      setCategory('Select Category');
      setCategoryCode('');
      setMerchant('Select Merchant');
      setNotes('');
      setRecurrence('none');
      setRecurring(false);
      setDate(new Date());
      setIsTransfer(false);
      setSelectedAccount(null);
    }
  }, [transaction]);

  // Handle account selection when accounts are loaded
  useEffect(() => {
    if (transaction && accounts.length > 0) {
      if (transaction.account_id) {
        const found = accounts.find(acc => acc.account_id === transaction.account_id);
        if (found) {
          setSelectedAccount({ account_id: found.account_id, name: found.name });
        } else {
          setSelectedAccount({ account_id: transaction.account_id, name: 'Unknown Account' });
        }
      }
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
    const details = merchant !== 'Select Merchant' ? merchant : (notes || 'Income Transaction');
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
      app_category: categoryCode || category, // Use categoryCode if available (for custom categories), otherwise use category
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      details: details,
      notes: notes || '',
      transaction_type: 'Credit',
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
          {/* Recurrence Option */}
          <TouchableOpacity style={styles.row} onPress={() => setShowRecurrencePicker(true)}>
            <View style={[styles.rowIcon, { backgroundColor: "#0ea5e9" }]}> 
              <Ionicons name="repeat" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{getRecurrenceDisplayText(recurrence)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
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
              // Handle both string and object formats
              if (typeof newCategory === 'string') {
                setCategory(newCategory);
                setCategoryCode(newCategory);
              } else {
                setCategory(newCategory.label || newCategory.value || newCategory);
                setCategoryCode(newCategory.value || newCategory.label || newCategory);
              }
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