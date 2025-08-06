// Category mapping from Plaid categories to app categories
const CATEGORY_MAPPING = {
  // Income Categories
  'INCOME': 'Paycheck',
  'TRANSFER_IN': 'Paycheck',
  'PAYROLL': 'Paycheck',
  'INTEREST': 'Interest',
  'DIVIDEND': 'Interest',
  'BUSINESS_INCOME': 'Business Income',
  'RENTAL_INCOME': 'Business Income',
  'INVESTMENT_INCOME': 'Interest',
  'OTHER_INCOME': 'Other Income',

  // Food & Dining
  'FOOD_AND_DRINK': 'Groceries',
  'RESTAURANTS': 'Restaurants & Bars',
  'FAST_FOOD': 'Restaurants & Bars',
  'COFFEE_SHOP': 'Coffee Shops',
  'GROCERIES': 'Groceries',
  'FOOD_DELIVERY': 'Restaurants & Bars',
  'ALCOHOL_AND_BARS': 'Restaurants & Bars',

  // Shopping
  'SHOPPING': 'Shopping',
  'ONLINE_SHOPPING': 'Shopping',
  'CLOTHING_AND_ACCESSORIES': 'Clothing',
  'ELECTRONICS': 'Electronics',
  'HOME_AND_GARDEN': 'Furniture & Housewares',
  'FURNITURE': 'Furniture & Housewares',
  'BOOKS_AND_MEDIA': 'Shopping',
  'SPORTING_GOODS': 'Shopping',
  'JEWELRY_AND_WATCHES': 'Shopping',
  'BEAUTY_AND_COSMETICS': 'Shopping',

  // Auto & Transport
  'AUTO_AND_TRANSPORT': 'Auto Payment',
  'GAS_STATIONS': 'Gas',
  'PUBLIC_TRANSPORTATION': 'Public Transit',
  'TAXI': 'Taxi & Ride Shares',
  'RIDE_SHARE': 'Taxi & Ride Shares',
  'PARKING': 'Parking & Tolls',
  'TOLLS': 'Parking & Tolls',
  'AUTO_MAINTENANCE': 'Auto Maintenance',
  'AUTO_INSURANCE': 'Auto Payment',

  // Housing
  'HOME_IMPROVEMENT': 'Home Improvement',
  'MORTGAGE': 'Mortgage',
  'RENT_AND_UTILITIES': 'Rent',
  'REAL_ESTATE': 'Home Improvement',
  'HOME_SERVICES': 'Home Improvement',

  // Bills & Utilities
  'BILLS_AND_UTILITIES': 'Gas & Electric',
  'UTILITIES': 'Gas & Electric',
  'INTERNET_AND_CABLE': 'Internet & Cable',
  'PHONE': 'Phone',
  'WATER': 'Water',
  'GARBAGE': 'Garbage',
  'ELECTRICITY': 'Gas & Electric',
  'GAS': 'Gas & Electric',

  // Travel & Lifestyle
  'TRAVEL': 'Travel & Vacation',
  'HOTELS_AND_ACCOMMODATION': 'Travel & Vacation',
  'AIR_TRAVEL': 'Travel & Vacation',
  'ENTERTAINMENT': 'Entertainment & Recreation',
  'MOVIES_AND_TV': 'Entertainment & Recreation',
  'MUSIC': 'Entertainment & Recreation',
  'GAMING': 'Entertainment & Recreation',
  'SPORTS': 'Entertainment & Recreation',
  'FITNESS': 'Fitness',
  'PETS': 'Pets',
  'PERSONAL_CARE': 'Personal',

  // Health & Wellness
  'MEDICAL': 'Medical',
  'HEALTHCARE': 'Medical',
  'DENTIST': 'Dentist',
  'PHARMACY': 'Medical',
  'VETERINARY': 'Pets',

  // Financial
  'LOAN_PAYMENT': 'Loan Repayment',
  'CREDIT_CARD_PAYMENT': 'Credit Card Payment',
  'STUDENT_LOAN': 'Student Loans',
  'INSURANCE': 'Insurance',
  'BANK_FEES': 'Financial Fees',
  'ATM_FEES': 'Financial Fees',
  'OVERDRAFT_FEES': 'Financial Fees',
  'TAXES': 'Taxes',
  'LEGAL_SERVICES': 'Financial & Legal Services',

  // Education
  'EDUCATION': 'Education',
  'TUITION': 'Education',
  'STUDENT_LOAN_PAYMENT': 'Student Loans',

  // Children
  'CHILD_CARE': 'Child Care',
  'CHILD_ACTIVITIES': 'Child Activities',

  // Gifts & Donations
  'GIFTS': 'Gifts',
  'CHARITY': 'Charity',
  'DONATIONS': 'Charity',

  // Business
  'BUSINESS_SERVICES': 'Financial & Legal Services',
  'ADVERTISING': 'Advertising & Promotion',
  'OFFICE_SUPPLIES': 'Office Supplies & Expenses',
  'BUSINESS_TRAVEL': 'Business Travel & Meals',
  'BUSINESS_MEALS': 'Business Travel & Meals',
  'BUSINESS_AUTO': 'Business Auto Expenses',
  'BUSINESS_INSURANCE': 'Business Insurance',
  'BUSINESS_UTILITIES': 'Business Utilities & Communication',
  'EMPLOYEE_WAGES': 'Employee Wages & Contract Labor',
  'CONTRACT_LABOR': 'Employee Wages & Contract Labor',
  'OFFICE_RENT': 'Office Rent',
  'POSTAGE_AND_SHIPPING': 'Postage & Shipping',

  // Transfers
  'TRANSFER': 'Transfer',
  'TRANSFER_OUT': 'Transfer',
  'CREDIT_CARD_PAYMENT': 'Credit Card Payment',
  'BALANCE_TRANSFER': 'Balance Adjustments',

  // Cash & ATM
  'CASH_AND_ATM': 'Cash & ATM',
  'ATM_WITHDRAWAL': 'Cash & ATM',
  'CASH_ADVANCE': 'Cash & ATM',

  // Miscellaneous
  'MISCELLANEOUS': 'Miscellaneous',
  'UNCATEGORIZED': 'Uncategorized',
  'CHECK': 'Check',
  'DEPOSIT': 'Paycheck',
  'WITHDRAWAL': 'Cash & ATM',
  'PAYMENT': 'Miscellaneous',
  'SERVICE': 'Miscellaneous',
  'SUBSCRIPTION': 'Miscellaneous',
  'MEMBERSHIP': 'Miscellaneous',
  'LICENSE': 'Miscellaneous',
  'FINE': 'Miscellaneous',
  'PENALTY': 'Miscellaneous',
  'FEE': 'Financial Fees',
  'COMMISSION': 'Miscellaneous',
  'REFUND': 'Miscellaneous',
  'REIMBURSEMENT': 'Miscellaneous',
  'ADJUSTMENT': 'Balance Adjustments',
  'CORRECTION': 'Balance Adjustments',
  'ERROR': 'Miscellaneous',
  'UNKNOWN': 'Uncategorized',
};

