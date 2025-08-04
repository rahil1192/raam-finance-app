const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
require('dotenv').config();

// Test Plaid Sandbox Integration
async function testPlaidSandbox() {
  console.log('🧪 Testing Plaid Sandbox Integration...');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('PLAID_ENV:', process.env.PLAID_ENV);
  console.log('PLAID_CLIENT_ID:', process.env.PLAID_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('PLAID_SECRET:', process.env.PLAID_SECRET ? 'SET' : 'NOT SET');
  
  // Initialize Plaid client
  const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  try {
    // Test 1: Create Link Token
    console.log('\n📝 Test 1: Creating Link Token...');
    const linkTokenRequest = {
      user: { client_user_id: 'test-user' },
      client_name: 'Finance App Test',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const linkTokenResponse = await plaidClient.linkTokenCreate(linkTokenRequest);
    console.log('✅ Link Token created successfully');
    console.log('Link Token:', linkTokenResponse.data.link_token.substring(0, 20) + '...');

    // Test 2: Use Sandbox Public Token
    console.log('\n📝 Test 2: Using Sandbox Public Token...');
    const sandboxPublicToken = 'public-sandbox-12345678-1234-1234-1234-123456789012';
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: sandboxPublicToken
    });
    
    console.log('✅ Public token exchanged successfully');
    console.log('Access Token:', exchangeResponse.data.access_token.substring(0, 20) + '...');
    console.log('Item ID:', exchangeResponse.data.item_id);

    // Test 3: Get Item Information
    console.log('\n📝 Test 3: Getting Item Information...');
    const itemResponse = await plaidClient.itemGet({
      access_token: exchangeResponse.data.access_token
    });
    
    console.log('✅ Item information retrieved');
    console.log('Institution ID:', itemResponse.data.item.institution_id);

    // Test 4: Get Accounts
    console.log('\n📝 Test 4: Getting Accounts...');
    const accountsResponse = await plaidClient.accountsGet({
      access_token: exchangeResponse.data.access_token
    });
    
    console.log('✅ Accounts retrieved successfully');
    console.log('Number of accounts:', accountsResponse.data.accounts.length);
    accountsResponse.data.accounts.forEach((account, index) => {
      console.log(`  Account ${index + 1}: ${account.name} (${account.type})`);
    });

    // Test 5: Get Transactions (Sandbox)
    console.log('\n📝 Test 5: Getting Sandbox Transactions...');
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: exchangeResponse.data.access_token,
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    });
    
    console.log('✅ Transactions retrieved successfully');
    console.log('Number of transactions:', transactionsResponse.data.transactions.length);
    console.log('Total transactions:', transactionsResponse.data.total_transactions);
    
    // Show first few transactions
    transactionsResponse.data.transactions.slice(0, 3).forEach((transaction, index) => {
      console.log(`  Transaction ${index + 1}: ${transaction.name} - $${transaction.amount}`);
    });

    console.log('\n🎉 All Plaid Sandbox tests passed!');
    console.log('✅ Link Token creation: OK');
    console.log('✅ Public token exchange: OK');
    console.log('✅ Item information: OK');
    console.log('✅ Accounts retrieval: OK');
    console.log('✅ Transactions retrieval: OK');

  } catch (error) {
    console.error('\n❌ Plaid Sandbox test failed:');
    console.error('Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// Run the test
testPlaidSandbox(); 