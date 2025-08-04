const express = require('express');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const router = express.Router();

// Import models
const { PlaidItem, Account, Transaction, CategoryMapping } = require('../models');

// Initialize Plaid client
console.log('Initializing Plaid client with:');
console.log('PLAID_ENV:', process.env.PLAID_ENV);
console.log('PLAID_CLIENT_ID:', process.env.PLAID_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('PLAID_SECRET:', process.env.PLAID_SECRET ? 'SET' : 'NOT SET');

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV === 'production' ? 'production' : 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

/**
 * POST /api/plaid/create_link_token
 * Create a Plaid Link token for connecting accounts
 */
router.post('/create_link_token', async (req, res) => {
  try {
    const request = {
      user: {
        client_user_id: 'user-id',
      },
      client_name: 'Finance App',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    
    res.json({
      success: true,
      link_token: createTokenResponse.data.link_token
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create link token',
      message: error.message
    });
  }
});

/**
 * POST /api/plaid/exchange_public_token
 * Exchange public token for access token
 */
router.post('/exchange_public_token', async (req, res) => {
  try {
    const { public_token } = req.body;
    
    if (!public_token) {
      return res.status(400).json({
        success: false,
        error: 'Public token is required'
      });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get item information
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken
    });

    const institutionId = itemResponse.data.item.institution_id;

    // Get institution information
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ['US']
    });

    const institutionName = institutionResponse.data.institution.name;

    // Create or update PlaidItem
    const [plaidItem, created] = await PlaidItem.findOrCreate({
      where: { item_id: itemId },
      defaults: {
        access_token: accessToken,
        institution_id: institutionId,
        institution_name: institutionName,
        last_refresh: new Date()
      }
    });

    if (!created) {
      await plaidItem.update({
        access_token: accessToken,
        last_refresh: new Date()
      });
    }

    // Get accounts for this item
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken
    });

    // Save accounts
    for (const plaidAccount of accountsResponse.data.accounts) {
      await Account.findOrCreate({
        where: { account_id: plaidAccount.account_id },
        defaults: {
          account_id: plaidAccount.account_id,
          name: plaidAccount.name,
          official_name: plaidAccount.official_name,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype,
          mask: plaidAccount.mask,
          available_balance: plaidAccount.balances.available,
          current_balance: plaidAccount.balances.current,
          iso_currency_code: plaidAccount.balances.iso_currency_code,
          plaid_item_id: plaidItem.id,
          last_updated: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Account connected successfully',
      item_id: itemId,
      institution_name: institutionName
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange public token',
      message: error.message
    });
  }
});

/**
 * POST /api/plaid/fetch_transactions
 * Fetch transactions from Plaid
 */
router.post('/fetch_transactions', async (req, res) => {
  try {
    const plaidItems = await PlaidItem.findAll({
      include: [
        {
          model: Account,
          as: 'accounts'
        }
      ]
    });

    let totalTransactions = 0;
    const results = [];

    for (const item of plaidItems) {
      try {
        // Get transactions for the last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: item.access_token,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });

        const transactions = transactionsResponse.data.transactions;
        let savedCount = 0;

        for (const plaidTransaction of transactions) {
          try {
            // Check if transaction already exists
            const existingTransaction = await Transaction.findOne({
              where: {
                transaction_id: plaidTransaction.transaction_id,
                account_id: plaidTransaction.account_id
              }
            });

            if (!existingTransaction) {
              // Find category mapping
              let appCategory = 'Other';
              if (plaidTransaction.category && plaidTransaction.category.length > 0) {
                const categoryMapping = await CategoryMapping.findOne({
                  where: { plaid_category: plaidTransaction.category[0] }
                });
                if (categoryMapping) {
                  appCategory = categoryMapping.app_category;
                }
              }

              // Create transaction
              await Transaction.create({
                transaction_id: plaidTransaction.transaction_id,
                account_id: plaidTransaction.account_id,
                date: new Date(plaidTransaction.date),
                details: plaidTransaction.name,
                amount: Math.abs(plaidTransaction.amount),
                category: plaidTransaction.category ? plaidTransaction.category[0] : 'Uncategorized',
                app_category: appCategory,
                transaction_type: plaidTransaction.amount < 0 ? 'Debit' : 'Credit',
                notes: plaidTransaction.merchant_name || null
              });

              savedCount++;
            }
          } catch (transactionError) {
            console.error('Error saving transaction:', transactionError);
          }
        }

        // Update last refresh time
        await item.update({ last_refresh: new Date() });

        results.push({
          item_id: item.item_id,
          institution_name: item.institution_name,
          transactions_fetched: transactions.length,
          transactions_saved: savedCount
        });

        totalTransactions += savedCount;
      } catch (itemError) {
        console.error(`Error processing item ${item.item_id}:`, itemError);
        results.push({
          item_id: item.item_id,
          institution_name: item.institution_name,
          error: itemError.message
        });
      }
    }

    res.json({
      success: true,
      total_transactions_saved: totalTransactions,
      results
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

/**
 * GET /api/plaid/items
 * Get all Plaid items
 */
router.get('/items', async (req, res) => {
  try {
    const items = await PlaidItem.findAll({
      include: [
        {
          model: Account,
          as: 'accounts',
          attributes: ['account_id', 'name', 'type', 'current_balance']
        }
      ]
    });

    res.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        item_id: item.item_id,
        institution_id: item.institution_id,
        institution_name: item.institution_name,
        last_refresh: item.last_refresh,
        status: item.status,
        needs_update: item.needs_update,
        accounts: item.accounts
      }))
    });
  } catch (error) {
    console.error('Error fetching Plaid items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Plaid items',
      message: error.message
    });
  }
});

