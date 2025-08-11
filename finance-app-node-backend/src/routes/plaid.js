const express = require('express');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const axios = require('axios');
const router = express.Router();

// Import models
const { PlaidItem, Account, Transaction, CategoryMapping, sequelize } = require('../models');

// Import category mapping utility
const { mapTransactionCategory } = require('../utils/categoryMapper');

// Import transaction filter configuration
const TRANSACTION_FILTER_CONFIG = require('../config/transactionFilter');

// Helper function to check if transaction should be included based on date filter
function shouldIncludeTransaction(transactionDate, config = TRANSACTION_FILTER_CONFIG) {
  if (!config.enableDateFiltering || !config.defaultStartDate) {
    return true; // Include all transactions if filtering is disabled
  }
  
  const transactionDateObj = new Date(transactionDate);
  const startDateObj = new Date(config.defaultStartDate);
  
  return transactionDateObj >= startDateObj;
}

// Helper function to get filtered start date for Plaid API calls
function getPlaidStartDate(config = TRANSACTION_FILTER_CONFIG) {
  if (!config.enableDateFiltering || !config.defaultStartDate) {
    // If no filtering, go back maxDaysRequested days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - config.maxDaysRequested);
    return startDate.toISOString().split('T')[0];
  }
  
  // Use the configured start date, but ensure it's not more than maxDaysRequested days ago
  const endDate = new Date();
  const configuredStartDate = new Date(config.defaultStartDate);
  const maxStartDate = new Date();
  maxStartDate.setDate(maxStartDate.getDate() - config.maxDaysRequested);
  
  // Return the later of the two dates
  return configuredStartDate > maxStartDate ? 
    configuredStartDate.toISOString().split('T')[0] : 
    maxStartDate.toISOString().split('T')[0];
}

