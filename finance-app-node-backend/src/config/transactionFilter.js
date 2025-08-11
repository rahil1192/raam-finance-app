/**
 * Transaction Filter Configuration
 * 
 * This file controls how transactions are filtered when syncing from Plaid.
 * 
 * Configuration Options:
 * - enableDateFiltering: Set to true to filter transactions by date, false to accept all
 * - defaultStartDate: Transactions before this date will be filtered out (YYYY-MM-DD format)
 * - maxDaysRequested: Maximum days to request from Plaid API (keeps 730 for flexibility)
 * 
 * Usage Examples:
 * - For fresh start from 2025: defaultStartDate: '2025-01-01'
 * - For full historical data: enableDateFiltering: false
 * - For custom start date: defaultStartDate: '2024-06-01'
 */

const TRANSACTION_FILTER_CONFIG = {
  // Enable/disable date filtering
  enableDateFiltering: true,
  
  // Default start date for transactions (ISO string format: YYYY-MM-DD)
  // Transactions before this date will be filtered out
  defaultStartDate: '2025-01-01',
  
  // Maximum days to request from Plaid API
  // Keep this at 730 for maximum flexibility, filtering happens after fetch
  maxDaysRequested: 730,
  
  // Description of current configuration
  description: 'Transactions are filtered to start from January 1, 2025. This provides a clean start for the new year while maintaining flexibility for future connections.'
};

module.exports = TRANSACTION_FILTER_CONFIG; 