// Default category for unmapped Plaid categories
const DEFAULT_CATEGORY = 'Miscellaneous';

/**
 * Map a Plaid category to an app category
 * @param {string} plaidCategory - The category from Plaid
 * @returns {string} - The mapped app category
 */
function mapPlaidCategoryToAppCategory(plaidCategory) {
  if (!plaidCategory) return DEFAULT_CATEGORY;
  
  // Convert to uppercase for consistent matching
  const upperCategory = plaidCategory.toUpperCase();
  
  // Direct mapping
  if (CATEGORY_MAPPING[upperCategory]) {
    return CATEGORY_MAPPING[upperCategory];
  }
  
  // Partial matching for categories that might have variations
  for (const [plaidKey, appCategory] of Object.entries(CATEGORY_MAPPING)) {
    if (upperCategory.includes(plaidKey) || plaidKey.includes(upperCategory)) {
      return appCategory;
    }
  }
  
  // If no match found, return default
  console.log(`No mapping found for Plaid category: ${plaidCategory}, using default: ${DEFAULT_CATEGORY}`);
  return DEFAULT_CATEGORY;
}

/**
 * Get all available app categories
 * @returns {string[]} - Array of app category names
 */
function getAppCategories() {
  return [...new Set(Object.values(CATEGORY_MAPPING))];
}

/**
 * Get all Plaid categories that map to a specific app category
 * @param {string} appCategory - The app category to find mappings for
 * @returns {string[]} - Array of Plaid categories that map to the app category
 */
function getPlaidCategoriesForAppCategory(appCategory) {
  return Object.entries(CATEGORY_MAPPING)
    .filter(([_, mappedCategory]) => mappedCategory === appCategory)
    .map(([plaidCategory, _]) => plaidCategory);
}

module.exports = {
  CATEGORY_MAPPING,
  DEFAULT_CATEGORY,
  mapPlaidCategoryToAppCategory,
  getAppCategories,
  getPlaidCategoriesForAppCategory
}; 