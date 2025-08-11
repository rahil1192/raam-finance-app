# Transaction Filtering System

This system allows you to control which transactions are imported from Plaid based on date filtering, while maintaining the flexibility to request up to 730 days of historical data.

## How It Works

1. **Plaid API Request**: Still requests up to 730 days of data for maximum flexibility
2. **Post-Fetch Filtering**: Filters transactions after receiving them from Plaid
3. **Configurable Start Date**: You can set a custom start date for transactions
4. **Category Preservation**: Your existing category mappings are preserved
5. **🆕 Auto-Fetch**: Transactions are automatically fetched when connecting new accounts

## Current Configuration

- **Start Date**: January 1, 2025
- **Filtering**: Enabled
- **Max Days Requested**: 730 days (for flexibility)
- **Auto-Fetch**: Enabled (transactions fetch automatically on account connection)

## API Endpoints

### Get Current Configuration
```
GET /api/admin/get_transaction_filter_config
```

### Update Configuration
```
POST /api/admin/configure_transaction_filter
Content-Type: application/json

{
  "start_date": "2025-01-01",
  "enable_filtering": true
}
```

### 🆕 Fetch Transactions for Specific Item
```
POST /api/plaid/fetch_transactions_for_item
Content-Type: application/json

{
  "item_id": "your_plaid_item_id"
}
```

## 🆕 Auto-Fetch Feature

**What happens when you connect a new account:**

1. **Account Creation**: Plaid account is created and stored
2. **🔄 Automatic Transaction Fetch**: Transactions are immediately fetched using your date filter settings
3. **Smart Filtering**: Only transactions from your start date (Jan 1, 2025) are stored
4. **Immediate Results**: You get transaction data right away, no manual steps needed

**Benefits:**
- ✅ **No waiting** - Transactions appear immediately after account connection
- ✅ **Smart filtering** - Only relevant transactions are stored
- ✅ **Error handling** - If auto-fetch fails, you get clear error messages
- ✅ **Manual fallback** - Use `/fetch_transactions_for_item` if needed

## Configuration Options

### 1. Fresh Start from 2025 (Current Setting)
```javascript
{
  "enableDateFiltering": true,
  "defaultStartDate": "2025-01-01"
}
```
- Only transactions from January 1, 2025 onwards will be stored
- Perfect for starting fresh in 2025

### 2. Full Historical Data
```javascript
{
  "enableDateFiltering": false
}
```
- All available transactions (up to 730 days) will be stored
- Useful for comprehensive financial history

### 3. Custom Start Date
```javascript
{
  "enableDateFiltering": true,
  "defaultStartDate": "2024-06-01"
}
```
- Transactions from June 1, 2024 onwards will be stored
- Flexible for different user needs

## Benefits

✅ **Flexibility**: Keep 730 days capability for future users  
✅ **Clean Data**: Only store transactions from your desired start date  
✅ **Easy Configuration**: Simple API endpoints to change settings  
✅ **Category Preservation**: Your custom categories remain intact  
✅ **Future-Proof**: Works for any date range you choose  
✅ **🆕 Auto-Fetch**: Transactions load automatically on account connection  

## Usage Examples

### For Current Use (Fresh 2025 Start)
```bash
curl -X POST http://localhost:8001/api/admin/configure_transaction_filter \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-01-01", "enable_filtering": true}'
```

### For Future Users (Full History)
```bash
curl -X POST http://localhost:8001/api/admin/configure_transaction_filter \
  -H "Content-Type: application/json" \
  -d '{"enable_filtering": false}'
```

### For Custom Date Range
```bash
curl -X POST http://localhost:8001/api/admin/configure_transaction_filter \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-01-01", "enable_filtering": true}'
```

### 🆕 Manual Transaction Fetch (if auto-fetch fails)
```bash
curl -X POST http://localhost:8001/api/plaid/fetch_transactions_for_item \
  -H "Content-Type: application/json" \
  -d '{"item_id": "your_plaid_item_id"}'
```

## File Structure

- `src/config/transactionFilter.js` - Main configuration file
- `src/routes/plaid.js` - Transaction processing with filtering and auto-fetch
- `src/routes/admin.js` - Configuration management endpoints

## Next Steps

1. **🔄 Reconnect your Tangerine account** - Transactions will now fetch automatically!
2. **Monitor the logs** - You'll see auto-fetch progress and results
3. **Adjust as needed** - Use the admin endpoints to change the configuration

## Logging

The system provides detailed logging:
- 📅 Shows the date range being requested from Plaid
- 🔍 Shows current filtering configuration
- 🔄 Shows auto-fetch progress for new accounts
- 📊 Shows how many transactions were saved vs. filtered

Example log output for new account connection:
```
🔄 Auto-fetching transactions for newly connected account: Tangerine Bank
📅 Auto-fetch: Fetching transactions from 2025-01-01 to 2025-08-11 for Tangerine Bank
🔍 Date filtering enabled: true, Start date: 2025-01-01
✅ Auto-fetch completed: 45 transactions saved, 12 filtered out by date
```

This means:
- 45 transactions from 2025 were saved
- 12 transactions from before 2025 were filtered out
- Your database stays clean with only relevant data
- **No manual steps needed** - everything happened automatically!

## Troubleshooting

**If transactions don't appear automatically:**
1. Check the server logs for auto-fetch errors
2. Use `/api/plaid/fetch_transactions_for_item` to manually fetch
3. Verify your date filter configuration
4. Check if the Plaid access token is still valid 