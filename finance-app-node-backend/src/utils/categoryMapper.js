const { CategoryMapping, MerchantCategoryRule } = require('../models');

/**
 * Maps a Plaid personal finance category to an app category using the database
 * @param {Object} personalFinanceCategory - The personal finance category object from Plaid
 * @param {string} personalFinanceCategory.primary - Primary category (e.g., "FOOD_AND_DRINK")
 * @param {string} personalFinanceCategory.detailed - Detailed category (e.g., "FOOD_AND_DRINK_RESTAURANT")
 * @returns {Promise<string>} The mapped app category
 */
async function mapPersonalFinanceCategory(personalFinanceCategory) {
  if (!personalFinanceCategory) {
    return 'Miscellaneous';
  }

  const { primary, detailed } = personalFinanceCategory;

  try {
    // First, try to find a mapping for the detailed category
    if (detailed) {
      const detailedMapping = await CategoryMapping.findOne({
        where: {
          personal_finance_detailed: detailed,
          is_active: true
        }
      });

      if (detailedMapping) {
        return detailedMapping.app_category;
      }
    }

    // If no detailed mapping found, try the primary category
    if (primary) {
      const primaryMapping = await CategoryMapping.findOne({
        where: {
          personal_finance_primary: primary,
          personal_finance_detailed: null, // Only primary, no detailed
          is_active: true
        }
      });

      if (primaryMapping) {
        return primaryMapping.app_category;
      }
    }

    // If no mapping found, return default
    return 'Miscellaneous';
  } catch (error) {
    console.error('Error mapping personal finance category:', error);
    return 'Miscellaneous';
  }
}

/**
 * Maps a traditional Plaid category to an app category using the database
 * @param {string} plaidCategory - The traditional Plaid category
 * @returns {Promise<string>} The mapped app category
 */
async function mapPlaidCategory(plaidCategory) {
  if (!plaidCategory) {
    return 'Miscellaneous';
  }

  try {
    const mapping = await CategoryMapping.findOne({
      where: {
        plaid_category: plaidCategory,
        is_active: true
      }
    });

    return mapping ? mapping.app_category : 'Miscellaneous';
  } catch (error) {
    console.error('Error mapping Plaid category:', error);
    return 'Miscellaneous';
  }
}

/**
 * Maps a transaction by merchant name using merchant rules from database
 * @param {string} merchantName - The merchant name
 * @returns {Promise<string>} The mapped app category
 */
async function mapByMerchantRules(merchantName) {
  if (!merchantName) return null;

  try {
    // First try exact matches
    const exactRule = await MerchantCategoryRule.findOne({
      where: {
        merchant_pattern: merchantName.toLowerCase(),
        exact_match: true,
        is_active: true
      }
    });

    if (exactRule) {
      return exactRule.category;
    }

    // Then try partial matches
    const partialRule = await MerchantCategoryRule.findOne({
      where: {
        merchant_pattern: {
          [require('sequelize').Op.iLike]: `%${merchantName.toLowerCase()}%`
        },
        exact_match: false,
        is_active: true
      }
    });

    if (partialRule) {
      return partialRule.category;
    }

    return null;
  } catch (error) {
    console.error('Error mapping by merchant rules:', error);
    return null;
  }
}

/**
 * Maps a transaction to an app category using the best available method
 * @param {Object} transaction - The Plaid transaction object
 * @returns {Promise<string>} The mapped app category
 */
async function mapTransactionCategory(transaction) {
  // Priority: merchant rules > personal_finance_category > traditional category > merchant name
  const merchantName = transaction.merchant_name || transaction.name;
  
  // First, check merchant rules (highest priority)
  if (merchantName) {
    const merchantRuleCategory = await mapByMerchantRules(merchantName);
    if (merchantRuleCategory) {
      return merchantRuleCategory;
    }
  }

  // Then check personal finance category
  if (transaction.personal_finance_category) {
    return await mapPersonalFinanceCategory(transaction.personal_finance_category);
  }

  // Then check traditional category
  if (transaction.category && transaction.category.length > 0) {
    return await mapPlaidCategory(transaction.category[0]);
  }

  // Finally, fallback to merchant name analysis
  return mapByMerchantName(merchantName || '');
}

/**
 * Maps a transaction by merchant name using keyword matching
 * @param {string} merchantName - The merchant name
 * @returns {string} The mapped app category
 */
function mapByMerchantName(merchantName) {
  if (!merchantName) return 'Miscellaneous';

  const upperName = merchantName.toUpperCase();

  // Food & Dining
  if (upperName.includes('UBER') || upperName.includes('UBEREATS') || 
      upperName.includes('DOORDASH') || upperName.includes('GRUBHUB')) {
    return 'Restaurants & Bars';
  }
  if (upperName.includes('COSTCO') || upperName.includes('WALMART') || 
      upperName.includes('SUPERMARKET') || upperName.includes('GROCERY')) {
    return 'Groceries';
  }
  if (upperName.includes('STARBUCKS') || upperName.includes('TIM HORTONS') || 
      upperName.includes('COFFEE')) {
    return 'Coffee Shops';
  }

  // Utilities
  if (upperName.includes('BELL') || upperName.includes('ROGERS') || 
      upperName.includes('TELUS') || upperName.includes('VERIZON')) {
    return 'Phone';
  }
  if (upperName.includes('HYDRO') || upperName.includes('ELECTRICITY')) {
    return 'Gas & Electric';
  }

  // Transportation
  if (upperName.includes('ESSO') || upperName.includes('PETRO-CANADA') || 
      upperName.includes('SHELL') || upperName.includes('GAS')) {
    return 'Gas';
  }
  if (upperName.includes('STM') || upperName.includes('TRANSIT')) {
    return 'Public Transit';
  }

  // Shopping
  if (upperName.includes('HOME DEPOT') || upperName.includes('RONA') || 
      upperName.includes('LOWES')) {
    return 'Home Improvement';
  }
  if (upperName.includes('IKEA')) {
    return 'Furniture & Housewares';
  }
  if (upperName.includes('ZARA') || upperName.includes('OLD NAVY') || 
      upperName.includes('H&M')) {
    return 'Clothing';
  }

  // Medical
  if (upperName.includes('JEAN COUTU') || upperName.includes('SHOPPERS') || 
      upperName.includes('PHARMACY') || upperName.includes('CLINIC')) {
    return 'Medical';
  }

  // Travel
  if (upperName.includes('BOOKING.COM') || upperName.includes('HOTEL') || 
      upperName.includes('AIRLINE')) {
    return 'Travel & Vacation';
  }

  // Financial
  if (upperName.includes('INTEREST PAID')) {
    return 'Interest';
  }
  if (upperName.includes('CREDIT CARD PAYMENT') || 
      upperName.includes('PAYMENT - THANK YOU')) {
    return 'Credit Card Payment';
  }
  if (upperName.includes('INTERAC E-TRANSFER') || 
      upperName.includes('EFT WITHDRAWAL') || 
      upperName.includes('EFT DEPOSIT')) {
    return 'Transfer';
  }

  return 'Miscellaneous';
}

module.exports = {
  mapPersonalFinanceCategory,
  mapPlaidCategory,
  mapTransactionCategory,
  mapByMerchantName,
  mapByMerchantRules
}; 