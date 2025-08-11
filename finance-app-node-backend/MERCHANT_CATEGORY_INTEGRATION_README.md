# Merchant-Category Mapping Integration

## 🎯 **Overview**

The merchant-category mapping system is now fully integrated with your transaction processing! When transactions are imported from Plaid, they are automatically categorized using intelligent merchant matching, and the system learns from each categorization to improve accuracy over time.

## ✨ **How It Works**

### **1. Automatic Categorization Flow**
```
Transaction Import → Merchant Name Extraction → Category Mapping → Auto-Learning
```

### **2. Priority System**
1. **Exact Merchant Match** (Priority 10) - Highest confidence
2. **Pattern Match** (Priority 5) - Regex-based matching
3. **Personal Finance Category** (Priority 3) - Plaid's AI categorization
4. **Traditional Category** (Priority 2) - Plaid's basic categories
5. **Fallback Analysis** (Priority 1) - Keyword-based matching

### **3. Auto-Learning System**
- **Creates mappings** automatically when transactions are processed
- **Updates usage counts** to improve future matching
- **Learns from user behavior** to become more accurate over time

## 🔄 **Integration Points**

### **Transaction Processing**
- **Plaid Import**: All new transactions use merchant-category mapping
- **Auto-Categorization**: Transactions are categorized immediately upon import
- **Learning**: System creates new mappings for future use

### **Category Mapper**
- **Updated `mapByMerchantRules`**: Now uses the new `MerchantCategoryMapping` system
- **Enhanced `mapTransactionCategory`**: Includes auto-learning capabilities
- **Smart Fallbacks**: Multiple categorization strategies for maximum accuracy

## 🚀 **Features**

### **Automatic Categorization**
- ✅ **New transactions** are categorized automatically
- ✅ **Existing transactions** can be re-categorized
- ✅ **Merchant patterns** are learned and applied
- ✅ **Usage tracking** improves accuracy over time

### **Smart Learning**
- ✅ **Auto-creates mappings** for new merchants
- ✅ **Updates existing mappings** with usage data
- ✅ **Priority-based system** for rule precedence
- ✅ **Pattern matching** for similar merchant names

### **Performance Optimization**
- ✅ **Indexed database** for fast lookups
- ✅ **Caching** of frequently used mappings
- ✅ **Efficient queries** for large datasets

## 📊 **Example Workflow**

### **1. New Transaction Import**
```
Transaction: "Starbucks Coffee" - $5.50
↓
Merchant Name: "Starbucks"
↓
Category Mapping Lookup: "Coffee Shops"
↓
Auto-Create Mapping: Starbucks → Coffee Shops
↓
Result: Transaction categorized as "Coffee Shops"
```

### **2. Pattern-Based Matching**
```
Transaction: "Shell Gas Station" - $45.00
↓
Merchant Name: "Shell Gas Station"
↓
Pattern Match: ".*GAS.*" → "Gas"
↓
Auto-Create Mapping: Shell Gas Station → Gas
↓
Result: Transaction categorized as "Gas"
```

### **3. Learning from Usage**
```
Transaction: "Tim Hortons" - $3.25
↓
Merchant Name: "Tim Hortons"
↓
Existing Mapping: Tim Hortons → Coffee Shops
↓
Update Usage: usage_count + 1
↓
Result: Transaction categorized as "Coffee Shops" (learned)
```

## 🔧 **API Endpoints**

### **Merchant-Category Mapping**
- `GET /api/merchant-category-mapping` - View all mappings
- `POST /api/merchant-category-mapping` - Create new mapping
- `POST /api/merchant-category-mapping/match` - Test merchant matching
- `GET /api/merchant-category-mapping/stats` - View usage statistics

### **Transaction Processing**
- `POST /api/plaid/fetch_transactions` - Import transactions with auto-categorization
- `POST /api/plaid/sync_transactions` - Sync transactions with auto-categorization
- `POST /api/plaid/exchange_public_token` - Auto-fetch transactions on account connection

## 📈 **Benefits**

### **Immediate**
- ✅ **Faster categorization** of new transactions
- ✅ **Consistent categories** across all transactions
- ✅ **Reduced manual work** for users

### **Long-term**
- ✅ **Self-improving system** that gets better over time
- ✅ **Data-driven insights** from usage patterns
- ✅ **Scalable solution** for thousands of merchants

## 🎯 **Usage Examples**

### **Create Custom Mapping**
```bash
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "My Local Coffee Shop",
    "app_category": "Coffee Shops",
    "priority": 8,
    "description": "Local independent coffee shop"
  }'
```

### **Test Merchant Matching**
```bash
curl -X POST http://localhost:8001/api/merchant-category-mapping/match \
  -H "Content-Type: application/json" \
  -d '{"merchant_name": "Starbucks"}'
```

### **View Learning Statistics**
```bash
curl http://localhost:8001/api/merchant-category-mapping/stats
```

## 🔍 **Testing the System**

### **Run Test Script**
```bash
node test_merchant_mapping.js
```

This will:
1. Process sample transactions
2. Test categorization logic
3. Create sample mappings
4. Demonstrate auto-learning

### **Check Database**
```bash
# View auto-created mappings
curl http://localhost:8001/api/merchant-category-mapping

# View usage statistics
curl http://localhost:8001/api/merchant-category-mapping/stats
```

## 🚨 **Important Notes**

### **Database Requirements**
- **PostgreSQL**: Table created automatically on server start
- **SQLite**: Table created automatically on server start
- **Indexes**: Created automatically for optimal performance

### **Performance Considerations**
- **Large datasets**: System scales efficiently with proper indexing
- **Memory usage**: Minimal memory footprint for mapping lookups
- **Query optimization**: Uses database indexes for fast searches

### **Data Consistency**
- **Unique constraints**: Prevents duplicate mappings
- **Validation**: Ensures data integrity
- **Error handling**: Graceful fallbacks for edge cases

## 🎉 **Ready to Use**

Your merchant-category mapping system is now fully integrated and will:

1. **Automatically categorize** all new transactions
2. **Learn from usage** to improve accuracy
3. **Create mappings** for new merchants automatically
4. **Provide insights** into categorization effectiveness

## 🔄 **Next Steps**

1. **Restart your server** to create the database table
2. **Import some transactions** to see auto-categorization in action
3. **Create custom mappings** for your specific merchants
4. **Monitor statistics** to see the system learning and improving

**The system will automatically become smarter and more accurate with each transaction processed!** 🚀 