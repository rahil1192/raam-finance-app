const axios = require('axios');

async function testForceFullFetch() {
  try {
    console.log('🔄 Testing force full fetch from January 1, 2025...');
    
    const response = await axios.post('http://localhost:3000/api/plaid/sync_transactions', {
      force_full_fetch: true
    });
    
    console.log('✅ Force full fetch response:', response.data);
    console.log(`📊 Added: ${response.data.added}`);
    console.log(`📊 Modified: ${response.data.modified}`);
    console.log(`📊 Removed: ${response.data.removed}`);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testForceFullFetch(); 