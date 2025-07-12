import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Modal as RNModal, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define your categories grouped by section
const CATEGORY_GROUPS = [
  {
    title: 'Income',
    data: [
      { label: 'Paycheck', value: 'PAYCHECK', icon: 'cash-outline', color: '#22c55e' },
      { label: 'Interest', value: 'INTEREST', icon: 'trending-up-outline', color: '#0ea5e9' },
      { label: 'Business Income', value: 'BUSINESS_INCOME', icon: 'briefcase-outline', color: '#f59e42' },
      { label: 'Other Income', value: 'OTHER_INCOME', icon: 'add-circle-outline', color: '#6366f1' },
    ],
  },
  {
    title: 'Gifts & Donations',
    data: [
      { label: 'Charity', value: 'CHARITY', icon: 'heart-outline', color: '#ef4444' },
      { label: 'Gifts', value: 'GIFTS', icon: 'gift-outline', color: '#a855f7' },
    ],
  },
  {
    title: 'Auto & Transport',
    data: [
      { label: 'Auto Payment', value: 'AUTO_PAYMENT', icon: 'car-outline', color: '#8b5cf6' },
      { label: 'Public Transit', value: 'PUBLIC_TRANSPORT', icon: 'bus-outline', color: '#0ea5e9' },
      { label: 'Gas', value: 'GAS', icon: 'flame-outline', color: '#f59e42' },
      { label: 'Auto Maintenance', value: 'AUTO_MAINTENANCE', icon: 'build-outline', color: '#64748b' },
      { label: 'Parking & Tolls', value: 'PARKING_AND_TOLLS', icon: 'pricetag-outline', color: '#f59e42' },
      { label: 'Taxi & Ride Shares', value: 'TAXI_AND_RIDE_SHARES', icon: 'car-sport-outline', color: '#14b8a6' },
    ],
  },
  {
    title: 'Housing',
    data: [
      { label: 'Mortgage', value: 'MORTGAGE', icon: 'home-outline', color: '#6366f1' },
      { label: 'Rent', value: 'RENT', icon: 'business-outline', color: '#f59e42' },
      { label: 'Home Improvement', value: 'HOME_IMPROVEMENT', icon: 'hammer-outline', color: '#0ea5e9' },
    ],
  },
  {
    title: 'Bills & Utilities',
    data: [
      { label: 'Garbage', value: 'GARBAGE', icon: 'trash-outline', color: '#64748b' },
      { label: 'Water', value: 'WATER', icon: 'water-outline', color: '#0ea5e9' },
      { label: 'Gas & Electric', value: 'GAS_AND_ELECTRIC', icon: 'flash-outline', color: '#f59e42' },
      { label: 'Internet & Cable', value: 'INTERNET_AND_CABLE', icon: 'wifi-outline', color: '#6366f1' },
      { label: 'Phone', value: 'PHONE', icon: 'call-outline', color: '#22c55e' },
    ],
  },
  {
    title: 'Food & Dining',
    data: [
      { label: 'Groceries', value: 'GROCERIES', icon: 'cart-outline', color: '#22c55e' },
      { label: 'Restaurants & Bars', value: 'RESTAURANTS_AND_BARS', icon: 'wine-outline', color: '#f59e42' },
      { label: 'Coffee Shops', value: 'COFFEE_SHOPS', icon: 'cafe-outline', color: '#8b5cf6' },
    ],
  },
  {
    title: 'Travel & Lifestyle',
    data: [
      { label: 'Travel & Vacation', value: 'TRAVEL_AND_VACATION', icon: 'airplane-outline', color: '#14b8a6' },
      { label: 'Entertainment & Recreation', value: 'ENTERTAINMENT_AND_RECREATION', icon: 'film-outline', color: '#ec4899' },
      { label: 'Personal', value: 'PERSONAL', icon: 'person-outline', color: '#f43f5e' },
      { label: 'Pets', value: 'PETS', icon: 'paw-outline', color: '#f59e42' },
      { label: 'Fun Money', value: 'FUN_MONEY', icon: 'happy-outline', color: '#22c55e' },
    ],
  },
  {
    title: 'Shopping',
    data: [
      { label: 'Shopping', value: 'SHOPPING', icon: 'bag-outline', color: '#f59e42' },
      { label: 'Clothing', value: 'CLOTHING', icon: 'shirt-outline', color: '#6366f1' },
      { label: 'Furniture & Housewares', value: 'FURNITURE_AND_HOUSEWARES', icon: 'bed-outline', color: '#a855f7' },
      { label: 'Electronics', value: 'ELECTRONICS', icon: 'phone-portrait-outline', color: '#0ea5e9' },
    ],
  },
  {
    title: 'Children',
    data: [
      { label: 'Child Care', value: 'CHILD_CARE', icon: 'baby-outline', color: '#f59e42' },
      { label: 'Child Activities', value: 'CHILD_ACTIVITIES', icon: 'game-controller-outline', color: '#22c55e' },
    ],
  },
  {
    title: 'Education',
    data: [
      { label: 'Student Loans', value: 'STUDENT_LOANS', icon: 'school-outline', color: '#6366f1' },
      { label: 'Education', value: 'EDUCATION', icon: 'book-outline', color: '#0ea5e9' },
    ],
  },
  {
    title: 'Health & Wellness',
    data: [
      { label: 'Medical', value: 'MEDICAL', icon: 'medkit-outline', color: '#ef4444' },
      { label: 'Dentist', value: 'DENTIST', icon: 'medkit-outline', color: '#f59e42' },
      { label: 'Fitness', value: 'FITNESS', icon: 'barbell-outline', color: '#22c55e' },
    ],
  },
  {
    title: 'Financial',
    data: [
      { label: 'Loan Repayment', value: 'LOAN_REPAYMENT', icon: 'cash-outline', color: '#6366f1' },
      { label: 'Financial & Legal Services', value: 'FINANCIAL_AND_LEGAL_SERVICES', icon: 'briefcase-outline', color: '#0ea5e9' },
      { label: 'Financial Fees', value: 'FINANCIAL_FEES', icon: 'card-outline', color: '#f59e42' },
      { label: 'Cash & ATM', value: 'CASH_AND_ATM', icon: 'cash-outline', color: '#22c55e' },
      { label: 'Insurance', value: 'INSURANCE', icon: 'shield-checkmark-outline', color: '#a855f7' },
      { label: 'Taxes', value: 'TAXES', icon: 'receipt-outline', color: '#f59e42' },
    ],
  },
  {
    title: 'Other',
    data: [
      { label: 'Uncategorized', value: 'UNCATEGORIZED', icon: 'help-circle-outline', color: '#64748b' },
      { label: 'Check', value: 'CHECK', icon: 'checkmark-done-outline', color: '#22c55e' },
      { label: 'Miscellaneous', value: 'MISCELLANEOUS', icon: 'ellipsis-horizontal-outline', color: '#a3a3a3' },
    ],
  },
  {
    title: 'Business',
    data: [
      { label: 'Advertising & Promotion', value: 'ADVERTISING_AND_PROMOTION', icon: 'megaphone-outline', color: '#f59e42' },
      { label: 'Business Utilities & Communication', value: 'BUSINESS_UTILITIES_AND_COMMUNICATION', icon: 'call-outline', color: '#0ea5e9' },
      { label: 'Employee Wages & Contract Labor', value: 'EMPLOYEE_WAGES_AND_CONTRACT_LABOR', icon: 'people-outline', color: '#22c55e' },
      { label: 'Business Travel & Meals', value: 'BUSINESS_TRAVEL_AND_MEALS', icon: 'airplane-outline', color: '#14b8a6' },
      { label: 'Business Auto Expenses', value: 'BUSINESS_AUTO_EXPENSES', icon: 'car-outline', color: '#8b5cf6' },
      { label: 'Business Insurance', value: 'BUSINESS_INSURANCE', icon: 'shield-checkmark-outline', color: '#a855f7' },
      { label: 'Office Supplies & Expenses', value: 'OFFICE_SUPPLIES_AND_EXPENSES', icon: 'document-text-outline', color: '#0ea5e9' },
      { label: 'Office Rent', value: 'OFFICE_RENT', icon: 'business-outline', color: '#f59e42' },
      { label: 'Postage & Shipping', value: 'POSTAGE_AND_SHIPPING', icon: 'mail-outline', color: '#6366f1' },
    ],
  },
  {
    title: 'Transfers',
    data: [
      { label: 'Transfer', value: 'TRANSFER', icon: 'swap-horizontal-outline', color: '#0ea5e9' },
      { label: 'Credit Card Payment', value: 'CREDIT_CARD_PAYMENT', icon: 'card-outline', color: '#f59e42' },
      { label: 'Balance Adjustments', value: 'BALANCE_ADJUSTMENTS', icon: 'trending-up-outline', color: '#22c55e' },
    ],
  },
];

