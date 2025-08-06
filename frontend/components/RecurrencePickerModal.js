import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'Does not repeat', icon: 'close-circle-outline' },
  { id: 'daily', label: 'Daily', icon: 'calendar-outline' },
  { id: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
  { id: 'bi-weekly', label: 'Bi-weekly', icon: 'calendar-outline' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
  { id: 'bi-monthly', label: 'Bi-monthly', icon: 'calendar-outline' },
  { id: 'annually', label: 'Annually', icon: 'calendar-outline' },
  { id: 'custom', label: 'Custom', icon: 'settings-outline' }
];

const RecurrencePickerModal = ({ visible, onClose, onSelect, selectedRecurrence = 'none' }) => {
  const [selected, setSelected] = useState(selectedRecurrence);

  const handleSelect = (recurrenceId) => {
    setSelected(recurrenceId);
    onSelect(recurrenceId);
    onClose();
  };

  const getRecurrenceDisplayText = (recurrenceId) => {
    const option = RECURRENCE_OPTIONS.find(opt => opt.id === recurrenceId);
    if (recurrenceId === 'none') return 'Select repeat option';
    if (recurrenceId === 'custom') return 'Custom recurrence';
    return `Repeats Every ${option.label}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select recurrence</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Does not repeat option */}
          <TouchableOpacity
            style={[
              styles.recurrenceOption,
              selected === 'none' && styles.selectedRecurrenceOption
            ]}
            onPress={() => handleSelect('none')}
          >
            <Text style={[
              styles.recurrenceOptionText,
              selected === 'none' && styles.selectedRecurrenceOptionText
            ]}>
              Does not repeat
            </Text>
          </TouchableOpacity>

          {/* Grid of recurrence options */}
          <View style={styles.recurrenceGrid}>
            {RECURRENCE_OPTIONS.slice(1, 7).map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.recurrenceGridOption,
                  selected === option.id && styles.selectedRecurrenceGridOption
                ]}
                onPress={() => handleSelect(option.id)}
              >
                <Text style={[
                  styles.recurrenceGridOptionText,
                  selected === option.id && styles.selectedRecurrenceGridOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom option */}
          <TouchableOpacity
            style={[
              styles.recurrenceOption,
              selected === 'custom' && styles.selectedRecurrenceOption
            ]}
            onPress={() => handleSelect('custom')}
          >
            <Text style={[
              styles.recurrenceOptionText,
              selected === 'custom' && styles.selectedRecurrenceOptionText
            ]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '20%',
    backgroundColor: '#374151',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flex: 1,
  },
  recurrenceOption: {
    backgroundColor: '#4b5563',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  selectedRecurrenceOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  recurrenceOptionText: {
    color: '#d1d5db',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedRecurrenceOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  recurrenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recurrenceGridOption: {
    width: '30%',
    backgroundColor: '#4b5563',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6b7280',
    alignItems: 'center',
  },
  selectedRecurrenceGridOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  recurrenceGridOptionText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedRecurrenceGridOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default RecurrencePickerModal; 