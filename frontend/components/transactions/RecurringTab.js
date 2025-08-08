import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatYear(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).getFullYear().toString();
}

export default function RecurringTab({ transactions = [] }) {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'yearly'
  const [expandedGroups, setExpandedGroups] = useState({}); // Track which groups are expanded

  // Filter transactions based on recurrence pattern
  const recurringTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    
    const filtered = transactions.filter(t => {
      // Check for different possible field names
      const recurrencePattern = t.recurrence_pattern || t.recurrencePattern || t.pattern || 'none';
      const isRecurring = t.is_recurring || t.isRecurring || false;
      
      // Check if transaction has a recurrence pattern
      const hasRecurrence = recurrencePattern && recurrencePattern !== 'none';
      
      if (activeTab === 'monthly') {
        // Show transactions with monthly, biweekly, or weekly patterns
        const isMonthly = hasRecurrence && ['monthly', 'biweekly', 'weekly'].includes(recurrencePattern);
        return isMonthly;
      } else {
        // Show transactions with yearly patterns
        const isYearly = hasRecurrence && recurrencePattern === 'annually';
        return isYearly;
      }
    });

    return filtered;
  }, [transactions, activeTab]);

  // Group transactions by month or year
  const groupedTransactions = useMemo(() => {
    const groups = {};
    
    recurringTransactions.forEach(txn => {
      let key;
      let dateStr = '';
      
      // Handle different date formats
      if (txn.date) {
        if (typeof txn.date === 'string') {
          dateStr = txn.date;
        } else if (txn.date instanceof Date) {
          dateStr = txn.date.toISOString().slice(0, 10);
        } else {
          dateStr = String(txn.date);
        }
      }
      
      if (activeTab === 'monthly') {
        key = dateStr ? dateStr.slice(0, 7) : 'Unknown'; // YYYY-MM
      } else {
        key = dateStr ? dateStr.slice(0, 4) : 'Unknown'; // YYYY
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(txn);
    });

    // Sort keys descending (most recent first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    
    const result = sortedKeys.map(key => ({
      key,
      transactions: groups[key],
      total: groups[key].reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
    }));
    
    return result;
  }, [recurringTransactions, activeTab]);

  // Toggle group expansion
  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Reset expanded state when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setExpandedGroups({}); // Reset expanded state
  };

  const renderTransaction = ({ item: txn }) => {
    const recurrencePattern = txn.recurrence_pattern || txn.recurrencePattern || txn.pattern || 'none';
    
    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionName}>{txn.details || 'Unknown'}</Text>
          <Text style={styles.transactionCategory}>{txn.app_category || txn.category || 'Other'}</Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionAmount}>${Math.abs(txn.amount).toFixed(2)}</Text>
          <Text style={styles.recurrencePattern}>{recurrencePattern}</Text>
        </View>
      </View>
    );
  };

  const renderGroup = ({ item }) => {
    const isExpanded = expandedGroups[item.key];
    
    // Handle date formatting for display
    let displayDate = '';
    if (item.transactions && item.transactions.length > 0) {
      const firstTxn = item.transactions[0];
      if (firstTxn.date) {
        if (activeTab === 'monthly') {
          displayDate = formatMonth(firstTxn.date);
        } else {
          displayDate = formatYear(firstTxn.date);
        }
      }
    }
    
    return (
      <View style={styles.groupContainer}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(item.key)}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeaderLeft}>
            <Text style={styles.groupTitle}>{displayDate || item.key}</Text>
            <Text style={styles.groupTotal}>${item.total.toFixed(2)}</Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <FlatList
            data={item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))}
            keyExtractor={(txn) => txn.id?.toString() || txn.transaction_id?.toString() || Math.random().toString()}
            renderItem={renderTransaction}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
          onPress={() => handleTabChange('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'yearly' && styles.activeTab]}
          onPress={() => handleTabChange('yearly')}
        >
          <Text style={[styles.tabText, activeTab === 'yearly' && styles.activeTabText]}>
            Yearly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={groupedTransactions}
        keyExtractor={(item) => item.key}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No recurring transactions found for {activeTab} view.
            </Text>
            <Text style={styles.emptySubtext}>
              Add recurrence patterns in Income/Expense modals to see them here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0ea5e9',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  groupContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#334155',
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  expandIcon: {
    fontSize: 20,
    color: '#94a3b8',
    marginLeft: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#94a3b8',
  },
  transactionDetails: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 4,
  },
  recurrencePattern: {
    fontSize: 12,
    color: '#0ea5e9',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});