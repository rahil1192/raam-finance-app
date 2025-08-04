import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MerchantPickerModal({
  visible,
  selectedMerchants,
  onClose,
  onApply,
  transactions = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [filteredMerchants, setFilteredMerchants] = useState([]);

  useEffect(() => {
    if (visible) {
      
      // Extract unique merchants from transactions
      const merchantMap = {};
      transactions.forEach((txn, index) => {
        
        // Try to get merchant name from different possible fields
        let merchant = txn.details || txn.name || txn.merchant || 'Other';
        
        // If all fields are undefined/null, skip this transaction
        if (!merchant || merchant === 'Other') {
          console.log(`Skipping transaction ${index} - no merchant name found`);
          return;
        }
        
        if (merchant !== 'Other') {
          const words = merchant.split(' ');
          // Filter out words that are all digits
          const nonNumericWords = words.filter(w => !/^\d+$/.test(w));
          merchant = nonNumericWords.slice(0, 5).join(' ');
        }

        // Only add non-empty merchant names
        if (merchant && merchant.trim() !== '') {
          if (!merchantMap[merchant]) {
            merchantMap[merchant] = {
              name: merchant,
              count: 0
            };
          }
          merchantMap[merchant].count += 1;
        }
      });

      const merchantList = Object.values(merchantMap).sort((a, b) => b.count - a.count);
      setMerchants(merchantList);
      setFilteredMerchants(merchantList);
    }
  }, [visible, transactions]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = merchants.filter(merchant =>
        merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMerchants(filtered);
    } else {
      setFilteredMerchants(merchants);
    }
  }, [searchQuery, merchants]);

  const toggleMerchant = (merchant) => {
    // For single merchant selection, just apply the selected merchant
    onApply([merchant.name]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Merchant</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Merchant List */}
        <FlatList
          data={filteredMerchants}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.merchantItem}
              onPress={() => toggleMerchant(item)}
            >
              <View style={styles.merchantInfo}>
                <Text style={styles.merchantName}>{item.name}</Text>
                <Text style={styles.merchantCount}>{item.count} transactions</Text>
              </View>
              {selectedMerchants.includes(item.name) && (
                <Ionicons name="checkmark" size={24} color="#f59e42" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No merchants found</Text>
          }
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={() => onApply([])}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  merchantCount: {
    color: '#666',
    fontSize: 14,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#23232a',
  },
  clearButton: {
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#f59e42',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 