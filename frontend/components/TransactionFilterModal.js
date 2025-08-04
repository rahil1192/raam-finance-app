import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import CategoryPickerModal from './CategoryPickerModal';
import AccountPickerModal from './AccountPickerModal';

const FILTERS = ['All', 'Expenses', 'Income', 'Transfer'];

export default function TransactionFilterModal({
  visible,
  onClose,
  onApply,
  onClear,
  selectedFilter,
  onSelectedFilterChange,
  category,
  onCategoryChange,
  account,
  onAccountChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
  notes,
  onNotesChange
}) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const removeCategory = (cat) => onCategoryChange(Array.isArray(category) ? category.filter(c => c !== cat) : []);
  const removeAccount = (acc) => onAccountChange(Array.isArray(account) ? account.filter(a => a !== acc) : []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterButton, selectedFilter === f && styles.filterButtonActive]}
                  onPress={() => onSelectedFilterChange(f)}
                >
                  <Text style={[styles.filterButtonText, selectedFilter === f && styles.filterButtonTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
            <View style={styles.chipContainer}>
              {Array.isArray(category) ? category.map(cat => {
                const key = typeof cat === 'object' && cat !== null ? cat.id || cat.name : cat;
                const label = typeof cat === 'object' && cat !== null ? cat.name : cat;
                return (
                  <View key={key} style={styles.chip}>
                    <Text style={styles.chipText}>{label}</Text>
                    <TouchableOpacity onPress={() => removeCategory(cat)} style={styles.removeChipButton}>
                      <Text style={styles.removeCategoryButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              }) : null}
            </View>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAccountPicker(true)}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
            <View style={styles.chipContainer}>
              {Array.isArray(account) ? account.map(acc => {
                const key = typeof acc === 'object' && acc !== null ? acc.account_id || acc.name : acc;
                const label = typeof acc === 'object' && acc !== null ? acc.name : acc;
                return (
                  <View key={key} style={styles.chip}>
                    <Text style={styles.chipText}>{label}</Text>
                    <TouchableOpacity onPress={() => removeAccount(acc)} style={styles.removeChipButton}>
                      <Text style={styles.removeCategoryButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              }) : null}
            </View>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.row}>
              <TextInput style={styles.input} placeholder="From" value={dateFrom} onChangeText={onDateFromChange} />
              <TextInput style={styles.input} placeholder="To" value={dateTo} onChangeText={onDateToChange} />
            </View>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.row}>
              <TextInput style={styles.input} placeholder="Min" value={amountMin} onChangeText={onAmountMinChange} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Max" value={amountMax} onChangeText={onAmountMaxChange} keyboardType="numeric" />
            </View>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput style={styles.input} placeholder="Something like" value={notes} onChangeText={onNotesChange} />
          </ScrollView>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={onApply}>
              <Text style={styles.applyButtonText}>APPLY</Text>
            </TouchableOpacity>
          </View>
          <CategoryPickerModal
            visible={showCategoryPicker}
            selectedCategories={category}
            onClose={() => setShowCategoryPicker(false)}
            onApply={async (selected) => {
              onCategoryChange(selected);
              setShowCategoryPicker(false);
            }}
            multiSelect={true}
          />
          <AccountPickerModal
            visible={showAccountPicker}
            selectedAccounts={account}
            onClose={() => setShowAccountPicker(false)}
            onApply={async (selected) => {
              onAccountChange(selected);
              setShowAccountPicker(false);
            }}
            multiSelect={true}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#23232b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    minHeight: '70%',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  removeChipButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#1976d2',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 