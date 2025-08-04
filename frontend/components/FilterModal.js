import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNModal from 'react-native-modal';
import CategoryPickerModal from './CategoryPickerModal';
import MerchantPickerModal from './MerchantPickerModal';

const DATE_RANGE_OPTIONS = [
  'Last 7 days',
  'Last 14 days',
  'Last 30 days',
  'Last 60 days',
  'This month',
  'Last month',
  'This year',
  'Last year',
  'All time',
];
const SORT_OPTIONS = ['Date (new to old)', 'Date (old to new)', 'Amount (high to low)', 'Amount (low to high)'];

export default function FilterModal({
  visible,
  filters,
  setFilters,
  onApply,
  onClear,
  accounts = [],
  onClose,
  transactions = []
}) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [merchantModalVisible, setMerchantModalVisible] = useState(false);

  useEffect(() => {
    if (visible) setDateRangeModalVisible(false);
  }, [visible]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderDropdown = (title, options, selectedValue, onSelect) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownHeader} 
        onPress={() => toggleSection(title)}
      >
        <Text style={styles.dropdownTitle}>{title}</Text>
        <Ionicons 
          name={expandedSection === title ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#fff" 
        />
      </TouchableOpacity>
      {expandedSection === title && (
        <View style={styles.dropdownContent}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownOption,
                selectedValue === option && styles.selectedOption
              ]}
              onPress={() => {
                onSelect(option);
                setExpandedSection(null);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                selectedValue === option && styles.selectedOptionText
              ]}>{option}</Text>
              {selectedValue === option && (
                <Ionicons name="checkmark" size={20} color="#f59e42" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Date Range Modal Trigger */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setDateRangeModalVisible(true)}
            >
              <Text style={styles.dropdownTitle}>DATE RANGE</Text>
              <Text style={styles.selectedValueText}>{filters.dateRange || 'All time'}</Text>
              <Ionicons name="chevron-down" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Sort By Dropdown */}
          {renderDropdown(
            'SORT BY',
            SORT_OPTIONS,
            filters.sortBy,
            (value) => setFilters({ ...filters, sortBy: value })
          )}

          {/* Accounts Dropdown */}
          {renderDropdown(
            'ACCOUNTS',
            accounts.map(acc => acc.name),
            filters.selectedAccounts.length === 1 ? accounts.find(acc => acc.account_id === filters.selectedAccounts[0])?.name : 'Multiple',
            (value) => {
              const selectedAccount = accounts.find(acc => acc.name === value);
              if (selectedAccount) {
                setFilters({ ...filters, selectedAccounts: [selectedAccount.account_id] });
              }
            }
          )}

          {/* Categories Dropdown replaced with Modal Trigger */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={styles.dropdownTitle}>CATEGORIES</Text>
              <Text style={styles.selectedValueText}>
                {filters.categories.length > 0 ? `${filters.categories.length} selected` : 'All Categories'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Merchants Dropdown replaced with Modal Trigger */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setMerchantModalVisible(true)}
            >
              <Text style={styles.dropdownTitle}>MERCHANTS</Text>
              <Text style={styles.selectedValueText}>
                {filters.merchants.length > 0 ? `${filters.merchants.length} selected` : 'All Merchants'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Amounts Dropdown */}
          {renderDropdown(
            'AMOUNTS',
            ['$0 - $50', '$50 - $100', '$100 - $500', '$500+'],
            filters.amounts.length > 0 ? 'Multiple' : 'All Amounts',
            (value) => {
              const newAmounts = filters.amounts.includes(value)
                ? filters.amounts.filter(amt => amt !== value)
                : [...filters.amounts, value];
              setFilters({ ...filters, amounts: newAmounts });
            }
          )}

          {/* Tags Dropdown */}
          {renderDropdown(
            'TAGS',
            ['Important', 'Recurring', 'Business', 'Personal'],
            filters.tags.length > 0 ? 'Multiple' : 'All Tags',
            (value) => {
              const newTags = filters.tags.includes(value)
                ? filters.tags.filter(tag => tag !== value)
                : [...filters.tags, value];
              setFilters({ ...filters, tags: newTags });
            }
          )}
        </ScrollView>

        {/* Date Range Bottom Modal */}
        <RNModal
          isVisible={dateRangeModalVisible}
          onBackdropPress={() => setDateRangeModalVisible(false)}
          onBackButtonPress={() => setDateRangeModalVisible(false)}
          style={styles.bottomModal}
        >
          <View style={styles.modalSheet}>
            {DATE_RANGE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setFilters({ ...filters, dateRange: option });
                  setDateRangeModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, filters.dateRange === option && styles.modalOptionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => setDateRangeModalVisible(false)}
            >
              <Text style={[styles.modalOptionText, { color: '#1976D2', fontWeight: 'bold' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </RNModal>

        {/* Category Picker Modal */}
        <CategoryPickerModal
          visible={categoryModalVisible}
          selectedCategories={filters.categories}
          onClose={() => setCategoryModalVisible(false)}
          onApply={(selected) => {
            setFilters({ ...filters, categories: selected });
            setCategoryModalVisible(false);
          }}
        />

        {/* Merchant Picker Modal */}
        <MerchantPickerModal
          visible={merchantModalVisible}
          selectedMerchants={filters.merchants}
          onClose={() => setMerchantModalVisible(false)}
          onApply={(selected) => {
            setFilters({ ...filters, merchants: selected });
            setMerchantModalVisible(false);
          }}
          transactions={transactions}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear all</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
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
  content: {
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#23232a',
  },
  dropdownTitle: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  selectedValueText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    flex: 2,
    textAlign: 'right',
  },
  dropdownContent: {
    backgroundColor: '#23232a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  selectedOption: {
    backgroundColor: '#1e293b',
  },
  dropdownOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#f59e42',
    fontWeight: 'bold',
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
  // Modal styles
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingTop: 8,
  },
  modalOption: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 18,
    color: '#1976D2',
    textAlign: 'left',
  },
  modalOptionTextSelected: {
    color: '#f59e42',
    fontWeight: 'bold',
  },
}); 