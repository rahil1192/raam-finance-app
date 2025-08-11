const { mapTransactionCategory } = require('./src/utils/categoryMapper');

// Test the merchant-category mapping system
async function testMerchantMapping() {
  console.log('🧪 Testing Merchant-Category Mapping System\n');

  // Test transactions with different merchant names
  const testTransactions = [
    {
      name: 'Starbucks',
      merchant_name: 'Starbucks',
      category: ['Food and Drink'],
      personal_finance_category: null
    },
    {
      name: 'Amazon.com',
      merchant_name: 'Amazon.com',
      category: ['Shopping'],
      personal_finance_category: null
    },
    {
      name: 'Shell Gas Station',
      merchant_name: 'Shell Gas Station',
      category: ['Transportation'],
      personal_finance_category: null
    },
    {
      name: 'Uber Eats',
      merchant_name: 'Uber Eats',
      category: ['Food and Drink'],
      personal_finance_category: null
    },
    {
      name: 'Unknown Merchant',
      merchant_name: 'Unknown Merchant',
      category: ['Uncategorized'],
      personal_finance_category: null
    }
  ];

  for (const transaction of testTransactions) {
    try {
      console.log(`📝 Processing: ${transaction.merchant_name}`);
      const category = await mapTransactionCategory(transaction);
      console.log(`✅ Categorized as: ${category}\n`);
    } catch (error) {
      console.error(`❌ Error processing ${transaction.merchant_name}:`, error.message);
    }
  }

  console.log('🎯 Test completed! Check your database for auto-created mappings.');
}

// Run the test
testMerchantMapping().catch(console.error); 