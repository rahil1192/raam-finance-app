import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, KeyboardAvoidingView, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import axios from "axios"

export default function AddBillModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const transactionId = route.params?.transactionId

  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Select Category")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date())
  const [repeatOption, setRepeatOption] = useState("Select repeat option")
  const [reminderDays, setReminderDays] = useState("Remind 5 days before")
  const [isAutoPaid, setIsAutoPaid] = useState(false)
  const [addExpenseEntry, setAddExpenseEntry] = useState(true)
  const [notes, setNotes] = useState("")
  const [fromAccount, setFromAccount] = useState("")
  const initializedRef = useRef(false);

  useEffect(() => {
    if (transactionId && !initializedRef.current) {
      axios.get(`https://raam-finance-app.onrender.com/api/transactions?id=${transactionId}`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            const txn = res.data[0];
            setAmount(Math.abs(txn.amount).toString());
            setCategory(txn.category || "Select Category");
            setTitle(txn.name || "");
            setNotes(txn.notes || "");
            setDate(txn.date ? new Date(txn.date) : new Date());
            setRepeatOption(txn.repeatOption || "Select repeat option");
            setReminderDays(txn.reminderDays || "Remind 5 days before");
            setIsAutoPaid(txn.isAutoPaid || false);
            setAddExpenseEntry(txn.addExpenseEntry || false);
            setFromAccount(txn.fromAccount || "");
            initializedRef.current = true;
          }
        });
    }
  }, [transactionId]);

  const handleClose = () => {
    navigation.goBack()
  }

  const handleSave = async () => {
    const transactionData = {
      id: transactionId || Date.now().toString(),
      name: title,
      amount: Math.abs(Number.parseFloat(amount)),
      category: category,
      date: date.toISOString(),
      notes: notes,
      type: "BILLS",
      repeatOption: repeatOption,
      reminderDays: reminderDays,
      isAutoPaid: isAutoPaid,
      addExpenseEntry: addExpenseEntry,
      fromAccount: fromAccount,
    }
    try {
      await axios.post(`https://raam-finance-app.onrender.com/api/transactions`, transactionData);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating bill:', error);
    }
  }

  const formatDate = (date) => {
    return date.toLocaleString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

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
            {transactionId ? `Edit Bill` : `Add Bill`}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Ionicons name="checkmark" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Amount Due */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="logo-usd" size={20} color="white" />
            </View>
            <TextInput
              style={[styles.rowTextInput, styles.amountDueInput]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Amount due"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.divider} />
          {/* Category */}
          <TouchableOpacity style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="list" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>Select category</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Title */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="document-text" size={20} color="white" />
            </View>
            <TextInput
              style={styles.rowTextInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Title..."
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.divider} />
          {/* Due Date */}
          <TouchableOpacity style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="calendar" size={20} color="white" />
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.rowText}>{formatDate(date)}</Text>
              <Text style={styles.subText}>Due Date</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Repeat Option */}
          <TouchableOpacity style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="refresh" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{repeatOption}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Reminder */}
          <TouchableOpacity style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="notifications" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>{reminderDays}</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.largeDivider} />
          {/* Auto Paid */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="checkbox" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>Auto Paid</Text>
            <Switch
              value={isAutoPaid}
              onValueChange={setIsAutoPaid}
              trackColor={{ false: "#374151", true: "#0ea5e9" }}
              thumbColor={isAutoPaid ? "#ffffff" : "#f4f3f4"}
            />
          </View>
          {isAutoPaid && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>Note: Auto-paid bills are marked as paid on the due date in the app.</Text>
            </View>
          )}
          <View style={styles.divider} />
          {/* From Account */}
          <TouchableOpacity style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#64748b" }]}> 
              <Ionicons name="card" size={20} color="white" />
            </View>
            <Text style={styles.rowText}>From account</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Add Expense Entry */}
          <View style={styles.row}>
            <Text style={styles.rowText}>Add expense entry for this payment.</Text>
            <Switch
              value={addExpenseEntry}
              onValueChange={setAddExpenseEntry}
              trackColor={{ false: "#374151", true: "#0ea5e9" }}
              thumbColor={addExpenseEntry ? "#ffffff" : "#f4f3f4"}
            />
          </View>
          <View style={styles.largeDivider} />
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
        </ScrollView>
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
  amountDueInput: {
    fontSize: 24,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#374151",
    marginHorizontal: 16,
  },
  largeDivider: {
    height: 8,
    backgroundColor: "#374151",
    marginVertical: 16,
  },
  dateContainer: {
    flex: 1,
  },
  subText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  noteContainer: {
    backgroundColor: "#7c2d12",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    color: "white",
    fontSize: 14,
  },
})