export default function CategoryPickerModal({
  visible,
  selectedCategories = [],
  onClose,
  onApply,
  multiSelect = true,
}) {
  const [selected, setSelected] = useState(selectedCategories);
  const [search, setSearch] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("add-circle-outline");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [selectedIcon, setSelectedIcon] = useState("add-circle-outline");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [parentCategory, setParentCategory] = useState('');
  const [parentDropdownVisible, setParentDropdownVisible] = useState(false);
  const [showParentCreateModal, setShowParentCreateModal] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [newParentIcon, setNewParentIcon] = useState("add-circle-outline");
  const [newParentColor, setNewParentColor] = useState("#6366f1");
  const [expandedParents, setExpandedParents] = useState([]);

  // Available icons and colors for custom categories
  const availableIcons = [
    'add-circle-outline', 'star-outline', 'heart-outline', 'bookmark-outline',
    'flag-outline', 'ribbon-outline', 'trophy-outline', 'medal-outline',
    'diamond-outline', 'sparkles-outline', 'flash-outline', 'thunderstorm-outline',
    'leaf-outline', 'flower-outline', 'paw-outline', 'fish-outline',
    'car-outline', 'bicycle-outline', 'airplane-outline', 'boat-outline',
    'home-outline', 'business-outline', 'school-outline', 'library-outline',
    'restaurant-outline', 'cafe-outline', 'pizza-outline', 'wine-outline',
    'fitness-outline', 'barbell-outline', 'football-outline', 'basketball-outline',
    'game-controller-outline', 'musical-notes-outline', 'film-outline', 'tv-outline',
    'phone-outline', 'laptop-outline', 'tablet-portrait-outline', 'watch-outline',
    'camera-outline', 'images-outline', 'videocam-outline', 'mic-outline',
    'gift-outline', 'card-outline', 'wallet-outline', 'cash-outline',
    'trending-up-outline', 'trending-down-outline', 'analytics-outline', 'pie-chart-outline',
    'settings-outline', 'options-outline', 'construct-outline', 'hammer-outline',
    'build-outline', 'brush-outline', 'color-palette-outline', 'color-wand-outline'
  ];

  const availableColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
    '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#64748b', '#6b7280'
  ];

  useEffect(() => {
    setSelected(selectedCategories);
  }, [selectedCategories, visible]);

  // Load custom categories from AsyncStorage
  useEffect(() => {
    loadCustomCategories();
  }, []);

  // Save custom categories to AsyncStorage when they change
  useEffect(() => {
    saveCustomCategories();
  }, [customCategories]);

  const loadCustomCategories = async () => {
    try {
      const saved = await AsyncStorage.getItem('customCategories');
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  const saveCustomCategories = async () => {
    try {
      await AsyncStorage.setItem('customCategories', JSON.stringify(customCategories));
    } catch (error) {
      console.error('Error saving custom categories:', error);
    }
  };

  const toggleCategory = (cat) => {
    if (multiSelect) {
      setSelected((prev) =>
        prev.some(c => c.value === cat.value)
          ? prev.filter((c) => c.value !== cat.value)
          : [...prev, cat]
      );
    } else {
      setSelected((prev) =>
        prev.some(c => c.value === cat.value) ? [] : [cat]
      );
    }
  };

  const handleApply = () => {
    onApply(selected);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Check if category already exists
    const allCategories = [...CATEGORY_GROUPS.flatMap(group => group.data), ...customCategories];
    const exists = allCategories.some(cat => (cat.label || cat.key || '').toLowerCase() === newCategoryName.trim().toLowerCase());
    
    if (exists) {
      Alert.alert('Error', 'A category with this name already exists');
      return;
    }

    const newCategory = {
      label: newCategoryName.trim(),
      value: newCategoryIcon, // This will be the Plaid code
      icon: selectedIcon,
      color: selectedColor,
      isCustom: true,
      parent: parentCategory || null,
    };

    setCustomCategories(prev => [...prev, newCategory]);
    setNewCategoryName("");
    setSelectedIcon("add-circle-outline");
    setSelectedColor("#6366f1");
    setParentCategory('');
    setShowCreateModal(false);
  };

  const handleDeleteCustomCategory = (categoryKey) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this custom category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCustomCategories(prev => prev.filter(cat => cat.value !== categoryKey));
            // Remove from selected if it was selected
            setSelected(prev => prev.filter(cat => cat.value !== categoryKey));
          }
        }
      ]
    );
  };

  // Filtered groups based on search
  const filteredGroups = CATEGORY_GROUPS.map(group => ({
    ...group,
    data: group.data.filter(cat =>
      (cat.label || cat.key || '').toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.data.length > 0);

  // Add custom categories group
  const filteredCustomCategories = customCategories.filter(cat =>
    (cat.label || cat.key || '').toLowerCase().includes(search.toLowerCase())
  );

  const allGroups = [
    ...filteredGroups,
    ...(filteredCustomCategories.length > 0 ? [{
      title: 'Custom Categories',
      data: filteredCustomCategories
    }] : [])
  ];

  // Add new parent category
  const handleCreateParentCategory = () => {
    if (!newParentName.trim()) {
      Alert.alert('Error', 'Please enter a parent category name');
      return;
    }
    // Check if parent already exists
    const allCategories = [...CATEGORY_GROUPS.flatMap(group => group.data), ...customCategories.filter(cat => !cat.parent)];
    const exists = allCategories.some(cat => (cat.label || cat.key || '').toLowerCase() === newParentName.trim().toLowerCase());
    if (exists) {
      Alert.alert('Error', 'A parent category with this name already exists');
      return;
    }
    const newParent = {
      label: newParentName.trim(),
      value: newParentIcon, // This will be the Plaid code
      icon: newParentIcon,
      color: newParentColor,
      isCustom: true,
      parent: null,
    };
    setCustomCategories(prev => [...prev, newParent]);
    setParentCategory(newParent.value);
    setNewParentName("");
    setNewParentIcon("add-circle-outline");
    setNewParentColor("#6366f1");
    setShowParentCreateModal(false);
    setParentDropdownVisible(false);
  };

  // Helper: get subcategories for a parent
  const getSubcategories = (parentValue) => customCategories.filter(cat => cat.parent === parentValue);

  // Toggle expand/collapse for a parent
  const toggleExpandParent = (parentValue) => {
    setExpandedParents((prev) =>
      prev.includes(parentValue)
        ? prev.filter(key => key !== parentValue)
        : [...prev, parentValue]
    );
  };

  // Render parent and its subcategories as cards if expanded
  const renderCategoryRowCollapsible = (cat) => {
    const subcats = getSubcategories(cat.value);
    const isExpanded = expandedParents.includes(cat.value);
    const hasChildren = subcats.length > 0;
    return [
      <TouchableOpacity
        key={cat.value}
        style={[styles.parentCard, styles.cardShadow]}
        onPress={() => {
          if (hasChildren) {
            toggleExpandParent(cat.value);
          } else {
            toggleCategory(cat);
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons
          name={cat.icon}
          size={22}
          color={cat.color}
          style={{ marginRight: 12 }}
        />
        <Text style={styles.catLabel}>{(cat.label || cat.key || '')}</Text>
        <View style={styles.spacer} />
        {hasChildren && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#888"
            style={{ marginRight: 8 }}
          />
        )}
        {selected.some(c => c.value === cat.value) && !hasChildren && (
          <Ionicons name="checkmark-circle" size={22} color="#f59e42" />
        )}
        {cat.isCustom && (
          <TouchableOpacity
            onPress={() => handleDeleteCustomCategory(cat.value)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>,
      isExpanded && hasChildren && subcats.map(sub => (
        <TouchableOpacity
          key={sub.value}
          style={[styles.subCard, styles.cardShadow]}
          onPress={() => toggleCategory(sub)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={sub.icon}
            size={22}
            color={sub.color}
            style={{ marginRight: 12, marginLeft: 12 }}
          />
          <Text style={[styles.catLabel, styles.subCatLabel]}>{(sub.label || sub.key || '')}</Text>
          <View style={styles.spacer} />
          {selected.some(c => c.value === sub.value) && (
            <Ionicons name="checkmark-circle" size={22} color="#f59e42" />
          )}
          {sub.isCustom && (
            <TouchableOpacity
              onPress={() => handleDeleteCustomCategory(sub.value)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))
    ];
  };

  // Render all groups with collapsible parents
  const renderAllGroupsCollapsible = () =>
    allGroups.map((group) => (
      <View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.data.map((cat) =>
          !cat.parent && renderCategoryRowCollapsible(cat)
        )}
      </View>
    ));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Category</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#222" />
          </TouchableOpacity>
        </View>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />
        </View>
        <ScrollView>
          {renderAllGroupsCollapsible()}
          
          {/* Add Custom Category Button */}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#0ea5e9" />
            <Text style={styles.addCategoryText}>Add Custom Category</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSelected([])}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Category Creation Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContentFixed}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>Create Custom Category</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#222" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createModalBody} contentContainerStyle={{paddingBottom: 20}}>
              {/* Parent Category Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parent Category (optional)</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setParentDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {parentCategory
                      ? ([...CATEGORY_GROUPS.flatMap(group => group.data), ...customCategories.filter(cat => !cat.parent)].find(cat => cat.value === parentCategory)?.label || parentCategory)
                      : 'None'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#222" style={{marginLeft: 8}} />
                </TouchableOpacity>
                {/* Dropdown Modal */}
                <RNModal
                  visible={parentDropdownVisible}
                  animationType="fade"
                  transparent={true}
                  onRequestClose={() => setParentDropdownVisible(false)}
                >
                  <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setParentDropdownVisible(false)}>
                    <View style={styles.dropdownListContainerScrollable}>
                      <ScrollView style={{maxHeight: 400}}>
                        <TouchableOpacity
                          style={[styles.parentOption, parentCategory === '' && styles.selectedParentOption]}
                          onPress={() => { setParentCategory(''); setParentDropdownVisible(false); }}
                        >
                          <Text style={{color: parentCategory === '' ? '#0ea5e9' : '#222'}}>None</Text>
                        </TouchableOpacity>
                        {[
                          ...CATEGORY_GROUPS.flatMap(group => group.data),
                          ...customCategories.filter(cat => !cat.parent)
                        ].map(cat => (
                          <TouchableOpacity
                            key={cat.value}
                            style={[styles.parentOption, parentCategory === cat.value && styles.selectedParentOption]}
                            onPress={() => { setParentCategory(cat.value); setParentDropdownVisible(false); }}
                          >
                            <Ionicons name={cat.icon} size={20} color={cat.color} style={{marginRight:8}} />
                            <Text style={{color: parentCategory === cat.value ? '#0ea5e9' : '#222', fontSize:16}}>{cat.label || cat.key || ''}</Text>
                          </TouchableOpacity>
                        ))}
                        {/* Always show Add New Parent Category at the end */}
                        <TouchableOpacity
                          style={styles.addParentButton}
                          onPress={() => { setShowParentCreateModal(true); setParentDropdownVisible(false); }}
                        >
                          <Ionicons name="add-circle-outline" size={20} color="#0ea5e9" style={{marginRight:8}} />
                          <Text style={{color:'#0ea5e9', fontWeight:'bold'}}>+ Add New Parent Category</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </RNModal>
              </View>

              {/* Category Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name..."
                  placeholderTextColor="#aaa"
                  autoFocus={true}
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScrollView}>
                  {availableIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        selectedIcon === icon && styles.selectedIconOption
                      ]}
                      onPress={() => setSelectedIcon(icon)}
                    >
                      <Ionicons
                        name={icon}
                        size={24}
                        color={selectedIcon === icon ? '#fff' : '#666'}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Color Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Color</Text>
                <View style={styles.colorGrid}>
                  {availableColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColorOption
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.inputLabel}>Preview</Text>
                <View style={styles.previewRow}>
                  <Ionicons
                    name={selectedIcon}
                    size={22}
                    color={selectedColor}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={styles.previewText}>
                    {(newCategoryName || 'Category Name')}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.createModalFooterFixed}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCategory}
              >
                <Text style={styles.createButtonText}>Create Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mini-modal for creating parent category */}
      <RNModal
        visible={showParentCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParentCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContentFixed}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>Add Parent Category</Text>
              <TouchableOpacity onPress={() => setShowParentCreateModal(false)}>
                <Ionicons name="close" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parent Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={newParentName}
                onChangeText={setNewParentName}
                placeholder="Enter parent category name..."
                placeholderTextColor="#aaa"
                autoFocus={true}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScrollView}>
                {availableIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      newParentIcon === icon && styles.selectedIconOption
                    ]}
                    onPress={() => setNewParentIcon(icon)}
                  >
                    <Ionicons
                      name={icon}
                      size={24}
                      color={newParentIcon === icon ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Color</Text>
              <View style={styles.colorGrid}>
                {availableColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newParentColor === color && styles.selectedColorOption
                    ]}
                    onPress={() => setNewParentColor(color)}
                  >
                    {newParentColor === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.createModalFooterFixed}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowParentCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateParentCategory}
              >
                <Text style={styles.createButtonText}>Create Parent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  group: { marginTop: 18, paddingHorizontal: 16 },
  groupTitle: { fontWeight: 'bold', color: '#888', marginBottom: 6, fontSize: 13 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  catLabel: { fontSize: 16, color: '#222' },
  spacer: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  clearBtn: { backgroundColor: '#f3f3f3', borderRadius: 8, padding: 12, flex: 1, marginRight: 8, alignItems: 'center' },
  clearBtnText: { color: '#222', fontWeight: 'bold' },
  applyBtn: { backgroundColor: '#f59e42', borderRadius: 8, padding: 12, flex: 1, marginLeft: 8, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addCategoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContentFixed: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    height: '90%',
    maxHeight: '90%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  createModalBody: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    padding: 10,
  },
  iconScrollView: {
    flexDirection: 'row',
  },
  iconOption: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 5,
  },
  selectedIconOption: {
    borderColor: '#0ea5e9',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: '20%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  previewContainer: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 16,
    color: '#222',
  },
  createModalFooterFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#f3f3f3',
    borderRadius: 5,
    padding: 10,
    flex: 1,
    marginRight: 5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  createButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 5,
    padding: 10,
    flex: 1,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#f3f3f3',
  },
  selectedParentOption: {
    borderColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  parentList: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    marginVertical: 4,
    maxHeight: 180,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#f3f3f3',
    marginTop: 4,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownListContainerScrollable: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: '80%',
    maxHeight: 420,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subCatRow: {
    paddingLeft: 24,
    backgroundColor: '#fafafa',
  },
  subCatLabel: {
    color: '#666',
    fontSize: 15,
  },
  parentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 32,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
}); 