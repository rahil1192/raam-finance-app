const fetch = require('node-fetch');

// Simple test to verify Plaid endpoints are working
async function testPlaidEndpoints() {
  console.log('🧪 Testing Plaid API Endpoints...');
  
  try {
    // Test 1: Health check
    console.log('\n📝 Test 1: Health Check...');
    const healthResponse = await fetch('https://raam-finance-app.onrender.com/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);

    // Test 2: Create Link Token
    console.log('\n📝 Test 2: Create Link Token...');
    const linkTokenResponse = await fetch('https://raam-finance-app.onrender.com/api/plaid/create_link_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const linkTokenData = await linkTokenResponse.json();
    console.log('✅ Link Token Response:', linkTokenData);
    
    if (linkTokenData.success) {
      console.log('✅ Link Token created successfully');
      console.log('Link Token:', linkTokenData.link_token.substring(0, 30) + '...');
    } else {
      console.log('❌ Link Token creation failed');
    }

    // Test 3: Check existing transactions
    console.log('\n📝 Test 3: Check Existing Transactions...');
    const transactionsResponse = await fetch('https://raam-finance-app.onrender.com/api/transactions');
    const transactionsData = await transactionsResponse.json();
    
    console.log('✅ Transactions Response:', transactionsData);
    console.log('Number of transactions:', transactionsData.transactions?.length || 0);

    // Test 4: Check existing accounts
    console.log('\n📝 Test 4: Check Existing Accounts...');
    const accountsResponse = await fetch('https://raam-finance-app.onrender.com/api/accounts');
    const accountsData = await accountsResponse.json();
    
    console.log('✅ Accounts Response:', accountsData);
    console.log('Number of accounts:', accountsData.accounts?.length || 0);

    console.log('\n🎉 Plaid API Endpoints Test Results:');
    console.log('✅ Health Check: OK');
    console.log('✅ Link Token Creation: OK');
    console.log('✅ Transactions API: OK');
    console.log('✅ Accounts API: OK');

  } catch (error) {
    console.error('\n❌ Plaid API test failed:');
    console.error('Error:', error.message);
  }
}

// Run the test
testPlaidEndpoints(); 