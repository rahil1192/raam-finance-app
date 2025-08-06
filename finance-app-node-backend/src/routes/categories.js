const express = require('express');
const router = express.Router();
const { CategoryMapping } = require('../models');
const { 
  CATEGORY_MAPPING, 
  getAppCategories, 
  getPlaidCategoriesForAppCategory,
  mapPlaidCategoryToAppCategory 
} = require('../config/categoryMapping');

/**
 * GET /api/categories
 * Get all available app categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = getAppCategories();
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
});

/**
 * GET /api/categories/mappings
 * Get all category mappings
 */
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await CategoryMapping.findAll({
      order: [['plaid_category', 'ASC']]
    });
    
    res.json({
      success: true,
      mappings: mappings
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
 * POST /api/categories/mappings
 * Create a new category mapping
 */
router.post('/mappings', async (req, res) => {
  try {
    const { plaid_category, app_category } = req.body;
    
    if (!plaid_category || !app_category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'plaid_category and app_category are required'
      });
    }
    
    // Check if mapping already exists
    const existingMapping = await CategoryMapping.findOne({
      where: { plaid_category }
    });
    
    if (existingMapping) {
      return res.status(409).json({
        success: false,
        error: 'Mapping already exists',
        message: `A mapping for "${plaid_category}" already exists`
      });
    }
    
    const mapping = await CategoryMapping.create({
      plaid_category,
      app_category
    });
    
    res.status(201).json({
      success: true,
      mapping: mapping
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
 * PUT /api/categories/mappings/:id
 * Update a category mapping
 */
router.put('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { app_category } = req.body;
    
    if (!app_category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'app_category is required'
      });
    }
    
    const mapping = await CategoryMapping.findByPk(id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found'
      });
    }
    
    await mapping.update({ app_category });
    
    res.json({
      success: true,
      mapping: mapping
    });
  } catch (error) {
    console.error('Error updating category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category mapping',
      message: error.message
    });
  }
});

/**
 * DELETE /api/categories/mappings/:id
 * Delete a category mapping
 */
router.delete('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const mapping = await CategoryMapping.findByPk(id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found'
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
 * POST /api/categories/map
 * Map a Plaid category to an app category
 */
router.post('/map', async (req, res) => {
  try {
    const { plaid_category } = req.body;
    
    if (!plaid_category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'plaid_category is required'
      });
    }
    
    const app_category = mapPlaidCategoryToAppCategory(plaid_category);
    
    res.json({
      success: true,
      plaid_category,
      app_category,
      message: `Mapped "${plaid_category}" to "${app_category}"`
    });
  } catch (error) {
    console.error('Error mapping category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to map category',
      message: error.message
    });
  }
});

/**
 * GET /api/categories/plaid/:app_category
 * Get all Plaid categories that map to a specific app category
 */
router.get('/plaid/:app_category', async (req, res) => {
  try {
    const { app_category } = req.params;
    
    const plaidCategories = getPlaidCategoriesForAppCategory(app_category);
    
    res.json({
      success: true,
      app_category,
      plaid_categories: plaidCategories
    });
  } catch (error) {
    console.error('Error fetching Plaid categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Plaid categories',
      message: error.message
    });
  }
});

module.exports = router; 