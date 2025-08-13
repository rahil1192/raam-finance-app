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
 * @swagger
 * /category_mappings:
 *   get:
 *     summary: Get all category mappings
 *     description: Retrieves all category mappings between Plaid categories and app categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category mappings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mappings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoryMapping'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /category_mappings/mappings:
 *   get:
 *     summary: Get all category mappings
 *     description: Retrieves all category mappings from the database
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category mappings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mappings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoryMapping'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /category_mappings:
 *   post:
 *     summary: Create a new category mapping
 *     description: Creates a new mapping between a Plaid category and an app category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryMappingRequest'
 *     responses:
 *       200:
 *         description: Category mapping created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mapping:
 *                   $ref: '#/components/schemas/CategoryMapping'
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
 * @swagger
 * /category_mappings/mappings/{id}:
 *   put:
 *     summary: Update a category mapping
 *     description: Updates an existing category mapping
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mapping ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_category
 *             properties:
 *               app_category:
 *                 type: string
 *                 description: New app category for the mapping
 *     responses:
 *       200:
 *         description: Category mapping updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mapping:
 *                   $ref: '#/components/schemas/CategoryMapping'
 *       400:
 *         description: Bad request - missing app_category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mapping not found
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
 * @swagger
 * /category_mappings/mappings/{id}:
 *   delete:
 *     summary: Delete a category mapping
 *     description: Permanently deletes a category mapping
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mapping ID
 *     responses:
 *       200:
 *         description: Category mapping deleted successfully
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
 *         description: Mapping not found
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
 * @swagger
 * /category_mappings/map:
 *   post:
 *     summary: Map a Plaid category to an app category
 *     description: Maps a Plaid category to its corresponding app category using the mapping rules
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plaid_category
 *             properties:
 *               plaid_category:
 *                 type: string
 *                 description: The Plaid category to map
 *     responses:
 *       200:
 *         description: Category mapped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 plaid_category:
 *                   type: string
 *                 app_category:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - missing plaid_category
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
 * @swagger
 * /category_mappings/plaid/{app_category}:
 *   get:
 *     summary: Get Plaid categories for an app category
 *     description: Returns all Plaid categories that map to a specific app category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: app_category
 *         required: true
 *         schema:
 *           type: string
 *         description: The app category to find Plaid categories for
 *     responses:
 *       200:
 *         description: Plaid categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 app_category:
 *                   type: string
 *                 plaid_categories:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

