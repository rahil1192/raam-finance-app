# Merchant-Category Mapping System

## 🎯 **Overview**

The Merchant-Category Mapping System allows you to automatically categorize transactions based on merchant names. This system provides intelligent, rule-based categorization that improves over time through usage tracking.

## ✨ **Key Features**

- **🔄 Automatic Categorization**: Automatically assign categories to transactions based on merchant names
- **🎯 Smart Matching**: Exact matches and regex pattern matching for flexible merchant identification
- **📊 Priority System**: Higher priority rules take precedence over lower priority ones
- **📈 Usage Tracking**: Tracks how often each mapping is used for optimization
- **🔍 Pattern Matching**: Support for regex patterns to match similar merchant names
- **📋 Bulk Operations**: Create multiple mappings at once
- **📊 Statistics**: View usage statistics and popular mappings

## 🏗️ **System Architecture**

### **Database Model**
- `merchant_name`: Exact merchant name (e.g., "Starbucks")
- `merchant_pattern`: Optional regex pattern for flexible matching
- `app_category`: Category to assign (e.g., "Coffee Shops")
- `priority`: Priority level (higher = more important)
- `is_active`: Whether the mapping is active
- `usage_count`: Number of times this mapping has been used
- `last_used`: Last time this mapping was used

### **Matching Logic**
1. **Exact Match**: Highest priority, matches merchant name exactly
2. **Pattern Match**: Uses regex patterns for flexible matching
3. **Priority Scoring**: Combines priority level and usage count for best match

## 🚀 **API Endpoints**

### **Base URL**: `/api/merchant-category-mapping`

#### **1. Get All Mappings**
```http
GET /api/merchant-category-mapping
```

**Query Parameters:**
- `merchant_name`: Filter by merchant name (partial match)
- `app_category`: Filter by app category
- `is_active`: Filter by active status

**Example:**
```bash
curl "http://localhost:8001/api/merchant-category-mapping?merchant_name=Starbucks&is_active=true"
```

#### **2. Create New Mapping**
```http
POST /api/merchant-category-mapping
```

**Request Body:**
```json
{
  "merchant_name": "Starbucks",
  "app_category": "Coffee Shops",
  "priority": 5,
  "description": "Coffee chain stores",
  "created_by": "user123"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Starbucks",
    "app_category": "Coffee Shops",
    "priority": 5,
    "description": "Coffee chain stores"
  }'
```

#### **3. Update Mapping**
```http
PUT /api/merchant-category-mapping/{id}
```

**Example:**
```bash
curl -X PUT http://localhost:8001/api/merchant-category-mapping/1 \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 10,
    "description": "Updated description"
  }'
```

#### **4. Delete Mapping**
```http
DELETE /api/merchant-category-mapping/{id}
```

**Example:**
```bash
curl -X DELETE http://localhost:8001/api/merchant-category-mapping/1
```

#### **5. Find Category Match**
```http
POST /api/merchant-category-mapping/match
```

**Request Body:**
```json
{
  "merchant_name": "Starbucks"
}
```

**Response:**
```json
{
  "success": true,
  "matched": true,
  "category": "Coffee Shops",
  "mapping": { ... },
  "confidence": "exact"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/merchant-category-mapping/match \
  -H "Content-Type: application/json" \
  -d '{"merchant_name": "Starbucks"}'
```

#### **6. Bulk Create Mappings**
```http
POST /api/merchant-category-mapping/bulk-create
```

**Request Body:**
```json
{
  "mappings": [
    {
      "merchant_name": "Starbucks",
      "app_category": "Coffee Shops",
      "priority": 5
    },
    {
      "merchant_name": "Amazon",
      "app_category": "Shopping",
      "priority": 5
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/merchant-category-mapping/bulk-create \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": [
      {"merchant_name": "Starbucks", "app_category": "Coffee Shops"},
      {"merchant_name": "Amazon", "app_category": "Shopping"}
    ]
  }'
```

#### **7. Get Statistics**
```http
GET /api/merchant-category-mapping/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_mappings": 25,
    "active_mappings": 23,
    "total_usage": 1500,
    "top_categories": [...],
    "top_merchants": [...]
  }
}
```

