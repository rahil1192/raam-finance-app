const express = require('express');
const router = express.Router();

// Import models
const { Transaction, Account, PlaidItem, RecurringRule, CategoryMapping } = require('../models');

// Import transaction filter configuration
const TRANSACTION_FILTER_CONFIG = require('../config/transactionFilter');

/**
 * @swagger
 * /admin/clear_db:
 *   post:
 *     summary: Clear all database data
 *     description: Clears all data from the database (transactions, accounts, Plaid items, etc.)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Database cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deleted_counts:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: integer
 *                     accounts:
 *                       type: integer
 *                     plaid_items:
 *                       type: integer
 *                     recurring_rules:
 *                       type: integer
 *                     category_mappings:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/clear_db', async (req, res) => {
  try {
    // Delete all data in order to respect foreign key constraints
    await Transaction.destroy({ where: {} });
    await Account.destroy({ where: {} });
    await PlaidItem.destroy({ where: {} });
    await CategoryMapping.destroy({ where: {} });
    await RecurringRule.destroy({ where: {} });
    
    res.json({
      success: true,
      message: 'All data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear database',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/clear_db_preserve_categories:
 *   post:
 *     summary: Clear database data while preserving category mappings
 *     description: Clears all data from the database except category mappings (transactions, accounts, Plaid items, etc.)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Database cleared successfully (categories preserved)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deleted_counts:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: integer
 *                     accounts:
 *                       type: integer
 *                     plaid_items:
 *                       type: integer
 *                     recurring_rules:
 *                       type: integer
 *                     category_mappings:
 *                       type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/clear_db_preserve_categories', async (req, res) => {
  try {
    // Delete all data except category mappings, in order to respect foreign key constraints
    const deletedTransactions = await Transaction.destroy({ where: {} });
    const deletedAccounts = await Account.destroy({ where: {} });
    const deletedPlaidItems = await PlaidItem.destroy({ where: {} });
    const deletedRecurringRules = await RecurringRule.destroy({ where: {} });
    
    res.json({
      success: true,
      message: 'All data cleared successfully (category mappings preserved)',
      deleted_counts: {
        transactions: deletedTransactions,
        accounts: deletedAccounts,
        plaid_items: deletedPlaidItems,
        recurring_rules: deletedRecurringRules,
        category_mappings: 'preserved'
      }
    });
  } catch (error) {
    console.error('Error clearing database (preserving categories):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear database',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/transactions/all:
 *   delete:
 *     summary: Delete all transactions
 *     description: Permanently deletes all transactions from the database
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All transactions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deleted_count:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/transactions/all', async (req, res) => {
  try {
    const deletedCount = await Transaction.destroy({ where: {} });
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} transactions`
    });
  } catch (error) {
    console.error('Error deleting all transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all transactions',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/trigger_update:
 *   post:
 *     summary: Trigger manual update for Plaid items
 *     description: Marks Plaid items for manual update to refresh their data
 *     tags: [Admin]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               item_id:
 *                 type: string
 *                 description: Specific Plaid item ID to update (optional)
 *               account_id:
 *                 type: string
 *                 description: Specific account ID to update (optional)
 *     responses:
 *       200:
 *         description: Update triggered successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       item_id:
 *                         type: string
 *                       institution_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       error:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/trigger_update', async (req, res) => {
  try {
    const { item_id, account_id } = req.body;
    
    let whereClause = {};
    if (item_id) {
      whereClause.item_id = item_id;
    }
    
    const items = await PlaidItem.findAll({
      where: whereClause,
      include: [
        {
          model: Account,
          as: 'accounts',
          where: account_id ? { account_id } : undefined
        }
      ]
    });
    
    const results = [];
    
    for (const item of items) {
      try {
        // Mark item for update
        await item.update({ needs_update: true });
        
        results.push({
          item_id: item.item_id,
          institution_name: item.institution_name,
          status: 'marked_for_update'
        });
      } catch (error) {
        console.error(`Error marking item ${item.item_id} for update:`, error);
        results.push({
          item_id: item.item_id,
          institution_name: item.institution_name,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Marked ${results.length} items for update`,
      results
    });
  } catch (error) {
    console.error('Error triggering update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger update',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get system statistics
 *     description: Returns comprehensive system statistics including counts and last sync times
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   $ref: '#/components/schemas/AdminStats'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      transactions: await Transaction.count(),
      accounts: await Account.count(),
      plaid_items: await PlaidItem.count(),
      category_mappings: await CategoryMapping.count(),
      recurring_rules: await RecurringRule.count()
    };
    
    // Get recent activity
    const recentTransactions = await Transaction.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['name']
        }
      ]
    });
    
    const recentAccounts = await Account.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    res.json({
      success: true,
      stats,
      recent_activity: {
        transactions: recentTransactions.map(t => ({
          id: t.id,
          details: t.details,
          amount: t.amount,
          date: t.date,
          account: t.account?.name
        })),
        accounts: recentAccounts.map(a => ({
          id: a.account_id,
          name: a.name,
          type: a.type,
          balance: a.current_balance
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/configure_transaction_filter:
 *   post:
 *     summary: Configure transaction date filtering
 *     description: Sets the start date for transaction filtering (transactions before this date will be filtered out)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date in YYYY-MM-DD format (e.g., '2025-01-01')
 *               enable_filtering:
 *                 type: boolean
 *                 description: Whether to enable date filtering
 *     responses:
 *       200:
 *         description: Transaction filter configured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 config:
 *                   type: object
 *                   properties:
 *                     enableDateFiltering:
 *                       type: boolean
 *                     defaultStartDate:
 *                       type: string
 *                     maxDaysRequested:
 *                       type: integer
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
router.post('/configure_transaction_filter', async (req, res) => {
  try {
    const { start_date, enable_filtering } = req.body;
    
    // Validate date format
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format (e.g., "2025-01-01")'
      });
    }
    
    // Validate date is not in the future
    if (start_date && new Date(start_date) > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        message: 'Start date cannot be in the future'
      });
    }
    
    // Update the configuration (this would typically be stored in a database or config file)
    // For now, we'll update the in-memory config
    const plaidRoutes = require('./plaid');
    
    // Note: In a production environment, you'd want to store this in a database
    // and reload the configuration when needed
    if (typeof plaidRoutes.updateTransactionFilterConfig === 'function') {
      plaidRoutes.updateTransactionFilterConfig({
        enableDateFiltering: enable_filtering !== undefined ? enable_filtering : true,
        defaultStartDate: start_date || '2025-01-01'
      });
    }
    
    res.json({
      success: true,
      message: 'Transaction filter configured successfully',
      config: {
        enableDateFiltering: enable_filtering !== undefined ? enable_filtering : true,
        defaultStartDate: start_date || '2025-01-01',
        maxDaysRequested: TRANSACTION_FILTER_CONFIG.maxDaysRequested
      }
    });
  } catch (error) {
    console.error('Error configuring transaction filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure transaction filter',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /admin/get_transaction_filter_config:
 *   get:
 *     summary: Get current transaction filter configuration
 *     description: Returns the current configuration for transaction date filtering
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 config:
 *                   type: object
 *                   properties:
 *                     enableDateFiltering:
 *                       type: boolean
 *                     defaultStartDate:
 *                       type: string
 *                     maxDaysRequested:
 *                       type: integer
 *                     description:
 *                       type: string
 */
router.get('/get_transaction_filter_config', async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        enableDateFiltering: TRANSACTION_FILTER_CONFIG.enableDateFiltering,
        defaultStartDate: TRANSACTION_FILTER_CONFIG.defaultStartDate,
        maxDaysRequested: TRANSACTION_FILTER_CONFIG.maxDaysRequested,
        description: TRANSACTION_FILTER_CONFIG.description
      }
    });
  } catch (error) {
    console.error('Error getting transaction filter config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction filter config',
      message: error.message
    });
  }
});

module.exports = router; 