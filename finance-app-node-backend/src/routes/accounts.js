const express = require('express');
const router = express.Router();

// Import models
const { Account, PlaidItem } = require('../models');

/**
 * GET /api/accounts
 * Get all accounts
 */
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.findAll({
      include: [
        {
          model: PlaidItem,
          as: 'plaid_item',
          attributes: ['institution_name', 'last_refresh', 'status']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      accounts: accounts.map(account => ({
        id: account.id,
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        available_balance: account.available_balance,
        current_balance: account.current_balance,
        iso_currency_code: account.iso_currency_code,
        last_updated: account.last_updated,
        needs_update: account.needs_update,
        plaid_item: account.plaid_item
      }))
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete an account
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await Account.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Check if account has transactions
    const transactionCount = await account.countTransactions();
    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with existing transactions',
        message: `Account has ${transactionCount} associated transactions`
      });
    }
    
    await account.destroy();
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
});

/**
 * PUT /api/accounts/:id
 * Update account details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const account = await Account.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Update account
    await account.update(updateData);
    
    res.json({
      success: true,
      account: account
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update account',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/summary
 * Get account summary with balances
 */
router.get('/summary', async (req, res) => {
  try {
    const accounts = await Account.findAll({
      include: [
        {
          model: PlaidItem,
          as: 'plaid_item',
          attributes: ['institution_name']
        }
      ]
    });
    
    // Calculate summary
    const summary = {
      total_accounts: accounts.length,
      total_assets: 0,
      total_liabilities: 0,
      net_worth: 0,
      by_type: {},
      by_institution: {}
    };
    
    accounts.forEach(account => {
      const balance = account.current_balance || 0;
      const institution = account.plaid_item?.institution_name || 'Unknown';
      
      // Categorize by account type
      if (account.type === 'depository') {
        summary.total_assets += balance;
        if (!summary.by_type.depository) {
          summary.by_type.depository = { count: 0, total: 0 };
        }
        summary.by_type.depository.count++;
        summary.by_type.depository.total += balance;
      } else if (account.type === 'credit') {
        summary.total_liabilities += Math.abs(balance);
        if (!summary.by_type.credit) {
          summary.by_type.credit = { count: 0, total: 0 };
        }
        summary.by_type.credit.count++;
        summary.by_type.credit.total += Math.abs(balance);
      }
      
      // Group by institution
      if (!summary.by_institution[institution]) {
        summary.by_institution[institution] = { count: 0, total: 0 };
      }
      summary.by_institution[institution].count++;
      summary.by_institution[institution].total += balance;
    });
    
    summary.net_worth = summary.total_assets - summary.total_liabilities;
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching account summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account summary',
      message: error.message
    });
  }
});

module.exports = router; 