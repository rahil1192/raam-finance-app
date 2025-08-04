import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { transactionService } from '../services/api';

export default function AccountPickerModal({
  visible,
  selectedAccount,
  selectedAccounts,
  onClose,
  onApply,
  multiSelect,
}) {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(multiSelect ? (selectedAccounts || []) : (selectedAccount ? [selectedAccount] : []));

  useEffect(() => {
    if (visible) {
      fetchAccounts();
      setSelected(multiSelect ? (selectedAccounts || []) : (selectedAccount ? [selectedAccount] : []));
    }
  }, [visible, selectedAccount, selectedAccounts, multiSelect]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await transactionService.getAccounts();
      console.log('🔍 AccountPickerModal - API response:', accountsData);
      
      if (accountsData && Array.isArray(accountsData)) {
        console.log('🔍 AccountPickerModal - Processed accounts:', accountsData.length);
        setAccounts(accountsData);
      } else {
        console.error('❌ Invalid accounts response:', accountsData);
        setAccounts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (account) => {
    if (multiSelect) {
      const exists = selected.some(a => a.account_id === account.account_id);
      if (exists) {
        setSelected(selected.filter(a => a.account_id !== account.account_id));
      } else {
        setSelected([...selected, account]);
      }
    } else {
      setSelected([account]);
      onApply(account);
    }
  };

  const handleApplyMulti = () => {
    onApply(selected);
  };

  // Filter accounts based on search
  const filteredAccounts = accounts && Array.isArray(accounts) ? accounts.filter(account =>
    account.name.toLowerCase().includes(search.toLowerCase()) ||
    account.official_name?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const getAccountIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'credit':
        return 'card-outline';
      case 'depository':
        return 'wallet-outline';
      case 'investment':
        return 'trending-up-outline';
      case 'loan':
        return 'cash-outline';
      default:
        return 'card-outline';
    }
  };

  const getAccountColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'credit':
        return '#f59e42';
      case 'depository':
        return '#22c55e';
      case 'investment':
        return '#0ea5e9';
      case 'loan':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Account</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search accounts..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />
        </View>

        <ScrollView style={styles.accountList}>
          {filteredAccounts.map((account) => {
            const isSelected = selected.some(a => a.account_id === account.account_id);
            return (
              <TouchableOpacity
                key={account.account_id}
                style={styles.accountRow}
                onPress={() => handleSelect(account)}
              >
                <View style={[styles.iconContainer, { backgroundColor: getAccountColor(account.type) }]}>
                  <Ionicons name={getAccountIcon(account.type)} size={22} color="white" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountBalance}>
                    ${account.current_balance?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color="#0ea5e9" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {multiSelect && (
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyMulti}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#1e40af',
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    backgroundColor: 'transparent',
  },
  accountList: {
    flex: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    color: '#94a3b8',
  },
  applyButton: {
    backgroundColor: '#1976d2',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    margin: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 