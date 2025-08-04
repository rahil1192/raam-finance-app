const express = require('express');
const router = express.Router();

// Import models
const { Transaction, Account, PlaidItem, CategoryMapping, RecurringRule } = require('../models');

/**
 * POST /api/admin/clear_db
 * Clear all data from database
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
 * DELETE /api/transactions/all
 * Delete all transactions
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
 * POST /api/admin/trigger_update
 * Trigger manual update for Plaid items
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
 * GET /api/admin/stats
 * Get system statistics
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