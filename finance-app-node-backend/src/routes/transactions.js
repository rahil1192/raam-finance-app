const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const router = express.Router();

// Import models and sequelize
const { Transaction, Account, CategoryMapping, sequelize } = require('../models');
const { mapPlaidCategoryToAppCategory } = require('../config/categoryMapping');

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
    
    // Apply category mapping if category is provided
    let mappedCategory = transactionData.category;
    let appCategory = transactionData.app_category;
    
    if (transactionData.category) {
      // Map Plaid category to app category
      appCategory = mapPlaidCategoryToAppCategory(transactionData.category);
      console.log(`🔍 Category mapping: "${transactionData.category}" -> "${appCategory}"`);
    }
    
    // Create transaction with mapped categories
    const transaction = await Transaction.create({
      ...transactionData,
      category: mappedCategory, // Keep original Plaid category
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
      const appCategory = mapPlaidCategoryToAppCategory(updateData.category);
      formattedUpdateData.category = updateData.category; // Keep original Plaid category
      formattedUpdateData.app_category = appCategory; // Store mapped app category
      console.log(`🔍 Category mapping: "${updateData.category}" -> "${appCategory}"`);
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

module.exports = router; 