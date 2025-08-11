const { CategoryMapping, MerchantCategoryRule, MerchantCategoryMapping, sequelize } = require('../models');

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
    // Use the new MerchantCategoryMapping system
    // First try exact matches (highest priority)
    const exactMatch = await MerchantCategoryMapping.findOne({
      where: {
        merchant_name: merchantName,
        is_active: true
      },
      order: [['priority', 'DESC'], ['usage_count', 'DESC']]
    });

    if (exactMatch) {
      // Update usage count
      await exactMatch.update({
        usage_count: exactMatch.usage_count + 1,
        last_used: new Date()
      });
      return exactMatch.app_category;
    }

    // Then try pattern matches (regex)
    const patternMatches = await MerchantCategoryMapping.findAll({
      where: {
        is_active: true,
        merchant_pattern: sequelize.where(sequelize.col('merchant_pattern'), 'IS NOT', null)
      },
      order: [['priority', 'DESC'], ['usage_count', 'DESC']]
    });

    let bestPatternMatch = null;
    let bestScore = 0;

    for (const mapping of patternMatches) {
      try {
        // Skip empty patterns
        if (!mapping.merchant_pattern || mapping.merchant_pattern.trim() === '') {
          continue;
        }
        
        const regex = new RegExp(mapping.merchant_pattern, 'i');
        if (regex.test(merchantName)) {
          const score = mapping.priority * 10 + mapping.usage_count;
          if (score > bestScore) {
            bestScore = score;
            bestPatternMatch = mapping;
          }
        }
      } catch (regexError) {
        console.warn(`Invalid regex pattern for mapping ${mapping.id}:`, mapping.merchant_pattern);
      }
    }

    if (bestPatternMatch) {
      // Update usage count
      await bestPatternMatch.update({
        usage_count: bestPatternMatch.usage_count + 1,
        last_used: new Date()
      });
      return bestPatternMatch.app_category;
    }

    return null;
  } catch (error) {
    console.error('Error mapping by merchant rules:', error);
    return null;
  }
}

/**
 * Automatically creates a merchant-category mapping based on transaction data
 * This allows the system to learn and improve categorization over time
 * @param {string} merchantName - The merchant name
 * @param {string} appCategory - The app category that was assigned
 * @param {string} confidence - How confident we are in this mapping ('exact', 'pattern', 'fallback')
 */
async function autoCreateMerchantMapping(merchantName, appCategory, confidence = 'fallback') {
  if (!merchantName || !appCategory) return;

  try {
    // Check if mapping already exists
    const existingMapping = await MerchantCategoryMapping.findOne({
      where: {
        merchant_name: merchantName,
        app_category: appCategory
      }
    });

    if (existingMapping) {
      // Update existing mapping usage
      await existingMapping.update({
        usage_count: existingMapping.usage_count + 1,
        last_used: new Date()
      });
      return;
    }

    // Create new mapping with appropriate priority based on confidence
    let priority = 1;
    let description = '';

    switch (confidence) {
      case 'exact':
        priority = 10;
        description = 'Auto-created from exact merchant match';
        break;
      case 'pattern':
        priority = 5;
        description = 'Auto-created from pattern match';
        break;
      case 'fallback':
        priority = 1;
        description = 'Auto-created from fallback categorization';
        break;
      default:
        priority = 1;
        description = 'Auto-created mapping';
    }

    await MerchantCategoryMapping.create({
      merchant_name: merchantName,
      app_category: appCategory,
      priority: priority,
      description: description,
      created_by: 'auto-system',
      usage_count: 1,
      last_used: new Date()
    });

    console.log(`✅ Auto-created merchant mapping: ${merchantName} → ${appCategory} (${confidence})`);
  } catch (error) {
    console.error('Error auto-creating merchant mapping:', error);
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
      // Auto-create mapping for future use
      await autoCreateMerchantMapping(merchantName, merchantRuleCategory, 'exact');
      return merchantRuleCategory;
    }
  }

  // Then check personal finance category
  if (transaction.personal_finance_category) {
    const category = await mapPersonalFinanceCategory(transaction.personal_finance_category);
    if (merchantName) {
      await autoCreateMerchantMapping(merchantName, category, 'pattern');
    }
    return category;
  }

  // Then check traditional category
  if (transaction.category && transaction.category.length > 0) {
    const category = await mapPlaidCategory(transaction.category[0]);
    if (merchantName) {
      await autoCreateMerchantMapping(merchantName, category, 'pattern');
    }
    return category;
  }

  // Finally, fallback to merchant name analysis
  const fallbackCategory = mapByMerchantName(merchantName || '');
  if (merchantName) {
    await autoCreateMerchantMapping(merchantName, fallbackCategory, 'fallback');
  }
  return fallbackCategory;
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
  mapByMerchantRules,
  autoCreateMerchantMapping
}; 