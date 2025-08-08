const express = require('express');
const router = express.Router();

// Import models
const { RecurringRule, Transaction } = require('../models');

/**
 * @swagger
 * /recurring/rules:
 *   get:
 *     summary: Get all recurring rules
 *     description: Retrieves all recurring transaction rules
 *     tags: [Recurring]
 *     responses:
 *       200:
 *         description: Rules retrieved successfully
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
 *                     $ref: '#/components/schemas/RecurringRule'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await RecurringRule.findAll({
      where: { active: true },
      order: [['merchant', 'ASC']]
    });
    
    res.json({
      success: true,
      rules: rules.map(rule => ({
        id: rule.id,
        merchant: rule.merchant,
        match_type: rule.match_type,
        active: rule.active,
        recurrence_pattern: rule.recurrence_pattern
      }))
    });
  } catch (error) {
    console.error('Error fetching recurring rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recurring rules',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /recurring/rules:
 *   post:
 *     summary: Create a new recurring rule
 *     description: Creates a new recurring transaction rule
 *     tags: [Recurring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecurringRuleRequest'
 *     responses:
 *       200:
 *         description: Rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rule:
 *                   $ref: '#/components/schemas/RecurringRule'
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
router.post('/rules', async (req, res) => {
  try {
    const { merchant, match_type = 'exact', recurrence_pattern } = req.body;
    
    if (!merchant) {
      return res.status(400).json({
        success: false,
        error: 'Merchant is required'
      });
    }
    
    const rule = await RecurringRule.create({
      merchant,
      match_type,
      recurrence_pattern,
      active: true
    });
    
    res.status(201).json({
      success: true,
      rule: {
        id: rule.id,
        merchant: rule.merchant,
        match_type: rule.match_type,
        active: rule.active,
        recurrence_pattern: rule.recurrence_pattern
      }
    });
  } catch (error) {
    console.error('Error creating recurring rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recurring rule',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /recurring/rules/{id}:
 *   put:
 *     summary: Update a recurring rule
 *     description: Updates an existing recurring transaction rule
 *     tags: [Recurring]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecurringRuleRequest'
 *     responses:
 *       200:
 *         description: Rule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rule:
 *                   $ref: '#/components/schemas/RecurringRule'
 *       404:
 *         description: Rule not found
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
router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const rule = await RecurringRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Recurring rule not found'
      });
    }
    
    await rule.update(updateData);
    
    res.json({
      success: true,
      rule: {
        id: rule.id,
        merchant: rule.merchant,
        match_type: rule.match_type,
        active: rule.active,
        recurrence_pattern: rule.recurrence_pattern
      }
    });
  } catch (error) {
    console.error('Error updating recurring rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recurring rule',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /recurring/rules/{id}:
 *   delete:
 *     summary: Delete a recurring rule
 *     description: Permanently deletes a recurring transaction rule
 *     tags: [Recurring]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Rule deleted successfully
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
 *         description: Rule not found
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
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rule = await RecurringRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Recurring rule not found'
      });
    }
    
    await rule.destroy();
    
    res.json({
      success: true,
      message: 'Recurring rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recurring rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recurring rule',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /recurring/patterns:
 *   get:
 *     summary: Get recurring transaction patterns
 *     description: Analyzes transactions to identify recurring patterns and their characteristics
 *     tags: [Recurring]
 *     responses:
 *       200:
 *         description: Patterns analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patterns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchant:
 *                         type: string
 *                       transaction_count:
 *                         type: integer
 *                       first_date:
 *                         type: string
 *                         format: date-time
 *                       last_date:
 *                         type: string
 *                         format: date-time
 *                       avg_interval_days:
 *                         type: number
 *                       pattern:
 *                         type: string
 *                         enum: [weekly, biweekly, monthly, unknown]
 *                       total_amount:
 *                         type: number
 *                       avg_amount:
 *                         type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/patterns', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { is_recurring: true },
      order: [['date', 'DESC']]
    });
    
    // Group transactions by merchant
    const merchantGroups = {};
    
    transactions.forEach(transaction => {
      const merchant = transaction.details.toLowerCase();
      if (!merchantGroups[merchant]) {
        merchantGroups[merchant] = [];
      }
      merchantGroups[merchant].push(transaction);
    });
    
    // Analyze patterns for each merchant
    const patterns = [];
    
    for (const [merchant, transactions] of Object.entries(merchantGroups)) {
      if (transactions.length >= 2) {
        const dates = transactions.map(t => new Date(t.date)).sort();
        
        // Calculate average interval
        let totalInterval = 0;
        for (let i = 1; i < dates.length; i++) {
          const interval = dates[i] - dates[i - 1];
          totalInterval += interval;
        }
        
        const avgInterval = totalInterval / (dates.length - 1);
        const avgDays = Math.round(avgInterval / (1000 * 60 * 60 * 24));
        
        // Determine pattern type
        let pattern = 'unknown';
        if (avgDays >= 25 && avgDays <= 35) {
          pattern = 'monthly';
        } else if (avgDays >= 13 && avgDays <= 15) {
          pattern = 'biweekly';
        } else if (avgDays >= 6 && avgDays <= 8) {
          pattern = 'weekly';
        }
        
        patterns.push({
          merchant: merchant,
          transaction_count: transactions.length,
          first_date: dates[0],
          last_date: dates[dates.length - 1],
          avg_interval_days: avgDays,
          pattern: pattern,
          total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
          avg_amount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        });
      }
    }
    
    res.json({
      success: true,
      patterns: patterns.sort((a, b) => b.transaction_count - a.transaction_count)
    });
  } catch (error) {
    console.error('Error analyzing recurring patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze recurring patterns',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /recurring/apply_rules:
 *   post:
 *     summary: Apply recurring rules to transactions
 *     description: Applies recurring rules to mark transactions as recurring based on merchant matching
 *     tags: [Recurring]
 *     responses:
 *       200:
 *         description: Rules applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/apply_rules', async (req, res) => {
  try {
    const rules = await RecurringRule.findAll({
      where: { active: true }
    });
    
    const transactions = await Transaction.findAll({
      where: { is_recurring: false }
    });
    
    let updatedCount = 0;
    
    for (const transaction of transactions) {
      for (const rule of rules) {
        let matches = false;
        
        switch (rule.match_type) {
          case 'exact':
            matches = transaction.details.toLowerCase() === rule.merchant.toLowerCase();
            break;
          case 'contains':
            matches = transaction.details.toLowerCase().includes(rule.merchant.toLowerCase());
            break;
          case 'regex':
            try {
              const regex = new RegExp(rule.merchant, 'i');
              matches = regex.test(transaction.details);
            } catch (error) {
              console.error('Invalid regex pattern:', error);
            }
            break;
        }
        
        if (matches) {
          await transaction.update({ is_recurring: true });
          updatedCount++;
          break; // Only apply first matching rule
        }
      }
    }
    
    res.json({
      success: true,
      message: `Applied recurring rules to ${updatedCount} transactions`
    });
  } catch (error) {
    console.error('Error applying recurring rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply recurring rules',
      message: error.message
    });
  }
});

module.exports = router; 