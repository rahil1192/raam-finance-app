const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const router = express.Router();

// Import models and sequelize
const { Transaction, Account, CategoryMapping, sequelize } = require('../models');
const { mapPlaidCategoryToAppCategory } = require('../config/categoryMapping');
const MerchantCategoryRule = require('../models/MerchantCategoryRule'); // Added import for MerchantCategoryRule

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions with optional filtering
 *     description: Retrieves all transactions with optional filtering by month and account
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: YYYY-MM
 *         description: Filter transactions by month (e.g., 2024-01)
 *       - in: query
 *         name: account_id
 *         schema:
 *           type: string
 *         description: Filter transactions by account ID
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  try {
    const { month, account_id } = req.query;
    
    let whereClause = {};
    
    // Filter by month if provided
    if (month) {
      const startDate = moment(month, 'YYYY-MM').startOf('month').toDate();
      const endDate = moment(month, 'YYYY-MM').endOf('month').toDate();
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    // Filter by account if provided
    if (account_id) {
      whereClause.account_id = account_id;
    }
    
    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['name', 'official_name', 'type', 'subtype']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        transaction_id: t.transaction_id,
        account_id: t.account_id,
        date: t.date,
        details: t.details,
        amount: t.amount,
        category: t.category,
        app_category: t.app_category,
        transaction_type: t.transaction_type,
        pdf_file_id: t.pdf_file_id,
        bank: t.bank,
        statement_type: t.statement_type,
        notes: t.notes,
        is_recurring: t.is_recurring,
        recurrence_pattern: t.recurrence_pattern,
        account: t.account
      }))
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
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     description: Creates a new transaction with the provided data
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransactionRequest'
 *     responses:
 *       200:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request - missing required fields
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
router.post('/', async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Validate required fields
    if (!transactionData.date || !transactionData.details || !transactionData.amount || !transactionData.transaction_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'date, details, amount, and transaction_type are required'
      });
    }
    
    // Handle category mapping
    let mappedCategory = transactionData.category;
    let appCategory = transactionData.app_category;
    
    if (transactionData.category) {
      // If app_category is provided and different from category, it's likely a custom category
      if (transactionData.app_category && transactionData.app_category !== transactionData.category) {
        // Use the provided app_category directly (custom category)
        appCategory = transactionData.app_category;
        console.log(`🔍 Using custom category: "${appCategory}"`);
      } else {
        // Map Plaid category to app category
        appCategory = mapPlaidCategoryToAppCategory(transactionData.category);
        console.log(`🔍 Category mapping: "${transactionData.category}" -> "${appCategory}"`);
      }
    }
    
    // Create transaction with mapped categories
    const transaction = await Transaction.create({
      ...transactionData,
      category: mappedCategory, // Keep original category
      app_category: appCategory, // Store mapped app category
      date: new Date(transactionData.date),
      amount: parseFloat(transactionData.amount)
    });
    
    res.status(201).json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     description: Updates an existing transaction with the provided data
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTransactionRequest'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('🔄 Updating transaction:', id);
    console.log('📊 Update data:', updateData);
    console.log('🔍 Account ID being sent:', updateData.account_id);
    console.log('🔍 Account ID type:', typeof updateData.account_id);
    
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      console.log('❌ Transaction not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    console.log('✅ Found transaction:', transaction.id);
    console.log('📝 Current transaction data:', {
      account_id: transaction.account_id,
      account_id_type: typeof transaction.account_id,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date
    });
    
    // Validate and format update data
    const formattedUpdateData = {
      ...updateData,
      amount: updateData.amount ? parseFloat(updateData.amount) : transaction.amount,
      date: updateData.date ? new Date(updateData.date) : transaction.date,
      account_id: updateData.account_id ? String(updateData.account_id) : transaction.account_id
    };
    
    // Apply category mapping if category is being updated
    if (updateData.category) {
      // If app_category is provided and different from category, it's likely a custom category
      if (updateData.app_category && updateData.app_category !== updateData.category) {
        // Use the provided app_category directly (custom category)
        formattedUpdateData.category = updateData.category; // Keep original category
        formattedUpdateData.app_category = updateData.app_category; // Use custom category directly
        console.log(`🔍 Using custom category: "${updateData.app_category}"`);
      } else {
        // Map Plaid category to app category
        const appCategory = mapPlaidCategoryToAppCategory(updateData.category);
        formattedUpdateData.category = updateData.category; // Keep original category
        formattedUpdateData.app_category = appCategory; // Store mapped app category
        console.log(`🔍 Category mapping: "${updateData.category}" -> "${appCategory}"`);
      }
    }
    
    console.log('📝 Formatted update data:', formattedUpdateData);
    console.log('🔍 Formatted account_id:', formattedUpdateData.account_id);
    console.log('🔍 Formatted account_id type:', typeof formattedUpdateData.account_id);
    console.log('🔍 Original transaction data:', {
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      date: transaction.date,
      amount: transaction.amount
    });
    
    // Check if we're changing any unique constraint fields
    const constraintFieldsChanged = 
      formattedUpdateData.transaction_id !== transaction.transaction_id ||
      formattedUpdateData.account_id !== transaction.account_id ||
      formattedUpdateData.date.getTime() !== transaction.date.getTime() ||
      formattedUpdateData.amount !== transaction.amount;
    
    console.log('🔍 Unique constraint fields changed:', constraintFieldsChanged);
    
    if (constraintFieldsChanged) {
      console.log('⚠️ Warning: Unique constraint fields are being changed');
    }
    
    // Update transaction
    try {
      console.log('🔄 About to update transaction with data:', formattedUpdateData);
      
      // Simple update without transaction wrapper first
      const updatedTransaction = await transaction.update(formattedUpdateData);
      console.log('✅ Transaction updated successfully');
      console.log('✅ Updated transaction data:', {
        id: updatedTransaction.id,
        account_id: updatedTransaction.account_id,
        amount: updatedTransaction.amount,
        category: updatedTransaction.category,
        date: updatedTransaction.date,
        details: updatedTransaction.details
      });
      
      // Verify the update by fetching the transaction again
      const verifyTransaction = await Transaction.findByPk(id);
      console.log('✅ Verification - fetched transaction:', {
        id: verifyTransaction.id,
        account_id: verifyTransaction.account_id,
        amount: verifyTransaction.amount,
        category: verifyTransaction.category,
        date: verifyTransaction.date,
        details: verifyTransaction.details,
        recurrence_pattern: verifyTransaction.recurrence_pattern
      });
      
    } catch (updateError) {
      console.error('❌ Error during transaction.update():', updateError);
      console.error('❌ Update error details:', {
        message: updateError.message,
        name: updateError.name,
        stack: updateError.stack
      });
      throw updateError;
    }
    
    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     description: Permanently deletes a transaction by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Transaction not found
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    await transaction.destroy();
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/{id}/category:
 *   post:
 *     summary: Update transaction category
 *     description: Updates the category of a specific transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 description: New category for the transaction
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request - missing category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found
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
router.post('/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }
    
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    await transaction.update({ category });
    
    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction category',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/{id}/type:
 *   post:
 *     summary: Switch transaction type
 *     description: Switches the transaction type between Debit and Credit
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [Debit, Credit]
 *                 description: New transaction type
 *     responses:
 *       200:
 *         description: Transaction type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request - invalid type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found
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
router.post('/:id/type', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    
    if (!type || !['Debit', 'Credit'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "Debit" or "Credit"'
      });
    }
    
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    await transaction.update({ transaction_type: type });
    
    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('Error updating transaction type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction type',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/summary:
 *   get:
 *     summary: Get transaction summary
 *     description: Returns a comprehensive summary of all transactions including totals, categories, and accounts
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_transactions:
 *                       type: integer
 *                     total_debits:
 *                       type: integer
 *                     total_credits:
 *                       type: integer
 *                     total_amount:
 *                       type: number
 *                     total_debit_amount:
 *                       type: number
 *                     total_credit_amount:
 *                       type: number
 *                     categories:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           count:
 *                             type: integer
 *                           total_amount:
 *                             type: number
 *                     accounts:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           count:
 *                             type: integer
 *                           total_amount:
 *                             type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/summary', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['name', 'type']
        }
      ]
    });
    
    // Calculate summary
    const summary = {
      total_transactions: transactions.length,
      total_debits: transactions.filter(t => t.transaction_type === 'Debit').length,
      total_credits: transactions.filter(t => t.transaction_type === 'Credit').length,
      total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
      total_debit_amount: transactions
        .filter(t => t.transaction_type === 'Debit')
        .reduce((sum, t) => sum + t.amount, 0),
      total_credit_amount: transactions
        .filter(t => t.transaction_type === 'Credit')
        .reduce((sum, t) => sum + t.amount, 0),
      categories: {},
      accounts: {}
    };
    
    // Group by categories
    transactions.forEach(t => {
      const category = t.category || 'Uncategorized';
      if (!summary.categories[category]) {
        summary.categories[category] = {
          count: 0,
          total_amount: 0
        };
      }
      summary.categories[category].count++;
      summary.categories[category].total_amount += t.amount;
    });
    
    // Group by accounts
    transactions.forEach(t => {
      const accountName = t.account?.name || 'Unknown';
      if (!summary.accounts[accountName]) {
        summary.accounts[accountName] = {
          count: 0,
          total_amount: 0
        };
      }
      summary.accounts[accountName].count++;
      summary.accounts[accountName].total_amount += t.amount;
    });
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction summary',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/sync-plaid:
 *   post:
 *     summary: Sync transactions from Plaid
 *     description: Syncs transactions from Plaid with automatic category mapping
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactions
 *             properties:
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: string
 *                     account_id:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     name:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                     merchant_name:
 *                       type: string
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
 *                 synced_transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transaction_id:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Bad request - missing or invalid transactions array
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
router.post('/sync-plaid', async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid transactions array'
      });
    }
    
    console.log(`🔄 Syncing ${transactions.length} Plaid transactions`);
    
    const syncedTransactions = [];
    const errors = [];
    
    for (const plaidTransaction of transactions) {
      try {
        // Map Plaid category to app category
        const appCategory = mapPlaidCategoryToAppCategory(plaidTransaction.category);
        
        console.log(`🔍 Mapping: "${plaidTransaction.category}" -> "${appCategory}"`);
        
        // Check if transaction already exists
        const existingTransaction = await Transaction.findOne({
          where: {
            transaction_id: plaidTransaction.transaction_id,
            account_id: plaidTransaction.account_id
          }
        });
        
        if (existingTransaction) {
          console.log(`⏭️ Transaction already exists: ${plaidTransaction.transaction_id}`);
          continue;
        }
        
        // Create new transaction with mapped category
        const transaction = await Transaction.create({
          transaction_id: plaidTransaction.transaction_id,
          account_id: plaidTransaction.account_id,
          date: new Date(plaidTransaction.date),
          details: plaidTransaction.name,
          amount: Math.abs(plaidTransaction.amount),
          category: plaidTransaction.category, // Original Plaid category
          app_category: appCategory, // Mapped app category
          transaction_type: plaidTransaction.amount > 0 ? 'Credit' : 'Debit',
          notes: plaidTransaction.notes || '',
          is_recurring: false,
          recurrence_pattern: 'none'
        });
        
        syncedTransactions.push(transaction);
        console.log(`✅ Synced transaction: ${plaidTransaction.transaction_id}`);
        
      } catch (error) {
        console.error(`❌ Error syncing transaction ${plaidTransaction.transaction_id}:`, error);
        errors.push({
          transaction_id: plaidTransaction.transaction_id,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      synced_count: syncedTransactions.length,
      error_count: errors.length,
      errors: errors,
      message: `Successfully synced ${syncedTransactions.length} transactions`
    });
    
  } catch (error) {
    console.error('Error syncing Plaid transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Plaid transactions',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/update-merchant-category:
 *   post:
 *     summary: Bulk update transactions by merchant name and create rule for future transactions
 *     description: Updates all existing transactions with a specific merchant name to a new category and creates a rule for future transactions
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant_name
 *               - new_category
 *             properties:
 *               merchant_name:
 *                 type: string
 *                 description: The merchant name to match (case insensitive)
 *                 example: "UBER CANADA/UBEREATS"
 *               new_category:
 *                 type: string
 *                 description: The new category to assign
 *                 example: "Restaurants & Bars"
 *               exact_match:
 *                 type: boolean
 *                 description: Whether to use exact match or partial match
 *                 default: false
 *     responses:
 *       200:
 *         description: Transactions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updated_count:
 *                   type: integer
 *                 rule_created:
 *                   type: boolean
 *       400:
 *         description: Bad request
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
router.post('/update-merchant-category', async (req, res) => {
  try {
    const { merchant_name, new_category, exact_match = false } = req.body;
    
    if (!merchant_name || !new_category) {
      return res.status(400).json({
        success: false,
        error: 'Merchant name and new category are required'
      });
    }

    console.log(`🔄 Updating merchant category: "${merchant_name}" → "${new_category}"`);

    // Build the WHERE clause for merchant matching
    let whereClause;
    if (exact_match) {
      whereClause = {
        [Op.or]: [
          { notes: { [Op.iLike]: merchant_name } },
          { details: { [Op.iLike]: merchant_name } }
        ]
      };
    } else {
      whereClause = {
        [Op.or]: [
          { notes: { [Op.iLike]: `%${merchant_name}%` } },
          { details: { [Op.iLike]: `%${merchant_name}%` } }
        ]
      };
    }

    // Update existing transactions
    const updateResult = await Transaction.update(
      { 
        app_category: new_category,
        updatedAt: new Date()
      },
      {
        where: {
          ...whereClause,
          app_category: 'Miscellaneous' // Only update miscellaneous transactions
        }
      }
    );

    const updatedCount = updateResult[0];
    console.log(`✅ Updated ${updatedCount} transactions`);

    // Create or update merchant category rule
    const [merchantRule, created] = await MerchantCategoryRule.findOrCreate({
      where: { 
        merchant_pattern: merchant_name.toLowerCase(),
        exact_match: exact_match
      },
      defaults: {
        merchant_pattern: merchant_name.toLowerCase(),
        category: new_category,
        exact_match: exact_match,
        is_active: true
      }
    });

    if (!created) {
      await merchantRule.update({
        category: new_category,
        is_active: true,
        updatedAt: new Date()
      });
    }

    console.log(`📝 ${created ? 'Created' : 'Updated'} merchant category rule`);

    res.json({
      success: true,
      message: `Successfully updated ${updatedCount} transactions and ${created ? 'created' : 'updated'} merchant rule`,
      updated_count: updatedCount,
      rule_created: created,
      merchant_rule: {
        id: merchantRule.id,
        merchant_pattern: merchantRule.merchant_pattern,
        category: merchantRule.category,
        exact_match: merchantRule.exact_match,
        is_active: merchantRule.is_active
      }
    });

  } catch (error) {
    console.error('Error updating merchant category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update merchant category',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/merchant-rules:
 *   get:
 *     summary: Get all merchant category rules
 *     description: Returns all merchant category rules for automatic categorization
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Merchant rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       merchant_pattern:
 *                         type: string
 *                       category:
 *                         type: string
 *                       exact_match:
 *                         type: boolean
 *                       is_active:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/merchant-rules', async (req, res) => {
  try {
    const rules = await MerchantCategoryRule.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      rules: rules.map(rule => ({
        id: rule.id,
        merchant_pattern: rule.merchant_pattern,
        category: rule.category,
        exact_match: rule.exact_match,
        is_active: rule.is_active,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching merchant rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch merchant rules',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/merchant-rules/{id}:
 *   delete:
 *     summary: Delete a merchant category rule
 *     description: Deletes a merchant category rule by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The merchant rule ID
 *     responses:
 *       200:
 *         description: Merchant rule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Merchant rule not found
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
router.delete('/merchant-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rule = await MerchantCategoryRule.findByPk(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Merchant rule not found'
      });
    }

    await rule.destroy();

    res.json({
      success: true,
      message: 'Merchant rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting merchant rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete merchant rule',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /transactions/miscellaneous-merchants:
 *   get:
 *     summary: Get merchants with miscellaneous transactions
 *     description: Returns a list of merchants that have transactions categorized as miscellaneous
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Merchants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchant_name:
 *                         type: string
 *                       transaction_count:
 *                         type: integer
 *                       total_amount:
 *                         type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/miscellaneous-merchants', async (req, res) => {
  try {
    const merchants = await Transaction.findAll({
      attributes: [
        'notes',
        'details',
        [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
      ],
      where: {
        app_category: 'Miscellaneous',
        [Op.or]: [
          { notes: { [Op.ne]: null } },
          { details: { [Op.ne]: null } }
        ]
      },
      group: ['notes', 'details'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 50
    });

    const merchantList = merchants.map(merchant => ({
      merchant_name: merchant.notes || merchant.details,
      transaction_count: parseInt(merchant.dataValues.transaction_count),
      total_amount: parseFloat(merchant.dataValues.total_amount || 0)
    }));

    res.json({
      success: true,
      merchants: merchantList
    });

  } catch (error) {
    console.error('Error fetching miscellaneous merchants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch miscellaneous merchants',
      message: error.message
    });
  }
});

module.exports = router; 