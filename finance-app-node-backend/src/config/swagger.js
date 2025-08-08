const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance App API',
      version: '1.0.0',
      description: 'API documentation for Finance App with Plaid integration',
      contact: {
        name: 'Finance App Team',
        email: 'support@financeapp.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8001/api',
        description: 'Development server'
      },
      {
        url: 'https://your-production-url.com/api',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            transaction_id: { type: 'string' },
            account_id: { type: 'string' },
            date: { type: 'string', format: 'date' },
            details: { type: 'string' },
            amount: { type: 'number' },
            category: { type: 'string' },
            app_category: { type: 'string' },
            transaction_type: { type: 'string', enum: ['Credit', 'Debit'] },
            pdf_file_id: { type: 'string' },
            bank: { type: 'string' },
            statement_type: { type: 'string' },
            notes: { type: 'string' },
            is_recurring: { type: 'boolean' },
            recurrence_pattern: { type: 'string' },
            account: {
              $ref: '#/components/schemas/Account'
            }
          }
        },
        CreateTransactionRequest: {
          type: 'object',
          required: ['date', 'details', 'amount', 'transaction_type'],
          properties: {
            date: { type: 'string', format: 'date' },
            details: { type: 'string' },
            amount: { type: 'number' },
            category: { type: 'string' },
            app_category: { type: 'string' },
            transaction_type: { type: 'string', enum: ['Credit', 'Debit'] },
            account_id: { type: 'string' },
            notes: { type: 'string' },
            is_recurring: { type: 'boolean' },
            recurrence_pattern: { type: 'string' }
          }
        },
        UpdateTransactionRequest: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            details: { type: 'string' },
            amount: { type: 'number' },
            category: { type: 'string' },
            app_category: { type: 'string' },
            transaction_type: { type: 'string', enum: ['Credit', 'Debit'] },
            notes: { type: 'string' },
            is_recurring: { type: 'boolean' },
            recurrence_pattern: { type: 'string' }
          }
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            account_id: { type: 'string' },
            name: { type: 'string' },
            official_name: { type: 'string' },
            type: { type: 'string' },
            subtype: { type: 'string' },
            mask: { type: 'string' },
            available_balance: { type: 'number' },
            current_balance: { type: 'number' },
            iso_currency_code: { type: 'string' },
            plaid_item_id: { type: 'integer' },
            last_updated: { type: 'string', format: 'date-time' }
          }
        },
        RecurringRule: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            pattern: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            amount: { type: 'number' },
            merchant: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateRecurringRuleRequest: {
          type: 'object',
          required: ['pattern', 'description', 'category', 'amount', 'merchant'],
          properties: {
            pattern: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            amount: { type: 'number' },
            merchant: { type: 'string' },
            is_active: { type: 'boolean', default: true }
          }
        },
        CategoryMapping: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            plaid_category: { type: 'string' },
            app_category: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateCategoryMappingRequest: {
          type: 'object',
          required: ['plaid_category', 'app_category'],
          properties: {
            plaid_category: { type: 'string' },
            app_category: { type: 'string' }
          }
        },
        AdminStats: {
          type: 'object',
          properties: {
            total_transactions: { type: 'integer' },
            total_accounts: { type: 'integer' },
            total_plaid_items: { type: 'integer' },
            total_recurring_rules: { type: 'integer' },
            total_category_mappings: { type: 'integer' },
            last_sync: { type: 'string', format: 'date-time' }
          }
        },
        PlaidItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            item_id: { type: 'string' },
            institution_name: { type: 'string' },
            institution_id: { type: 'string' },
            last_refresh: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            needs_update: { type: 'boolean' },
            account_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            accounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account_id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  subtype: { type: 'string' }
                }
              }
            }
          }
        },
        RemoveItemRequest: {
          type: 'object',
          required: ['item_id'],
          properties: {
            item_id: {
              type: 'string',
              description: 'The Plaid item ID to remove'
            }
          }
        },
        RemoveItemResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            details: {
              type: 'object',
              properties: {
                item_id: { type: 'string' },
                institution_name: { type: 'string' },
                deleted_transactions: { type: 'integer' },
                deleted_accounts: { type: 'integer' }
              }
            }
          },
          description: 'Response after successfully removing a Plaid item. The access_token has been invalidated by Plaid and all associated data has been cleaned up from the database.'
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 