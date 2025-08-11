# Transaction Type Fix - Plaid Format Explanation

## 🚨 **Problem Fixed**

**Before (Incorrect):**
- Credit transactions (money IN) were showing as "Debit"
- Debit transactions (money OUT) were showing as "Credit"

**After (Correct):**
- Credit transactions (money IN) now correctly show as "Credit"
- Debit transactions (money OUT) now correctly show as "Debit"

## 🔍 **How Plaid's Transaction Format Works**

### **Plaid's Raw Data Format:**
```
Coffee Purchase: +$5.00  (Positive = Money going OUT = Debit)
Salary Deposit: -$1000.00 (Negative = Money coming IN = Credit)
```

### **Why This Confuses People:**
- **Spending money** (debit) shows as **positive** in Plaid
- **Receiving money** (credit) shows as **negative** in Plaid

This is counterintuitive because we think:
- Spending = Negative (money leaving)
- Receiving = Positive (money coming in)

## ✅ **The Fix Applied**

**Changed this logic in 5 locations:**
```javascript
// OLD (Incorrect):
transaction_type: plaidTransaction.amount < 0 ? 'Debit' : 'Credit'

// NEW (Correct):
transaction_type: plaidTransaction.amount < 0 ? 'Credit' : 'Debit'
```

**Amount handling remains the same:**
```javascript
amount: Math.abs(plaidTransaction.amount) // Always store positive amount
```

## 📊 **Examples of Corrected Behavior**

| Transaction | Plaid Amount | Old Type | New Type | Correct? |
|-------------|--------------|----------|----------|----------|
| Coffee Purchase | +$5.00 | Credit ❌ | Debit ✅ | Yes |
| Salary Deposit | -$1000.00 | Debit ❌ | Credit ✅ | Yes |
| Grocery Shopping | +$50.00 | Credit ❌ | Debit ✅ | Yes |
| Refund Received | -$25.00 | Debit ❌ | Credit ✅ | Yes |

## 🎯 **What This Means for You**

**Now when you see transactions:**
- ✅ **Debit** = Money going OUT (spending, purchases, withdrawals)
- ✅ **Credit** = Money coming IN (salary, deposits, refunds, transfers in)

**Amounts are always positive** (easier to read and calculate)

## 🔄 **Files Updated**

- `src/routes/plaid.js` - All 5 transaction creation/update locations fixed
- Transaction type logic corrected throughout the system

## 🚀 **Ready to Test**

**After this fix:**
1. **New transactions** will have correct types
2. **Existing transactions** will keep their old (incorrect) types
3. **Future syncs** will use the correct logic

**To see the fix in action:**
- Connect a new account, or
- Use the fetch endpoints to get new transactions

The transaction types should now make logical sense! 🎉 