## 🎯 **Usage Examples**

### **Basic Merchant Mapping**
```bash
# Create a simple mapping
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Tim Hortons",
    "app_category": "Coffee Shops"
  }'
```

### **Pattern-Based Mapping**
```bash
# Create a pattern-based mapping for all gas stations
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Shell",
    "merchant_pattern": ".*GAS.*|.*FUEL.*|.*PETRO.*",
    "app_category": "Gas",
    "description": "Gas station pattern matching"
  }'
```

### **High Priority Mapping**
```bash
# Create a high-priority mapping for a specific merchant
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Walmart",
    "app_category": "Shopping",
    "priority": 10,
    "description": "High priority for major retailer"
  }'
```

## 🔧 **Integration with Transaction Processing**

### **Automatic Categorization**
When new transactions are processed, the system automatically:

1. **Extracts merchant name** from transaction details
2. **Finds best matching category** using the mapping system
3. **Updates usage statistics** for the matched mapping
4. **Assigns the category** to the transaction

### **Category Priority**
The system uses a scoring algorithm:
```
Score = (Priority × 10) + Usage Count
```

- **Higher priority** mappings get preference
- **Frequently used** mappings get preference
- **Exact matches** always win over pattern matches

## 📊 **Best Practices**

### **1. Start with Exact Matches**
```bash
# Create exact matches for major merchants
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -d '{"merchant_name": "Amazon", "app_category": "Shopping"}'
```

### **2. Use Patterns for Similar Merchants**
```bash
# Pattern for coffee shops
curl -X POST http://localhost:8001/api/merchant-category-mapping \
  -d '{
    "merchant_name": "Coffee Pattern",
    "merchant_pattern": ".*COFFEE.*|.*CAFE.*|.*ESPRESSO.*",
    "app_category": "Coffee Shops"
  }'
```

### **3. Set Appropriate Priorities**
- **Priority 10**: Major retailers, banks, utilities
- **Priority 5**: Common merchants, chains
- **Priority 1**: Generic patterns, fallbacks

### **4. Monitor Usage Statistics**
```bash
# Check which mappings are most effective
curl http://localhost:8001/api/merchant-category-mapping/stats
```

## 🚨 **Error Handling**

### **Common Errors**
- **400**: Missing required fields
- **409**: Mapping already exists
- **404**: Mapping not found
- **500**: Server error

### **Validation Rules**
- `merchant_name` and `app_category` are required
- `priority` must be a positive integer
- `merchant_pattern` must be valid regex (if provided)

## 🔄 **Migration and Setup**

### **Initial Setup**
1. **Database**: The model will be created automatically
2. **Routes**: Already registered in server.js
3. **Ready to use**: Start creating mappings immediately

### **Sample Data**
```bash
# Create common merchant mappings
curl -X POST http://localhost:8001/api/merchant-category-mapping/bulk-create \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": [
      {"merchant_name": "Starbucks", "app_category": "Coffee Shops"},
      {"merchant_name": "Amazon", "app_category": "Shopping"},
      {"merchant_name": "Shell", "app_category": "Gas"},
      {"merchant_name": "Walmart", "app_category": "Shopping"},
      {"merchant_name": "Netflix", "app_category": "Entertainment & Recreation"}
    ]
  }'
```

## 🎉 **Benefits**

- **⏰ Time Saving**: Automatic categorization reduces manual work
- **📊 Better Analytics**: Consistent categories improve reporting
- **🔄 Learning System**: Improves accuracy over time
- **🎯 Flexibility**: Support for exact and pattern-based matching
- **📈 Scalability**: Handle thousands of merchants efficiently

## 🚀 **Ready to Use**

The Merchant-Category Mapping System is now fully integrated and ready to use! Start creating mappings and watch your transaction categorization improve automatically.

**Next Steps:**
1. Create mappings for your most common merchants
2. Test the matching system with sample merchant names
3. Monitor usage statistics to optimize your mappings
4. Integrate with your transaction processing workflow 