/**
 * POST /api/plaid/sync_transactions
 * Sync transactions using Plaid's sync endpoint
 */
router.post('/sync_transactions', async (req, res) => {
  try {
    const plaidItems = await PlaidItem.findAll({
      where: { plaid_cursor: { [require('sequelize').Op.ne]: null } }
    });

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of plaidItems) {
      try {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor: item.plaid_cursor
        });

        const { added, modified, removed, has_more, next_cursor } = syncResponse.data;

        // Process added transactions
        for (const transaction of added) {
          try {
            let appCategory = 'Other';
            if (transaction.category && transaction.category.length > 0) {
              const categoryMapping = await CategoryMapping.findOne({
                where: { plaid_category: transaction.category[0] }
              });
              if (categoryMapping) {
                appCategory = categoryMapping.app_category;
              }
            }

            await Transaction.create({
              transaction_id: transaction.transaction_id,
              account_id: transaction.account_id,
              date: new Date(transaction.date),
              details: transaction.name,
              amount: Math.abs(transaction.amount),
              category: transaction.category ? transaction.category[0] : 'Uncategorized',
              app_category: appCategory,
              transaction_type: transaction.amount < 0 ? 'Debit' : 'Credit',
              notes: transaction.merchant_name || null
            });

            totalAdded++;
          } catch (error) {
            console.error('Error adding transaction:', error);
          }
        }

        // Process modified transactions
        for (const transaction of modified) {
          try {
            const existingTransaction = await Transaction.findOne({
              where: { transaction_id: transaction.transaction_id }
            });

            if (existingTransaction) {
              await existingTransaction.update({
                details: transaction.name,
                amount: Math.abs(transaction.amount),
                category: transaction.category ? transaction.category[0] : 'Uncategorized',
                transaction_type: transaction.amount < 0 ? 'Debit' : 'Credit',
                notes: transaction.merchant_name || null
              });

              totalModified++;
            }
          } catch (error) {
            console.error('Error modifying transaction:', error);
          }
        }

        // Process removed transactions
        for (const transaction of removed) {
          try {
            const existingTransaction = await Transaction.findOne({
              where: { transaction_id: transaction.transaction_id }
            });

            if (existingTransaction) {
              await existingTransaction.destroy();
              totalRemoved++;
            }
          } catch (error) {
            console.error('Error removing transaction:', error);
          }
        }

        // Update cursor
        await item.update({ plaid_cursor: next_cursor });

      } catch (error) {
        console.error(`Error syncing item ${item.item_id}:`, error);
      }
    }

    res.json({
      success: true,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync transactions',
      message: error.message
    });
  }
});

/**
 * GET /api/plaid/last_refresh
 * Get last refresh time for all items
 */
router.get('/last_refresh', async (req, res) => {
  try {
    const items = await PlaidItem.findAll({
      attributes: ['item_id', 'institution_name', 'last_refresh', 'status']
    });

    res.json({
      success: true,
      items: items.map(item => ({
        item_id: item.item_id,
        institution_name: item.institution_name,
        last_refresh: item.last_refresh,
        status: item.status
      }))
    });
  } catch (error) {
    console.error('Error fetching last refresh times:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch last refresh times',
      message: error.message
    });
  }
});

module.exports = router; 