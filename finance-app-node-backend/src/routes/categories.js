const express = require('express');
const router = express.Router();

// Import models
const { CategoryMapping, Transaction } = require('../models');

/**
 * GET /api/category_mappings
 * Get all category mappings
 */
router.get('/', async (req, res) => {
  try {
    const mappings = await CategoryMapping.findAll({
      order: [['plaid_category', 'ASC']]
    });
    
    res.json({
      success: true,
      mappings: mappings.map(mapping => ({
        id: mapping.id,
        plaid_category: mapping.plaid_category,
        app_category: mapping.app_category
      }))
    });
  } catch (error) {
    console.error('Error fetching category mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category mappings',
      message: error.message
    });
  }
});

/**
 * POST /api/category_mappings
 * Create or update a category mapping
 */
router.post('/', async (req, res) => {
  try {
    const { plaid_category, app_category } = req.body;
    
    if (!plaid_category || !app_category) {
      return res.status(400).json({
        success: false,
        error: 'Both plaid_category and app_category are required'
      });
    }
    
    const [mapping, created] = await CategoryMapping.findOrCreate({
      where: { plaid_category },
      defaults: { app_category }
    });
    
    if (!created) {
      await mapping.update({ app_category });
    }
    
    res.json({
      success: true,
      mapping: {
        id: mapping.id,
        plaid_category: mapping.plaid_category,
        app_category: mapping.app_category
      }
    });
  } catch (error) {
    console.error('Error creating category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category mapping',
      message: error.message
    });
  }
});

/**
 * DELETE /api/category_mappings
 * Delete a category mapping
 */
router.delete('/', async (req, res) => {
  try {
    const { plaid_category } = req.query;
    
    if (!plaid_category) {
      return res.status(400).json({
        success: false,
        error: 'plaid_category is required'
      });
    }
    
    const mapping = await CategoryMapping.findOne({
      where: { plaid_category }
    });
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Category mapping not found'
      });
    }
    
    await mapping.destroy();
    
    res.json({
      success: true,
      message: 'Category mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category mapping',
      message: error.message
    });
  }
});

/**
 * POST /api/category_mappings/backfill
 * Backfill app_category for existing transactions
 */
router.post('/backfill', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        app_category: 'Other'
      }
    });
    
    let updatedCount = 0;
    
    for (const transaction of transactions) {
      if (transaction.category && transaction.category !== 'Uncategorized') {
        const mapping = await CategoryMapping.findOne({
          where: { plaid_category: transaction.category }
        });
        
        if (mapping) {
          await transaction.update({ app_category: mapping.app_category });
          updatedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Updated app_category for ${updatedCount} transactions`
    });
  } catch (error) {
    console.error('Error backfilling categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backfill categories',
      message: error.message
    });
  }
});

/**
 * GET /api/category_mappings/stats
 * Get category mapping statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalMappings = await CategoryMapping.count();
    const totalTransactions = await Transaction.count();
    const categorizedTransactions = await Transaction.count({
      where: {
        app_category: {
          [require('sequelize').Op.ne]: 'Other'
        }
      }
    });
    
    // Get category distribution
    const categoryStats = await Transaction.findAll({
      attributes: [
        'app_category',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total_amount']
      ],
      group: ['app_category'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
    });
    
    res.json({
      success: true,
      stats: {
        total_mappings: totalMappings,
        total_transactions: totalTransactions,
        categorized_transactions: categorizedTransactions,
        categorization_rate: totalTransactions > 0 ? (categorizedTransactions / totalTransactions * 100).toFixed(2) : 0,
        category_distribution: categoryStats.map(stat => ({
          category: stat.app_category,
          count: parseInt(stat.dataValues.count),
          total_amount: parseFloat(stat.dataValues.total_amount || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category stats',
      message: error.message
    });
  }
});

module.exports = router; 