/**
 * @swagger
 * /category_mappings/with_icons:
 *   get:
 *     summary: Get all categories with their custom icons
 *     description: Retrieves all app categories with their associated icons for frontend display
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories with icons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       color:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/with_icons', async (req, res) => {
  try {
    // Get all unique app categories with their icons
    const categoryMappings = await CategoryMapping.findAll({
      attributes: ['app_category', 'icon'],
      where: { is_active: true },
      order: [['app_category', 'ASC']]
    });

    // Create a map of category names to icons
    const categoriesWithIcons = categoryMappings.map(mapping => ({
      name: mapping.app_category,
      icon: mapping.icon || getDefaultIcon(mapping.app_category),
      color: getDefaultColor(mapping.app_category)
    }));

    // Add any missing default categories
    const defaultCategories = getAppCategories();
    const existingCategories = new Set(categoriesWithIcons.map(cat => cat.name));
    
    defaultCategories.forEach(category => {
      if (!existingCategories.has(category)) {
        categoriesWithIcons.push({
          name: category,
          icon: getDefaultIcon(category),
          color: getDefaultColor(category)
        });
      }
    });

    res.json({
      success: true,
      categories: categoriesWithIcons
    });
  } catch (error) {
    console.error('Error fetching categories with icons:', error);
    
    // If there's a database error (like missing icon column), fall back to default categories
    if (error.name === 'SequelizeDatabaseError' || error.message.includes('icon')) {
      console.log('⚠️ Database error detected, falling back to default categories...');
      
      try {
        const defaultCategories = getAppCategories();
        const fallbackCategories = defaultCategories.map(category => ({
          name: category,
          icon: getDefaultIcon(category),
          color: getDefaultColor(category)
        }));
        
        res.json({
          success: true,
          categories: fallbackCategories,
          warning: 'Using default categories due to database configuration'
        });
        return;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories with icons',
      message: error.message
    });
  }
});

// Helper function to get default icon for a category
function getDefaultIcon(category) {
  const iconMap = {
    'Transfers': 'swap-horizontal-outline',
    'Transfer': 'swap-horizontal-outline',
    'Food & Dining': 'restaurant-outline',
    'Restaurants & Bars': 'wine-outline',
    'Coffee Shops': 'cafe-outline',
    'Groceries': 'basket-outline',
    'Shopping': 'cart-outline',
    'Clothing': 'shirt-outline',
    'Travel & Vacation': 'airplane-outline',
    'Gas': 'car-sport-outline',
    'Entertainment & Recreation': 'film-outline',
    'Medical': 'medkit-outline',
    'Dentist': 'medkit-outline',
    'Fitness': 'barbell-outline',
    'Insurance': 'shield-checkmark-outline',
    'Loan Repayment': 'cash-outline',
    'Credit Card Payment': 'card-outline',
    'Student Loans': 'school-outline',
    'Business Income': 'briefcase-outline',
    'Paycheck': 'cash-outline',
    'Interest': 'trending-up-outline',
    'Charity': 'heart-outline',
    'Gifts': 'gift-outline',
    'Pets': 'paw-outline',
    'Child Care': 'happy-outline',
    'Education': 'school-outline',
    'Home Improvement': 'home-outline',
    'Rent': 'home-outline',
    'Mortgage': 'home-outline',
    'Water': 'water-outline',
    'Gas & Electric': 'flash-outline',
    'Internet & Cable': 'wifi-outline',
    'Phone': 'call-outline',
    'Cash & ATM': 'cash-outline',
    'Financial & Legal Services': 'briefcase-outline',
    'Other': 'ellipsis-horizontal-outline',
  };
  return iconMap[category] || 'ellipsis-horizontal-outline';
}

// Helper function to get default color for a category
function getDefaultColor(category) {
  const colorMap = {
    'Transfers': '#8b5cf6',
    'Transfer': '#8b5cf6',
    'Food & Dining': '#22c55e',
    'Restaurants & Bars': '#f59e0b',
    'Coffee Shops': '#b45309',
    'Groceries': '#84cc16',
    'Shopping': '#f59e0b',
    'Clothing': '#f472b6',
    'Travel & Vacation': '#14b8a6',
    'Gas': '#fbbf24',
    'Entertainment & Recreation': '#ec4899',
    'Medical': '#ef4444',
    'Dentist': '#f87171',
    'Fitness': '#10b981',
    'Insurance': '#6366f1',
    'Loan Repayment': '#a855f7',
    'Credit Card Payment': '#eab308',
    'Student Loans': '#6366f1',
    'Business Income': '#06b6d4',
    'Paycheck': '#22d3ee',
    'Interest': '#0ea5e9',
    'Charity': '#f43f5e',
    'Gifts': '#a855f7',
    'Pets': '#fbbf24',
    'Child Care': '#f472b6',
    'Education': '#6366f1',
    'Home Improvement': '#f59e42',
    'Rent': '#f59e42',
    'Mortgage': '#f59e42',
    'Water': '#38bdf8',
    'Gas & Electric': '#fde68a',
    'Internet & Cable': '#818cf8',
    'Phone': '#818cf8',
    'Cash & ATM': '#fbbf24',
    'Financial & Legal Services': '#06b6d4',
    'Other': '#64748b',
  };
  return colorMap[category] || '#64748b';
}

module.exports = router; 