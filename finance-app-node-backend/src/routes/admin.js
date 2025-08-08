const express = require('express');
const router = express.Router();

// Import models
const { Transaction, Account, PlaidItem, RecurringRule, CategoryMapping } = require('../models');

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

module.exports = router; 