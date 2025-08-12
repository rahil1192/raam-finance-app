import { categoryService } from '../services/api';

// Default icon mappings as fallback
const DEFAULT_ICONS = {
  'Transfers': 'swap-horizontal-outline',
  'Transfer': 'swap-horizontal-outline',
  'Food & Dining': 'restaurant-outline',
  'Restaurants & Bars': 'wine-outline',
  'Coffee Shops': 'cafe-outline',
  'Groceries': 'basket-outline',
  'Shopping': 'cart-outline',
  'Clothing': 'shirt-outline',
  'Travel & Vacation': 'airplane-outline',
  'Gas': 'car-sport-outline',
  'Entertainment & Recreation': 'film-outline',
  'Medical': 'medkit-outline',
  'Dentist': 'medkit-outline',
  'Fitness': 'barbell-outline',
  'Insurance': 'shield-checkmark-outline',
  'Loan Repayment': 'cash-outline',
  'Credit Card Payment': 'card-outline',
  'Student Loans': 'school-outline',
  'Business Income': 'briefcase-outline',
  'Paycheck': 'cash-outline',
  'Interest': 'trending-up-outline',
  'Charity': 'heart-outline',
  'Gifts': 'gift-outline',
  'Pets': 'paw-outline',
  'Child Care': 'happy-outline',
  'Education': 'school-outline',
  'Home Improvement': 'home-outline',
  'Rent': 'home-outline',
  'Mortgage': 'home-outline',
  'Water': 'water-outline',
  'Gas & Electric': 'flash-outline',
  'Internet & Cable': 'wifi-outline',
  'Phone': 'call-outline',
  'Cash & ATM': 'cash-outline',
  'Financial & Legal Services': 'briefcase-outline',
  'Other': 'ellipsis-horizontal-outline',
};

// Default color mappings as fallback
const DEFAULT_COLORS = {
  'Transfers': '#8b5cf6',
  'Transfer': '#8b5cf6',
  'Food & Dining': '#22c55e',
  'Restaurants & Bars': '#f59e0b',
  'Coffee Shops': '#b45309',
  'Groceries': '#84cc16',
  'Shopping': '#f59e0b',
  'Clothing': '#f472b6',
  'Travel & Vacation': '#14b8a6',
  'Gas': '#fbbf24',
  'Entertainment & Recreation': '#ec4899',
  'Medical': '#ef4444',
  'Dentist': '#f87171',
  'Fitness': '#10b981',
  'Insurance': '#6366f1',
  'Loan Repayment': '#a855f7',
  'Credit Card Payment': '#eab308',
  'Student Loans': '#6366f1',
  'Business Income': '#06b6d4',
  'Paycheck': '#22d3ee',
  'Interest': '#0ea5e9',
  'Charity': '#f43f5e',
  'Gifts': '#a855f7',
  'Pets': '#fbbf24',
  'Child Care': '#f472b6',
  'Education': '#6366f1',
  'Home Improvement': '#f59e42',
  'Rent': '#f59e42',
  'Mortgage': '#f59e42',
  'Water': '#38bdf8',
  'Gas & Electric': '#fde68a',
  'Internet & Cable': '#818cf8',
  'Phone': '#818cf8',
  'Cash & ATM': '#fbbf24',
  'Financial & Legal Services': '#06b6d4',
  'Other': '#64748b',
};

// Cache for backend category data
let categoryCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get category icon from backend or fallback to default
 * @param {string} category - Category name
 * @returns {string} Icon name
 */
export const getCategoryIcon = async (category) => {
  try {
    // Try to get from backend cache first
    const backendIcon = await getCategoryIconFromBackend(category);
    if (backendIcon) {
      return backendIcon;
    }
  } catch (error) {
    console.log('Using default icon for category:', category);
  }
  
  // Fallback to default icon
  return DEFAULT_ICONS[category] || DEFAULT_ICONS['Other'];
};

/**
 * Get category color from backend or fallback to default
 * @param {string} category - Category name
 * @returns {string} Color hex code
 */
export const getCategoryColor = async (category) => {
  try {
    // Try to get from backend cache first
    const backendColor = await getCategoryColorFromBackend(category);
    if (backendColor) {
      return backendColor;
    }
  } catch (error) {
    console.log('Using default color for category:', category);
  }
  
  // Fallback to default color
  return DEFAULT_COLORS[category] || DEFAULT_COLORS['Other'];
};

/**
 * Get category icon synchronously (for immediate use)
 * @param {string} category - Category name
 * @returns {string} Icon name
 */
export const getCategoryIconSync = (category) => {
  return DEFAULT_ICONS[category] || DEFAULT_ICONS['Other'];
};

/**
 * Get category color synchronously (for immediate use)
 * @param {string} category - Category name
 * @returns {string} Color hex code
 */
export const getCategoryColorSync = (category) => {
  return DEFAULT_COLORS[category] || DEFAULT_COLORS['Other'];
};

/**
 * Fetch category data from backend and cache it
 * @returns {Promise<Array>} Array of categories with icons and colors
 */
const fetchCategoriesFromBackend = async () => {
  try {
    const categories = await categoryService.getCategoriesWithIcons();
    categoryCache = categories;
    lastFetchTime = Date.now();
    return categories;
  } catch (error) {
    console.error('Failed to fetch categories from backend:', error);
    return null;
  }
};

/**
 * Get category icon from backend cache
 * @param {string} category - Category name
 * @returns {Promise<string|null>} Icon name or null if not found
 */
const getCategoryIconFromBackend = async (category) => {
  // Check if cache is valid
  if (!categoryCache || (Date.now() - lastFetchTime) > CACHE_DURATION) {
    await fetchCategoriesFromBackend();
  }
  
  if (categoryCache) {
    const categoryData = categoryCache.find(cat => cat.name === category);
    return categoryData?.icon || null;
  }
  
  return null;
};

/**
 * Get category color from backend cache
 * @param {string} category - Category name
 * @returns {Promise<string|null>} Color hex code or null if not found
 */
const getCategoryColorFromBackend = async (category) => {
  // Check if cache is valid
  if (!categoryCache || (Date.now() - lastFetchTime) > CACHE_DURATION) {
    await fetchCategoriesFromBackend();
  }
  
  if (categoryCache) {
    const categoryData = categoryCache.find(cat => cat.name === category);
    return categoryData?.color || null;
  }
  
  return null;
};

/**
 * Preload category data from backend
 * @returns {Promise<void>}
 */
export const preloadCategories = async () => {
  try {
    await fetchCategoriesFromBackend();
  } catch (error) {
    console.error('Failed to preload categories:', error);
  }
};

/**
 * Clear category cache (useful for testing or forcing refresh)
 */
export const clearCategoryCache = () => {
  categoryCache = null;
  lastFetchTime = 0;
}; 