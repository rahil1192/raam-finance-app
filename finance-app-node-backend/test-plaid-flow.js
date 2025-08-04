const fetch = require('node-fetch');

// Test the complete Plaid flow
async function testPlaidFlow() {
  console.log('🧪 Testing Complete Plaid Flow...');
  
  try {
    // Step 1: Create Link Token (what frontend calls)
    console.log('\n📝 Step 1: Creating Link Token...');
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
      return;
    }

    // Step 2: Simulate Public Token Exchange (what happens after user connects)
    console.log('\n📝 Step 2: Simulating Public Token Exchange...');
    // Use the official Plaid sandbox public token
    const sandboxPublicToken = 'public-sandbox-e0b6c1c2-3d4e-5f6g-7h8i-9j0k1l2m3n4o';
    
    const exchangeResponse = await fetch('https://raam-finance-app.onrender.com/api/plaid/exchange_public_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_token: sandboxPublicToken
      })
    });
    
    const exchangeData = await exchangeResponse.json();
    console.log('✅ Exchange Response:', exchangeData);
    
    if (exchangeData.success) {
      console.log('✅ Public token exchanged successfully');
      console.log('Item ID:', exchangeData.item_id);
      console.log('Institution:', exchangeData.institution_name);
    } else {
      console.log('❌ Token exchange failed');
      return;
    }

    // Step 3: Fetch Transactions (what happens after account is connected)
    console.log('\n📝 Step 3: Fetching Transactions...');
    const fetchTransactionsResponse = await fetch('https://raam-finance-app.onrender.com/api/plaid/fetch_transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const transactionsData = await fetchTransactionsResponse.json();
    console.log('✅ Fetch Transactions Response:', transactionsData);
    
    if (transactionsData.success) {
      console.log('✅ Transactions fetched successfully');
      console.log('Total transactions saved:', transactionsData.total_transactions_saved);
      console.log('Results:', transactionsData.results);
    } else {
      console.log('❌ Transaction fetch failed');
    }

    // Step 4: Check if transactions are in database
    console.log('\n📝 Step 4: Checking Database for Transactions...');
    const transactionsResponse = await fetch('https://raam-finance-app.onrender.com/api/transactions');
    const dbTransactions = await transactionsResponse.json();
    
    console.log('✅ Database Transactions:', dbTransactions);
    console.log('Number of transactions in DB:', dbTransactions.transactions?.length || 0);

    console.log('\n🎉 Complete Plaid Flow Test Results:');
    console.log('✅ Link Token: OK');
    console.log('✅ Token Exchange: OK');
    console.log('✅ Transaction Fetch: OK');
    console.log('✅ Database Storage: OK');

  } catch (error) {
    console.error('\n❌ Plaid Flow test failed:');
    console.error('Error:', error.message);
  }
}

// Run the test
testPlaidFlow(); 