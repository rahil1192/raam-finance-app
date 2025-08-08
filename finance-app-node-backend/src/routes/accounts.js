const express = require('express');
const router = express.Router();

// Import models
const { Account, PlaidItem } = require('../models');

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts
 *     description: Retrieves all accounts with their transaction counts and balances
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     description: Permanently deletes an account and all its associated transactions
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *         description: Account not found
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
/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an account
 *     description: Updates account information
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               official_name:
 *                 type: string
 *               available_balance:
 *                 type: number
 *               current_balance:
 *                 type: number
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 account:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
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
/**
 * @swagger
 * /accounts/summary:
 *   get:
 *     summary: Get accounts summary
 *     description: Returns a summary of all accounts with balances and transaction counts
 *     tags: [Accounts]
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
 *                     total_accounts:
 *                       type: integer
 *                     total_balance:
 *                       type: number
 *                     total_available_balance:
 *                       type: number
 *                     accounts_by_type:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           count:
 *                             type: integer
 *                           total_balance:
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