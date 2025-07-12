import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import axios from "axios"

export default function AddTransferModal() {
  const navigation = useNavigation()
  const route = useRoute()
  const transactionId = route.params?.transactionId

  const [amount, setAmount] = useState("")
  const [fromAccount, setFromAccount] = useState("")
  const [toAccount, setToAccount] = useState("")
  const [merchant, setMerchant] = useState("")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState(new Date())
  const initializedRef = useRef(false);

  useEffect(() => {
    if (transactionId && !initializedRef.current) {
      axios.get(`http://192.168.2.19:8001/api/transactions?id=${transactionId}`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            const txn = res.data[0];
            setAmount(Math.abs(txn.amount).toString());
            setFromAccount(txn.fromAccount || "");
            setToAccount(txn.toAccount || "");
            setMerchant(txn.name || "");
            setNotes(txn.notes || "");
            setDate(txn.date ? new Date(txn.date) : new Date());
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
      name: merchant,
      amount: Math.abs(Number.parseFloat(amount)),
      fromAccount: fromAccount,
      toAccount: toAccount,
      notes: notes,
      date: date.toISOString(),
      type: "TRANSFER",
    }
    try {
      await axios.post(`http://192.168.2.19:8001/api/transactions`, transactionData);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating transaction:', error);
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
            {transactionId ? `Edit Transfer` : `Add Transfer`}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Ionicons name="checkmark" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.simpleForm}>
            {/* Amount Input */}
            <View style={styles.simpleInputGroup}>
              <Text style={styles.simpleLabel}>Amount</Text>
              <TextInput
                style={styles.simpleInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </View>
            {/* From Account */}
            <View style={styles.simpleInputGroup}>
              <Text style={styles.simpleLabel}>From Account</Text>
              <TextInput
                style={styles.simpleInput}
                value={fromAccount}
                onChangeText={setFromAccount}
                placeholder="Select account"
                placeholderTextColor="#64748b"
              />
            </View>
            {/* To Account */}
            <View style={styles.simpleInputGroup}>
              <Text style={styles.simpleLabel}>To Account</Text>
              <TextInput
                style={styles.simpleInput}
                value={toAccount}
                onChangeText={setToAccount}
                placeholder="Select account"
                placeholderTextColor="#64748b"
              />
            </View>
            {/* Description */}
            <View style={styles.simpleInputGroup}>
              <Text style={styles.simpleLabel}>Description</Text>
              <TextInput
                style={styles.simpleInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Enter description"
                placeholderTextColor="#64748b"
              />
            </View>
            {/* Notes */}
            <View style={styles.simpleInputGroup}>
              <Text style={styles.simpleLabel}>Notes</Text>
              <TextInput
                style={styles.simpleInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes"
                placeholderTextColor="#64748b"
                multiline
              />
            </View>
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
  simpleForm: {
    padding: 16,
  },
  simpleInputGroup: {
    marginBottom: 16,
  },
  simpleLabel: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  simpleInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    paddingBottom: 8,
    fontSize: 16,
    color: "white",
  },
}) 