import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchTransactionsScreen({ navigation, route }) {
  const { transactions } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
    } else {
      const q = query.trim().toLowerCase();
      if (!transactions || !Array.isArray(transactions)) {
        setResults([]);
        return;
      }
      setResults(
        transactions.filter(t =>
          (t.details && t.details.toLowerCase().includes(q)) ||
          (t.app_category && t.app_category.toLowerCase().includes(q)) ||
          (t.amount && String(t.amount).includes(q))
        )
      );
    }
  }, [query, transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#18181b' }} edges={['top', 'left', 'right']}>
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarFull}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconLeft}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions ..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => setQuery('')} style={styles.iconRight}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id?.toString() || item.transaction_id}
        renderItem={({ item }) => {
          let isIncome = item.transaction_type === 'Credit';
          let amount = Math.abs(Number(item.amount)).toFixed(2);
          let sign = isIncome ? '+' : '-';
          let amountColor = isIncome ? '#22c55e' : '#fbbf24';

          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate(isIncome ? 'AddIncome' : 'AddExpense', { transaction: item })}
            >
              <Text style={styles.details}>{item.details}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>{sign}${amount}</Text>
              <Text style={styles.category}>{item.app_category || item.category || 'Other'}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#94a3b8' }}>No transactions found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBarWrapper: {
    backgroundColor: '#0c4a6e',
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 0,
  },
  searchBarFull: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0c4a6e',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0c4a6e',
    color: '#fff',
    borderRadius: 0,
    paddingHorizontal: 12,
    fontSize: 18,
    minHeight: 40,
    paddingBottom: 4,
  },
  iconLeft: {
    marginRight: 8,
    paddingBottom: 4,
  },
  iconRight: {
    marginLeft: 8,
    paddingBottom: 4,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#22223b',
  },
  details: { color: '#fff', fontSize: 16 },
  amount: { color: '#fbbf24', fontWeight: 'bold', fontSize: 15 },
  category: { color: '#38bdf8', fontSize: 13 },
}); 