// Function to update transaction filter configuration
function updateTransactionFilterConfig(newConfig) {
  if (newConfig.enableDateFiltering !== undefined) {
    TRANSACTION_FILTER_CONFIG.enableDateFiltering = newConfig.enableDateFiltering;
  }
  if (newConfig.defaultStartDate !== undefined) {
    TRANSACTION_FILTER_CONFIG.defaultStartDate = newConfig.defaultStartDate;
  }
  if (newConfig.maxDaysRequested !== undefined) {
    TRANSACTION_FILTER_CONFIG.maxDaysRequested = newConfig.maxDaysRequested;
  }
  
  console.log('🔧 Transaction filter configuration updated:', TRANSACTION_FILTER_CONFIG);
}

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
 * @swagger
 * /plaid/create_link_token:
 *   post:
 *     summary: Create a Plaid Link token for connecting accounts
 *     description: Creates a link token that can be used to initialize Plaid Link
 *     tags: [Plaid]
 *     responses:
 *       200:
 *         description: Link token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 link_token:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/create_link_token', async (req, res) => {
  try {
    const request = {
      user: {
        client_user_id: 'user-id',
      },
      client_name: 'Finance App',
      products: ['transactions'],
      country_codes: ['US','CA'],
      language: 'en',
      transactions: {
        days_requested: 730  // Request up to 24 months (730 days) of transaction history
      }
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
 * @swagger
 * /plaid/exchange_public_token:
 *   post:
 *     summary: Exchange public token for access token
 *     description: Exchanges a public token for an access token and creates/updates Plaid item
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_token
 *             properties:
 *               public_token:
 *                 type: string
 *                 description: The public token from Plaid Link
 *     responses:
 *       200:
 *         description: Token exchanged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 item_id:
 *                   type: string
 *                 institution_name:
 *                   type: string
 *       400:
 *         description: Bad request - missing public token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

    // 🔥 NEW: Automatically fetch transactions after account creation
    console.log(`🔄 Auto-fetching transactions for newly connected account: ${institutionName}`);
    
    try {
      // Get transactions using configurable date filtering
      const endDate = new Date();
      const startDate = getPlaidStartDate();

      console.log(`📅 Auto-fetch: Fetching transactions from ${startDate} to ${endDate.toISOString().split('T')[0]} for ${institutionName}`);
      console.log(`🔍 Date filtering enabled: ${TRANSACTION_FILTER_CONFIG.enableDateFiltering}, Start date: ${TRANSACTION_FILTER_CONFIG.defaultStartDate}`);

      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0]
      });

      const transactions = transactionsResponse.data.transactions;
      let savedCount = 0;
      let filteredCount = 0;

      for (const plaidTransaction of transactions) {
        try {
          // Apply date filtering
          if (!shouldIncludeTransaction(plaidTransaction.date)) {
            filteredCount++;
            continue; // Skip this transaction
          }

          // Check if transaction already exists
          const existingTransaction = await Transaction.findOne({
            where: {
              transaction_id: plaidTransaction.transaction_id,
              account_id: plaidTransaction.account_id
            }
          });

          if (!existingTransaction) {
            // Use the utility to map the transaction category
            const appCategory = await mapTransactionCategory(plaidTransaction);

            // Create transaction
            await Transaction.create({
              transaction_id: plaidTransaction.transaction_id,
              account_id: plaidTransaction.account_id,
              date: new Date(plaidTransaction.date),
              details: plaidTransaction.name,
              amount: Math.abs(plaidTransaction.amount), // Always store positive amount
              category: plaidTransaction.category ? plaidTransaction.category[0] : 'Uncategorized',
              app_category: appCategory,
              // Fix: Plaid format: negative = credit (money in), positive = debit (money out)
              transaction_type: plaidTransaction.amount < 0 ? 'Credit' : 'Debit',
              notes: plaidTransaction.merchant_name || null,
              recurrence_pattern: 'none'
            });

            savedCount++;
          }
        } catch (transactionError) {
          console.error('Error saving transaction during auto-fetch:', transactionError);
        }
      }

      console.log(`✅ Auto-fetch completed: ${savedCount} transactions saved, ${filteredCount} filtered out by date`);

      // Update last refresh time
      await plaidItem.update({ last_refresh: new Date() });

      res.json({
        success: true,
        message: 'Account connected successfully with transactions',
        item_id: itemId,
        institution_name: institutionName,
        auto_fetch_results: {
          transactions_fetched: transactions.length,
          transactions_saved: savedCount,
          transactions_filtered: filteredCount,
          date_filtering: TRANSACTION_FILTER_CONFIG.enableDateFiltering,
          start_date: TRANSACTION_FILTER_CONFIG.defaultStartDate
        }
      });

    } catch (autoFetchError) {
      console.error('Error during auto-fetch of transactions:', autoFetchError);
      
      // Still return success for account connection, but note the transaction fetch issue
      res.json({
        success: true,
        message: 'Account connected successfully, but transaction fetch failed',
        item_id: itemId,
        institution_name: institutionName,
        warning: 'Transactions could not be fetched automatically. Use /api/plaid/fetch_transactions to fetch them manually.',
        error: autoFetchError.message
      });
    }

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
 * @swagger
 * /plaid/fetch_transactions:
 *   post:
 *     summary: Fetch transactions from Plaid
 *     description: Fetches transactions from all connected Plaid items from up to 24 months (730 days) ago to today
 *     tags: [Plaid]
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total_transactions_saved:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       item_id:
 *                         type: string
 *                       institution_name:
 *                         type: string
 *                       transactions_fetched:
 *                         type: integer
 *                       transactions_saved:
 *                         type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
        // Get transactions using configurable date filtering
        const endDate = new Date();
        const startDate = getPlaidStartDate();

        console.log(`📅 Fetching transactions from ${startDate} to ${endDate.toISOString().split('T')[0]} for ${item.institution_name}`);
        console.log(`🔍 Date filtering enabled: ${TRANSACTION_FILTER_CONFIG.enableDateFiltering}, Start date: ${TRANSACTION_FILTER_CONFIG.defaultStartDate}`);

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: item.access_token,
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0]
        });

        const transactions = transactionsResponse.data.transactions;
        let savedCount = 0;
        let filteredCount = 0;

        for (const plaidTransaction of transactions) {
          try {
            // Apply date filtering
            if (!shouldIncludeTransaction(plaidTransaction.date)) {
              filteredCount++;
              continue; // Skip this transaction
            }

            // Check if transaction already exists
            const existingTransaction = await Transaction.findOne({
              where: {
                transaction_id: plaidTransaction.transaction_id,
                account_id: plaidTransaction.account_id
              }
            });

            if (!existingTransaction) {
              // Use the utility to map the transaction category
              const appCategory = await mapTransactionCategory(plaidTransaction);

              // Create transaction
              await Transaction.create({
                transaction_id: plaidTransaction.transaction_id,
                account_id: plaidTransaction.account_id,
                date: new Date(plaidTransaction.date),
                details: plaidTransaction.name,
                amount: Math.abs(plaidTransaction.amount), // Always store positive amount
                category: plaidTransaction.category ? plaidTransaction.category[0] : 'Uncategorized',
                app_category: appCategory,
                // Fix: Plaid format: negative = credit (money in), positive = debit (money out)
                transaction_type: plaidTransaction.amount < 0 ? 'Credit' : 'Debit',
                notes: plaidTransaction.merchant_name || null,
                recurrence_pattern: 'none'
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
          transactions_saved: savedCount,
          transactions_filtered: filteredCount,
          date_filtering: TRANSACTION_FILTER_CONFIG.enableDateFiltering,
          start_date: TRANSACTION_FILTER_CONFIG.defaultStartDate
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
 * @swagger
 * /plaid/last_refresh:
 *   get:
 *     summary: Get last refresh times for all items
 *     description: Returns the last refresh time and status for all connected Plaid items
 *     tags: [Plaid]
 *     responses:
 *       200:
 *         description: Last refresh times retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       item_id:
 *                         type: string
 *                       institution_name:
 *                         type: string
 *                       last_refresh:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

/**
 * DELETE /api/plaid/remove_item
 * Remove a Plaid item (access token) to avoid unnecessary billing
 */
/**
 * @swagger
 * /plaid/remove_item:
 *   delete:
 *     summary: Remove a Plaid item (access token)
 *     description: |
 *       Removes a Plaid item to avoid unnecessary billing. This will:
 *       - Look up the access_token for the given item_id in our database
 *       - Call Plaid's `/item/remove` endpoint to invalidate the access_token
 *       - Delete all associated transactions and accounts from the database
 *       - Remove the Plaid item record from the database
 *       
 *       **Important:** Once removed, the access_token and any associated processor tokens 
 *       or bank account tokens become invalid and cannot be used to access any data 
 *       that was associated with the Item.
 *       
 *       **Note:** We only need the item_id from you - we handle fetching the access_token internally.
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RemoveItemRequest'
 *     responses:
 *       200:
 *         description: Item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoveItemResponse'
 *       400:
 *         description: Bad request - missing item_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/remove_item', async (req, res) => {
  try {
    const { item_id } = req.body;
    
    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    // Find the Plaid item
    const plaidItem = await PlaidItem.findOne({
      where: { item_id: item_id },
      include: [
        {
          model: Account,
          as: 'accounts',
          include: [
            {
              model: Transaction,
              as: 'transactions'
            }
          ]
        }
      ]
    });

    if (!plaidItem) {
      return res.status(404).json({
        success: false,
        error: 'Plaid item not found'
      });
    }

    console.log(`🗑️ Removing Plaid item: ${item_id} (${plaidItem.institution_name})`);

    // Remove the item from Plaid (this invalidates the access token)
    // IMPORTANT: Once removed, the access_token and any associated processor tokens 
    // or bank account tokens become invalid and cannot be used to access any data 
    // that was associated with the Item.
    // 
    // Note: We receive item_id from the user, but we need access_token to call Plaid's API.
    // We fetch the access_token from our database using the item_id.
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.access_token  // ← Fetched from our database using item_id
      });
      console.log(`✅ Successfully removed item from Plaid: ${item_id}`);
    } catch (plaidError) {
      console.error(`❌ Error removing item from Plaid: ${plaidError.message}`);
      // Continue with local cleanup even if Plaid removal fails
      // (the access token might already be invalid)
    }

    // Clean up associated data in database
    let deletedTransactions = 0;
    let deletedAccounts = 0;

    // Delete all transactions associated with this item's accounts
    for (const account of plaidItem.accounts) {
      if (account.transactions) {
        deletedTransactions += account.transactions.length;
        await Transaction.destroy({
          where: { account_id: account.account_id }
        });
      }
    }

    // Delete all accounts associated with this item
    deletedAccounts = plaidItem.accounts.length;
    await Account.destroy({
      where: { plaid_item_id: plaidItem.id }
    });

    // Delete the Plaid item itself
    await plaidItem.destroy();

    console.log(`🗑️ Cleaned up database: ${deletedTransactions} transactions, ${deletedAccounts} accounts`);

    res.json({
      success: true,
      message: 'Plaid item removed successfully',
      details: {
        item_id: item_id,
        institution_name: plaidItem.institution_name,
        deleted_transactions: deletedTransactions,
        deleted_accounts: deletedAccounts
      }
    });
  } catch (error) {
    console.error('Error removing Plaid item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove Plaid item',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /plaid/remove-item-direct:
 *   post:
 *     summary: Remove a Plaid item directly using Plaid's API
 *     description: |
 *       Removes a Plaid item directly by calling Plaid's `/item/remove` endpoint.
 *       This endpoint bypasses the local database and directly communicates with Plaid's API.
 *       
 *       **Use cases:**
 *       - Remove items that exist in Plaid but not in your local database
 *       - Remove items when local database is out of sync
 *       - Direct item removal without database dependencies
 *       
 *       **Environment Detection:**
 *       - Automatically detects if the access token is for production or sandbox
 *       - Uses the appropriate Plaid environment URL
 *       
 *       **Security:**
 *       - Requires valid Plaid credentials (client_id and secret)
 *       - Validates access token format
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - access_token
 *             properties:
 *               access_token:
 *                 type: string
 *                 description: The Plaid access token for the item to remove
 *                 example: "access-production-a6f3e853-bcf2-4bb3-904c-b094df18cbcc"
 *               client_id:
 *                 type: string
 *                 description: Plaid client ID (optional, uses environment variable if not provided)
 *                 example: "6826150cf2160e00244fdea6"
 *               secret:
 *                 type: string
 *                 description: Plaid secret (optional, uses environment variable if not provided)
 *                 example: "5a009765b1c14ab843387dac0e236c"
 *     responses:
 *       200:
 *         description: Item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Item removed successfully"
 *                 data:
 *                   type: object
 *                   description: Response data from Plaid API
 *                   properties:
 *                     removed:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Access token is required"
 *       401:
 *         description: Unauthorized - invalid Plaid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to remove item from Plaid"
 *                 details:
 *                   type: object
 *                   properties:
 *                     error_code:
 *                       type: string
 *                       example: "INVALID_API_KEYS"
 *                     error_message:
 *                       type: string
 *                       example: "invalid client_id or secret provided"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/remove-item-direct', async (req, res) => {
  try {
    const { access_token, client_id, secret } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    // Use provided credentials or fall back to environment variables
    const plaidClientId = client_id || process.env.PLAID_CLIENT_ID;
    const plaidSecret = secret || process.env.PLAID_SECRET;
    
    if (!plaidClientId || !plaidSecret) {
      return res.status(400).json({
        success: false,
        error: 'Plaid credentials are required'
      });
    }
    
    console.log('🗑️ Attempting to remove Plaid item directly...');
    console.log('🔧 Access token:', access_token.substring(0, 20) + '...');
    console.log('🔧 Client ID:', plaidClientId);
    console.log('🔧 Environment: sandbox');
    
    // Make direct HTTP request to Plaid's API
    // Determine environment from access token
    const isProduction = access_token.startsWith('access-production-');
    const plaidUrl = isProduction ? 'https://production.plaid.com/item/remove' : 'https://sandbox.plaid.com/item/remove';
    
    console.log('🔧 Using Plaid URL:', plaidUrl);
    console.log('🔧 Is production token:', isProduction);
    console.log('🔧 Access token prefix:', access_token.substring(0, 20));
    
    try {
      console.log('📡 Making request to:', plaidUrl);
      const response = await axios.post(plaidUrl, {
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: access_token
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Successfully removed item from Plaid');
      console.log('📦 Response data:', response.data);
      
      res.json({
        success: true,
        message: 'Item removed successfully',
        data: response.data
      });
      
    } catch (plaidError) {
      console.error('❌ Error calling Plaid API:', plaidError.response?.data || plaidError.message);
      
      res.status(400).json({
        success: false,
        error: 'Failed to remove item from Plaid',
        details: plaidError.response?.data || plaidError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in remove-item-direct:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /plaid/items:
 *   get:
 *     summary: Get all connected Plaid items
 *     description: Returns all connected Plaid items with their accounts and status
 *     tags: [Plaid]
 *     responses:
 *       200:
 *         description: Items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlaidItem'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/items', async (req, res) => {
  try {
    const items = await PlaidItem.findAll({
      include: [
        {
          model: Account,
          as: 'accounts',
          attributes: ['account_id', 'name', 'type', 'subtype']
        }
      ],
      attributes: [
        'id', 
        'item_id', 
        'institution_name', 
        'institution_id', 
        'last_refresh', 
        'status', 
        'needs_update',
        'createdAt',
        'updatedAt'
      ]
    });

    res.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        item_id: item.item_id,
        institution_name: item.institution_name,
        institution_id: item.institution_id,
        last_refresh: item.last_refresh,
        status: item.status,
        needs_update: item.needs_update,
        account_count: item.accounts.length,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        accounts: item.accounts.map(account => ({
          account_id: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype
        }))
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
/**
 * @swagger
 * /plaid/sync_transactions:
 *   post:
 *     summary: Sync transactions from Plaid
 *     description: |
 *       Syncs transactions from all connected Plaid items. This endpoint can:
 *       - Use incremental sync API for items with existing cursors (default behavior)
 *       - Force a full fetch from up to 24 months (730 days) ago when force_full_fetch is true
 *       - Handle new items by fetching from up to 24 months (730 days) ago to today
 *     tags: [Plaid]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force_full_fetch:
 *                 type: boolean
 *                 default: false
 *                 description: |
 *                   When true, clears all cursors and fetches transactions from up to 24 months (730 days) ago to today.
 *                   Use this when you want to refresh all historical data.
 *     responses:
 *       200:
 *         description: Transactions synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 added:
 *                   type: integer
 *                   description: Number of new transactions added
 *                 modified:
 *                   type: integer
 *                   description: Number of existing transactions modified
 *                 removed:
 *                   type: integer
 *                   description: Number of transactions removed
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sync_transactions', async (req, res) => {
  try {
    const { force_full_fetch = false } = req.body;
    
    // Get all Plaid items, not just those with a cursor
    const plaidItems = await PlaidItem.findAll();

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of plaidItems) {
      try {
        // If force_full_fetch is true, clear the cursor to force a full fetch
        if (force_full_fetch) {
          await sequelize.query(`
            UPDATE plaid_items 
            SET plaid_cursor = NULL 
            WHERE id = :id
          `, {
            replacements: { id: item.id }
          });
          console.log(`🔄 Force full fetch: Cleared cursor for ${item.institution_name} (will fetch from up to 24 months ago)`);
        }

        // If item has a cursor, use sync API
        if (item.plaid_cursor) {
          const syncResponse = await plaidClient.transactionsSync({
            access_token: item.access_token,
            cursor: item.plaid_cursor
          });

          const { added, modified, removed, has_more, next_cursor } = syncResponse.data;

          // Process added transactions
          for (const transaction of added) {
            try {
              // Use the utility to map the transaction category
              const appCategory = await mapTransactionCategory(transaction);

              await Transaction.create({
                transaction_id: transaction.transaction_id,
                account_id: transaction.account_id,
                date: new Date(transaction.date),
                details: transaction.name,
                amount: Math.abs(transaction.amount), // Always store positive amount
                category: transaction.category ? transaction.category[0] : 'Uncategorized',
                app_category: appCategory,
                // Fix: Plaid format: negative = credit (money in), positive = debit (money out)
                transaction_type: transaction.amount < 0 ? 'Credit' : 'Debit',
                notes: transaction.merchant_name || null,
                recurrence_pattern: 'none'
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
                  amount: Math.abs(transaction.amount), // Always store positive amount
                  category: transaction.category ? transaction.category[0] : 'Uncategorized',
                  // Fix: Plaid format: negative = credit (money in), positive = debit (money out)
                  transaction_type: transaction.amount < 0 ? 'Credit' : 'Debit',
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
          await sequelize.query(`
            UPDATE plaid_items 
            SET plaid_cursor = :cursor 
            WHERE id = :id
          `, {
            replacements: { cursor: next_cursor, id: item.id }
          });
        } else {
          // If no cursor, do initial fetch using configurable date filtering
          const endDate = new Date();
          const startDate = getPlaidStartDate();

          console.log(`📅 Initial sync: Fetching transactions from ${startDate} to ${endDate.toISOString().split('T')[0]} for ${item.institution_name}`);
          console.log(`🔍 Date filtering enabled: ${TRANSACTION_FILTER_CONFIG.enableDateFiltering}, Start date: ${TRANSACTION_FILTER_CONFIG.defaultStartDate}`);

          const transactionsResponse = await plaidClient.transactionsGet({
            access_token: item.access_token,
            start_date: startDate,
            end_date: endDate.toISOString().split('T')[0]
          });

          const transactions = transactionsResponse.data.transactions;
          let savedCount = 0;
          let filteredCount = 0;

          for (const plaidTransaction of transactions) {
            try {
              // Apply date filtering
              if (!shouldIncludeTransaction(plaidTransaction.date)) {
                filteredCount++;
                continue; // Skip this transaction
              }

              // Check if transaction already exists
              const existingTransaction = await Transaction.findOne({
                where: {
                  transaction_id: plaidTransaction.transaction_id,
                  account_id: plaidTransaction.account_id
                }
              });

              if (!existingTransaction) {
                // Use the utility to map the transaction category
                const appCategory = await mapTransactionCategory(plaidTransaction);

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
                  notes: plaidTransaction.merchant_name || null,
                  recurrence_pattern: 'none'
                });

                savedCount++;
                totalAdded++;
              }
            } catch (transactionError) {
              console.error('Error saving transaction:', transactionError);
            }
          }

          console.log(`📊 Initial sync results: ${savedCount} saved, ${filteredCount} filtered out by date`);

          // Set initial cursor for future syncs
          if (transactionsResponse.data.next_cursor) {
            await sequelize.query(`
              UPDATE plaid_items 
              SET plaid_cursor = :cursor 
              WHERE id = :id
            `, {
              replacements: { cursor: transactionsResponse.data.next_cursor, id: item.id }
            });
          }
        }

        // Update last refresh time and reset needs_update status after successful sync
        await item.update({ 
          last_refresh: new Date(),
          needs_update: false 
        });

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
 * @swagger
 * /plaid/fetch_transactions_for_item:
 *   post:
 *     summary: Fetch transactions for a specific Plaid item
 *     description: Fetches transactions for a specific Plaid item using configurable date filtering
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_id
 *             properties:
 *               item_id:
 *                 type: string
 *                 description: The Plaid item ID to fetch transactions for
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                     institution_name:
 *                       type: string
 *                     transactions_fetched:
 *                       type: integer
 *                     transactions_saved:
 *                       type: integer
 *                     transactions_filtered:
 *                       type: integer
 *                     date_filtering:
 *                       type: boolean
 *                     start_date:
 *                       type: string
 *       400:
 *         description: Bad request - missing item_id
 *       404:
 *         description: Plaid item not found
 *       500:
 *         description: Server error
 */
router.post('/fetch_transactions_for_item', async (req, res) => {
  try {
    const { item_id } = req.body;
    
    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    // Find the Plaid item
    const plaidItem = await PlaidItem.findOne({
      where: { item_id: item_id }
    });

    if (!plaidItem) {
      return res.status(404).json({
        success: false,
        error: 'Plaid item not found'
      });
    }

    // Get transactions using configurable date filtering
    const endDate = new Date();
    const startDate = getPlaidStartDate();

    console.log(`📅 Manual fetch: Fetching transactions from ${startDate} to ${endDate.toISOString().split('T')[0]} for ${plaidItem.institution_name}`);
    console.log(`🔍 Date filtering enabled: ${TRANSACTION_FILTER_CONFIG.enableDateFiltering}, Start date: ${TRANSACTION_FILTER_CONFIG.defaultStartDate}`);

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: plaidItem.access_token,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0]
    });

    const transactions = transactionsResponse.data.transactions;
    let savedCount = 0;
    let filteredCount = 0;

    for (const plaidTransaction of transactions) {
      try {
        // Apply date filtering
        if (!shouldIncludeTransaction(plaidTransaction.date)) {
          filteredCount++;
          continue; // Skip this transaction
        }

        // Check if transaction already exists
        const existingTransaction = await Transaction.findOne({
          where: {
            transaction_id: plaidTransaction.transaction_id,
            account_id: plaidTransaction.account_id
          }
        });

        if (!existingTransaction) {
          // Use the utility to map the transaction category
          const appCategory = await mapTransactionCategory(plaidTransaction);

          // Create transaction
          await Transaction.create({
            transaction_id: plaidTransaction.transaction_id,
            account_id: plaidTransaction.account_id,
            date: new Date(plaidTransaction.date),
            details: plaidTransaction.name,
            amount: Math.abs(plaidTransaction.amount), // Always store positive amount
            category: plaidTransaction.category ? plaidTransaction.category[0] : 'Uncategorized',
            app_category: appCategory,
            // Fix: Plaid format: negative = credit (money in), positive = debit (money out)
            transaction_type: plaidTransaction.amount < 0 ? 'Credit' : 'Debit',
            notes: plaidTransaction.merchant_name || null,
            recurrence_pattern: 'none'
          });

          savedCount++;
        }
      } catch (transactionError) {
        console.error('Error saving transaction:', transactionError);
      }
    }

    // Update last refresh time
    await plaidItem.update({ last_refresh: new Date() });

    console.log(`✅ Manual fetch completed: ${savedCount} transactions saved, ${filteredCount} filtered out by date`);

    res.json({
      success: true,
      message: 'Transactions fetched successfully',
      results: {
        item_id: plaidItem.item_id,
        institution_name: plaidItem.institution_name,
        transactions_fetched: transactions.length,
        transactions_saved: savedCount,
        transactions_filtered: filteredCount,
        date_filtering: TRANSACTION_FILTER_CONFIG.enableDateFiltering,
        start_date: TRANSACTION_FILTER_CONFIG.defaultStartDate
      }
    });

  } catch (error) {
    console.error('Error fetching transactions for item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions for item',
      message: error.message
    });
  }
});

module.exports = router;
module.exports.updateTransactionFilterConfig = updateTransactionFilterConfig;
module.exports.TRANSACTION_FILTER_CONFIG = TRANSACTION_FILTER_CONFIG; 