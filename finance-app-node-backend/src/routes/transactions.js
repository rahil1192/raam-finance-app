const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const router = express.Router();

// Import models and sequelize
const { Transaction, Account, CategoryMapping, sequelize } = require('../models');

/**
 * GET /api/transactions
 * Get all transactions with optional filtering
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
 * POST /api/transactions
 * Create a new transaction
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
    
    // Create transaction
    const transaction = await Transaction.create({
      ...transactionData,
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
 * PUT /api/transactions/:id
 * Update a transaction
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
        details: verifyTransaction.details
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
 * DELETE /api/transactions/:id
 * Delete a transaction
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
 * POST /api/transactions/:id/category
 * Update transaction category
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
 * POST /api/transactions/:id/type
 * Switch transaction type (Debit/Credit)
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
 * GET /api/transactions/summary
 * Get transaction summary
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
 * GET /api/transactions/schema
 * Debug endpoint to check database schema
 */
router.get('/schema', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position;
    `);
    
    res.json({
      success: true,
      schema: results
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schema',
      message: error.message
    });
  }
});

module.exports = router; 