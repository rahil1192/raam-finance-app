import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable } from 'react-native';
import axios from 'axios';

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}
function formatYear(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).getFullYear().toString();
}

const API_BASE_URL = 'http://192.168.2.19:8001/api'; // Update if needed

const PATTERN_OPTIONS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'irregular', label: 'Irregular' },
];

export default function RecurringTab({ transactions = [] }) {
  const [groupBy, setGroupBy] = useState('monthly'); // 'monthly', 'yearly', or 'weekly'
  const [expanded, setExpanded] = useState({}); // { [monthKey]: true/false }
  const [patterns, setPatterns] = useState({}); // { merchant: {pattern, amount, count} }
  const [editPattern, setEditPattern] = useState({ open: false, merchant: null, ruleId: null, current: null });

  // Fetch recurrence patterns from backend
  useEffect(() => {
    axios.get(`${API_BASE_URL}/recurring/patterns`).then(res => {
      // Convert to a map for fast lookup
      const map = {};
      (res.data || []).forEach(p => {
        map[p.merchant] = p;
      });
      setPatterns(map);
    }).catch(() => setPatterns({}));
  }, []);

  // Filter for recurring transactions by selected pattern
  const recurringTxns = useMemo(() => {
    // If patterns are not loaded yet, show all recurring
    if (!patterns || Object.keys(patterns).length === 0) return transactions.filter(t => t.is_recurring);
    return transactions.filter(t => {
      if (!t.is_recurring) return false;
      const merchant = t.details || 'Other';
      const pattern = patterns[merchant]?.pattern;
      if (groupBy === 'weekly') return pattern === 'weekly';
      if (groupBy === 'monthly') return pattern === 'monthly' || pattern === 'biweekly';
      if (groupBy === 'yearly') return pattern === 'yearly';
      return true;
    });
  }, [transactions, patterns, groupBy]);

  // Helper to get week number and year from a date string
  function getWeekKey(dateStr) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    // ISO week: Thursday is always in the week
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    const yearStart = new Date(d.getFullYear(),0,1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2,'0')}`;
  }

  // Group and total recurring transactions
  const grouped = useMemo(() => {
    const groups = {};
    recurringTxns.forEach(txn => {
      let key;
      if (groupBy === 'monthly') {
        key = txn.date ? txn.date.slice(0, 7) : 'Unknown'; // YYYY-MM
      } else if (groupBy === 'yearly') {
        key = txn.date ? txn.date.slice(0, 4) : 'Unknown'; // YYYY
      } else if (groupBy === 'weekly') {
        key = getWeekKey(txn.date);
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(txn);
    });
    // Sort keys descending (most recent first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(key => ({
      key,
      txns: groups[key],
      total: groups[key].reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
    }));
  }, [recurringTxns, groupBy]);

  // Reset expanded state when switching groupBy
  useEffect(() => {
    setExpanded({});
  }, [groupBy]);

  // Helper to get pattern/amount/next date for a merchant
  function getPatternInfo(merchant, txns) {
    const p = patterns[merchant];
    if (!p || !p.pattern || !p.amount) return null;
    let label = '';
    let interval = 0;
    if (p.pattern === 'weekly') { label = `/week`; interval = 7; }
    else if (p.pattern === 'biweekly') { label = `/2wks`; interval = 14; }
    else if (p.pattern === 'monthly') { label = `/month`; interval = 30; }
    else if (p.pattern === 'irregular') { label = `/irregular`; interval = 0; }
    else label = '';
    // Next expected date
    let nextDate = null;
    if (interval > 0 && txns && txns.length > 0) {
      const mostRecent = txns.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
      const d = new Date(mostRecent.date);
      d.setDate(d.getDate() + interval);
      nextDate = d.toISOString().slice(0, 10);
    }
    return `$${p.amount}${label}` + (nextDate ? `  |  Next: ${nextDate}` : '');
  }

  function handleEditPattern(merchant, ruleId, current) {
    setEditPattern({ open: true, merchant, ruleId, current });
  }

  async function savePatternChange(ruleId, pattern) {
    if (ruleId) {
      // Update existing rule
      await axios.put(
        `${API_BASE_URL}/recurring_rules/${ruleId}`,
        { recurrence_pattern: pattern },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else if (editPattern.merchant) {
      // Create new rule for this merchant
      await axios.post(`${API_BASE_URL}/recurring_rules`, {
        merchant: editPattern.merchant,
        match_type: 'exact',
        recurrence_pattern: pattern,
      });
    }
    setEditPattern({ open: false, merchant: null, ruleId: null, current: null });
    // Refetch patterns
    const res = await axios.get(`${API_BASE_URL}/recurring/patterns`);
    const map = {};
    (res.data || []).forEach(p => { map[p.merchant] = p; });
    setPatterns(map);
  }

  // Always render the toggle row and FlatList, even if no transactions for the selected pattern
  return (
    <View style={{ flex: 1 }}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, groupBy === 'monthly' && styles.toggleBtnActive]}
          onPress={() => setGroupBy('monthly')}
        >
          <Text style={[styles.toggleText, groupBy === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, groupBy === 'yearly' && styles.toggleBtnActive]}
          onPress={() => setGroupBy('yearly')}
        >
          <Text style={[styles.toggleText, groupBy === 'yearly' && styles.toggleTextActive]}>Yearly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, groupBy === 'weekly' && styles.toggleBtnActive]}
          onPress={() => setGroupBy('weekly')}
        >
          <Text style={[styles.toggleText, groupBy === 'weekly' && styles.toggleTextActive]}>Weekly</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={grouped}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <View style={styles.groupContainer}>
            {groupBy === 'monthly' ? (
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => setExpanded(exp => ({ ...exp, [item.key]: !exp[item.key] }))}
                activeOpacity={0.7}
              >
                <Text style={styles.groupTitle}>{formatMonth(item.txns[0]?.date)}</Text>
                <Text style={styles.groupTotal}>${item.total.toFixed(2)}</Text>
                <Text style={styles.chevron}>{expanded[item.key] ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            ) : groupBy === 'weekly' ? (
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{item.key}</Text>
                <Text style={styles.groupTotal}>${item.total.toFixed(2)}</Text>
              </View>
            ) : (
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{item.key}</Text>
                <Text style={styles.groupTotal}>${item.total.toFixed(2)}</Text>
              </View>
            )}
            {(groupBy === 'yearly' || groupBy === 'weekly' || expanded[item.key]) && (
              <>
                {/* Group by merchant/description within this group */}
                {Object.entries(item.txns.reduce((acc, t) => {
                  const key = t.details || 'Other';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(t);
                  return acc;
                }, {})).map(([merchant, txns]) => (
                  <View key={merchant} style={styles.merchantGroup}>
                    <View style={styles.merchantHeader}>
                      <Text style={styles.merchant}>{merchant}</Text>
                      {getPatternInfo(merchant, txns) && (
                        <Text style={styles.patternInfo}>{getPatternInfo(merchant, txns)}</Text>
                      )}
                      <Pressable onPress={() => handleEditPattern(merchant, patterns[merchant]?.rule_id, patterns[merchant]?.pattern)} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>Edit</Text>
                      </Pressable>
                    </View>
                    {txns.sort((a, b) => new Date(b.date) - new Date(a.date)).map(txn => (
                      <View key={txn.id || txn.transaction_id} style={styles.txnRow}>
                        <Text style={styles.date}>{txn.date?.slice(0, 10)}</Text>
                        <Text style={styles.amount}>${Math.abs(txn.amount).toFixed(2)}</Text>
                        <Text style={styles.category}>{txn.app_category || txn.category || 'Other'}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recurring transactions found for this view.</Text>
          </View>
        }
      />
      <Modal
        visible={editPattern.open}
        transparent
        animationType="fade"
        onRequestClose={() => setEditPattern({ open: false, merchant: null, ruleId: null, current: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Recurrence Pattern</Text>
            {PATTERN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.patternOption, editPattern.current === opt.key && styles.patternOptionSelected]}
                onPress={() => savePatternChange(editPattern.ruleId, opt.key)}
              >
                <Text style={styles.patternOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setEditPattern({ open: false, merchant: null, ruleId: null, current: null })} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#0ea5e9',
  },
  toggleText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  groupContainer: {
    marginBottom: 24,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  chevron: {
    fontSize: 16,
    color: '#94a3b8',
    marginLeft: 8,
  },
  merchantGroup: {
    marginBottom: 8,
    backgroundColor: '#22304a',
    borderRadius: 8,
    padding: 8,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    justifyContent: 'space-between',
  },
  merchant: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#38bdf8',
    flex: 1,
  },
  patternInfo: {
    fontSize: 13,
    color: '#fbbf24',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  date: {
    color: '#cbd5e1',
    width: 90,
  },
  amount: {
    color: '#fbbf24',
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  category: {
    color: '#38bdf8',
    width: 100,
    textAlign: 'right',
  },
  editBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  editBtnText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  patternOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#22304a',
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  patternOptionSelected: {
    backgroundColor: '#0ea5e9',
  },
  patternOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 15,
  },
});