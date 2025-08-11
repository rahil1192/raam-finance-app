const express = require('express');
const router = express.Router();

// Import models
const { MerchantCategoryMapping, Transaction, sequelize } = require('../models');

/**
 * @swagger
 * /merchant-category-mapping:
 *   get:
 *     summary: Get all merchant-category mappings
 *     description: Returns all active merchant-category mappings with optional filtering
 *     tags: [MerchantCategoryMapping]
 *     parameters:
 *       - in: query
 *         name: merchant_name
 *         schema:
 *           type: string
 *         description: Filter by merchant name (partial match)
 *       - in: query
 *         name: app_category
 *         schema:
 *           type: string
 *         description: Filter by app category
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Merchant-category mappings retrieved successfully
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
 *                     $ref: '#/components/schemas/MerchantCategoryMapping'
 */
router.get('/', async (req, res) => {
  try {
    const { merchant_name, app_category, is_active } = req.query;
    
    let whereClause = {};
    
    if (merchant_name) {
      whereClause.merchant_name = {
        [sequelize.Op.like]: `%${merchant_name}%`
      };
    }
    
    if (app_category) {
      whereClause.app_category = app_category;
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }
    
    const mappings = await MerchantCategoryMapping.findAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['usage_count', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
    
    res.json({
      success: true,
      mappings,
      count: mappings.length
    });
  } catch (error) {
    console.error('Error fetching merchant-category mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch merchant-category mappings',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping:
 *   post:
 *     summary: Create a new merchant-category mapping
 *     description: Creates a new mapping between a merchant and a category
 *     tags: [MerchantCategoryMapping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant_name
 *               - app_category
 *             properties:
 *               merchant_name:
 *                 type: string
 *                 description: Merchant name (e.g., "Starbucks")
 *               merchant_pattern:
 *                 type: string
 *                 description: Regex pattern for merchant matching (optional)
 *               app_category:
 *                 type: string
 *                 description: App category name (e.g., "Coffee Shops")
 *               priority:
 *                 type: integer
 *                 description: Priority level (higher = more important)
 *               description:
 *                 type: string
 *                 description: Description of this mapping
 *               created_by:
 *                 type: string
 *                 description: User who created this mapping
 *     responses:
 *       201:
 *         description: Merchant-category mapping created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       409:
 *         description: Conflict - mapping already exists
 */
router.post('/', async (req, res) => {
  try {
    const { 
      merchant_name, 
      merchant_pattern, 
      app_category, 
      priority = 1, 
      description, 
      created_by 
    } = req.body;
    
    if (!merchant_name || !app_category) {
      return res.status(400).json({
        success: false,
        error: 'Merchant name and app category are required'
      });
    }
    
    // Check if mapping already exists
    const existingMapping = await MerchantCategoryMapping.findOne({
      where: {
        merchant_name: merchant_name,
        app_category: app_category
      }
    });
    
    if (existingMapping) {
      return res.status(409).json({
        success: false,
        error: 'Mapping already exists for this merchant and category'
      });
    }
    
    const mapping = await MerchantCategoryMapping.create({
      merchant_name,
      merchant_pattern,
      app_category,
      priority,
      description,
      created_by
    });
    
    res.status(201).json({
      success: true,
      message: 'Merchant-category mapping created successfully',
      mapping
    });
  } catch (error) {
    console.error('Error creating merchant-category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create merchant-category mapping',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/{id}:
 *   put:
 *     summary: Update a merchant-category mapping
 *     description: Updates an existing merchant-category mapping
 *     tags: [MerchantCategoryMapping]
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
 *             properties:
 *               merchant_name:
 *                 type: string
 *               merchant_pattern:
 *                 type: string
 *               app_category:
 *                 type: string
 *               priority:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mapping updated successfully
 *       404:
 *         description: Mapping not found
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const mapping = await MerchantCategoryMapping.findByPk(id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Merchant-category mapping not found'
      });
    }
    
    await mapping.update(updateData);
    
    res.json({
      success: true,
      message: 'Merchant-category mapping updated successfully',
      mapping
    });
  } catch (error) {
    console.error('Error updating merchant-category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update merchant-category mapping',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/{id}:
 *   delete:
 *     summary: Delete a merchant-category mapping
 *     description: Deletes a merchant-category mapping
 *     tags: [MerchantCategoryMapping]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mapping ID
 *     responses:
 *       200:
 *         description: Mapping deleted successfully
 *       404:
 *         description: Mapping not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const mapping = await MerchantCategoryMapping.findByPk(id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Merchant-category mapping not found'
      });
    }
    
    await mapping.destroy();
    
    res.json({
      success: true,
      message: 'Merchant-category mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting merchant-category mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete merchant-category mapping',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/match:
 *   post:
 *     summary: Find matching category for a merchant
 *     description: Finds the best matching category for a given merchant name using existing mappings
 *     tags: [MerchantCategoryMapping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant_name
 *             properties:
 *               merchant_name:
 *                 type: string
 *                 description: Merchant name to find category for
 *     responses:
 *       200:
 *         description: Category match found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 matched:
 *                   type: boolean
 *                 category:
 *                   type: string
 *                 mapping:
 *                   $ref: '#/components/schemas/MerchantCategoryMapping'
 *                 confidence:
 *                   type: string
 */
router.post('/match', async (req, res) => {
  try {
    const { merchant_name } = req.body;
    
    if (!merchant_name) {
      return res.status(400).json({
        success: false,
        error: 'Merchant name is required'
      });
    }
    
    // Find exact matches first (highest priority)
    let exactMatch = await MerchantCategoryMapping.findOne({
      where: {
        merchant_name: merchant_name,
        is_active: true
      },
      order: [['priority', 'DESC'], ['usage_count', 'DESC']]
    });
    
    if (exactMatch) {
      // Update usage count
      await exactMatch.update({
        usage_count: exactMatch.usage_count + 1,
        last_used: new Date()
      });
      
      return res.json({
        success: true,
        matched: true,
        category: exactMatch.app_category,
        mapping: exactMatch,
        confidence: 'exact'
      });
    }
    
    // Find pattern matches
    const patternMatches = await MerchantCategoryMapping.findAll({
      where: {
        is_active: true,
        merchant_pattern: {
          [sequelize.Op.not]: null
        }
      },
      order: [['priority', 'DESC'], ['usage_count', 'DESC']]
    });
    
    let bestPatternMatch = null;
    let bestScore = 0;
    
    for (const mapping of patternMatches) {
      try {
        const regex = new RegExp(mapping.merchant_pattern, 'i');
        if (regex.test(merchant_name)) {
          const score = mapping.priority * 10 + mapping.usage_count;
          if (score > bestScore) {
            bestScore = score;
            bestPatternMatch = mapping;
          }
        }
      } catch (regexError) {
        console.warn(`Invalid regex pattern for mapping ${mapping.id}:`, mapping.merchant_pattern);
      }
    }
    
    if (bestPatternMatch) {
      // Update usage count
      await bestPatternMatch.update({
        usage_count: bestPatternMatch.usage_count + 1,
        last_used: new Date()
      });
      
      return res.json({
        success: true,
        matched: true,
        category: bestPatternMatch.app_category,
        mapping: bestPatternMatch,
        confidence: 'pattern'
      });
    }
    
    // No match found
    res.json({
      success: true,
      matched: false,
      category: null,
      mapping: null,
      confidence: 'none'
    });
    
  } catch (error) {
    console.error('Error matching merchant to category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to match merchant to category',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/bulk-create:
 *   post:
 *     summary: Create multiple merchant-category mappings
 *     description: Creates multiple mappings in a single request
 *     tags: [MerchantCategoryMapping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mappings
 *             properties:
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - merchant_name
 *                     - app_category
 *                   properties:
 *                     merchant_name:
 *                       type: string
 *                     merchant_pattern:
 *                       type: string
 *                     app_category:
 *                       type: string
 *                     priority:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     created_by:
 *                       type: string
 *     responses:
 *       201:
 *         description: Mappings created successfully
 *       400:
 *         description: Bad request - invalid data
 */
router.post('/bulk-create', async (req, res) => {
  try {
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mappings array is required and must not be empty'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const mappingData of mappings) {
      try {
        const { 
          merchant_name, 
          merchant_pattern, 
          app_category, 
          priority = 1, 
          description, 
          created_by 
        } = mappingData;
        
        if (!merchant_name || !app_category) {
          errors.push({
            merchant_name,
            app_category,
            error: 'Missing required fields'
          });
          continue;
        }
        
        // Check if mapping already exists
        const existingMapping = await MerchantCategoryMapping.findOne({
          where: {
            merchant_name: merchant_name,
            app_category: app_category
          }
        });
        
        if (existingMapping) {
          errors.push({
            merchant_name,
            app_category,
            error: 'Mapping already exists'
          });
          continue;
        }
        
        const mapping = await MerchantCategoryMapping.create({
          merchant_name,
          merchant_pattern,
          app_category,
          priority,
          description,
          created_by
        });
        
        results.push(mapping);
      } catch (error) {
        errors.push({
          merchant_name: mappingData.merchant_name,
          app_category: mappingData.app_category,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Created ${results.length} mappings, ${errors.length} failed`,
      created: results,
      errors: errors,
      summary: {
        total_requested: mappings.length,
        created: results.length,
        failed: errors.length
      }
    });
    
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk mappings',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/bulk-assign:
 *   post:
 *     summary: Bulk assign categories to merchants using partial name matching
 *     description: Assigns a category to all merchants whose names contain the specified partial name
 *     tags: [MerchantCategoryMapping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partial_merchant_name
 *               - app_category
 *             properties:
 *               partial_merchant_name:
 *                 type: string
 *                 description: Partial merchant name to match (e.g., "LEVIO" will match "LEVIO CONSEILS", "PAY LEVIO", etc.)
 *               app_category:
 *                 type: string
 *                 description: Category to assign to all matching merchants
 *               priority:
 *                 type: integer
 *                 description: Priority level for the mappings (default 5)
 *               description:
 *                 type: string
 *                 description: Description for the mappings
 *     responses:
 *       200:
 *         description: Categories assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 mappings_created:
 *                   type: integer
 *                 mappings_updated:
 *                   type: integer
 *                 total_affected:
 *                   type: integer
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchant_name:
 *                         type: string
 *                       app_category:
 *                         type: string
 *                       action:
 *                         type: string
 *       400:
 *         description: Bad request - missing required fields
 */
router.post('/bulk-assign', async (req, res) => {
  try {
    const { partial_merchant_name, app_category, priority = 5, description = '' } = req.body;
    
    if (!partial_merchant_name || !app_category) {
      return res.status(400).json({
        success: false,
        error: 'Partial merchant name and app category are required'
      });
    }
    
    console.log(`🔄 Bulk assigning category "${app_category}" to merchants containing "${partial_merchant_name}"`);
    
    // Split partial merchant names by comma and trim whitespace
    const partialNames = partial_merchant_name.split(',').map(name => name.trim()).filter(Boolean);
    console.log(`🔍 Looking for merchants containing any of:`, partialNames);
    
    // First, check if we already have mappings for merchants containing any of the partial names
    const existingMappings = await MerchantCategoryMapping.findAll({
      where: sequelize.Op.or(
        partialNames.map(partialName => ({
          merchant_name: {
            [sequelize.Op.like]: `%${partialName}%`
          }
        }))
      )
    });
    
    // Find all existing transactions with merchant names (in details field) containing any of the partial names
    const { Transaction } = require('../models');
    
    const matchingTransactions = await Transaction.findAll({
      where: sequelize.Op.or(
        partialNames.map(partialName => 
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('details')),
            'LIKE',
            `%${partialName.toLowerCase()}%`
          )
        )
      ),
      attributes: ['details'],
      group: ['details']
    });
    
    console.log(matchingTransactions);
    if (matchingTransactions.length === 0 && existingMappings.length === 0) {
      return res.json({
        success: true,
        message: `No transactions or existing mappings found with merchant names containing any of: ${partialNames.join(', ')}`,
        mappings_created: 0,
        mappings_updated: 0,
        total_affected: 0,
        details: []
      });
    }
    
    // Extract unique merchant names from transactions
    const transactionMerchantNames = [...new Set(matchingTransactions.map(t => t.details).filter(Boolean))];
    
    // Combine with existing mapping merchant names
    const allMerchantNames = [...new Set([
      ...transactionMerchantNames,
      ...existingMappings.map(m => m.merchant_name)
    ])];
    
    console.log(`📝 Found ${allMerchantNames.length} unique merchant names:`, allMerchantNames);
    
    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let transactionsUpdated = 0;
    
    // Create or update mappings for each merchant name
    for (const merchantName of allMerchantNames) {
      try {
        // Check if mapping already exists
        const existingMapping = await MerchantCategoryMapping.findOne({
          where: {
            merchant_name: merchantName,
            app_category: app_category
          }
        });
        
        if (existingMapping) {
          // Update existing mapping
          await existingMapping.update({
            priority: priority,
            description: description || existingMapping.description,
            last_used: new Date()
          });
          
          results.push({
            merchant_name: merchantName,
            app_category: app_category,
            action: 'updated'
          });
          updatedCount++;
          
          console.log(`✅ Updated mapping: ${merchantName} → ${app_category}`);
        } else {
          // Create new mapping
          await MerchantCategoryMapping.create({
            merchant_name: merchantName,
            app_category: app_category,
            priority: priority,
            description: description || `Bulk assigned - contains any of: ${partialNames.join(', ')}`,
            created_by: 'bulk-assign',
            usage_count: 0,
            last_used: new Date()
          });
          
          results.push({
            merchant_name: merchantName,
            app_category: app_category,
            action: 'created'
          });
          createdCount++;
          
          console.log(`✅ Created mapping: ${merchantName} → ${app_category}`);
        }
        
        // Update all transactions with this merchant name to use the new category
        const updateResult = await Transaction.update(
          { app_category: app_category },
          { 
            where: sequelize.Op.or(
              partialNames.map(partialName => 
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('details')),
                  'LIKE',
                  `%${partialName.toLowerCase()}%`
                )
              )
            )
          }
        );
        
        if (updateResult[0] > 0) {
          transactionsUpdated += updateResult[0];
          console.log(`🔄 Updated ${updateResult[0]} transactions for merchant: ${merchantName}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${merchantName}:`, error.message);
        results.push({
          merchant_name: merchantName,
          app_category: app_category,
          action: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`🎯 Bulk assignment complete: ${createdCount} created, ${updatedCount} updated, ${transactionsUpdated} transactions updated`);
    
    res.json({
      success: true,
      message: `Successfully assigned category "${app_category}" to ${allMerchantNames.length} merchants containing any of: ${partialNames.join(', ')} and updated ${transactionsUpdated} transactions`,
      mappings_created: createdCount,
      mappings_updated: updatedCount,
      total_affected: allMerchantNames.length,
      transactions_updated: transactionsUpdated,
      details: results
    });
    
  } catch (error) {
    console.error('Error in bulk assign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign categories',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /merchant-category-mapping/stats:
 *   get:
 *     summary: Get merchant-category mapping statistics
 *     description: Returns statistics about merchant-category mappings
 *     tags: [MerchantCategoryMapping]
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
 *                   type: object
 *                   properties:
 *                     total_mappings:
 *                       type: integer
 *                     active_mappings:
 *                       type: integer
 *                     total_usage:
 *                       type: integer
 *                     top_categories:
 *                       type: array
 *                     top_merchants:
 *                       type: array
 */
router.get('/stats', async (req, res) => {
  try {
    const totalMappings = await MerchantCategoryMapping.count();
    const activeMappings = await MerchantCategoryMapping.count({ where: { is_active: true } });
    const totalUsage = await MerchantCategoryMapping.sum('usage_count') || 0;
    
    // Top categories by usage
    const topCategories = await MerchantCategoryMapping.findAll({
      attributes: [
        'app_category',
        [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_usage'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'mapping_count']
      ],
      group: ['app_category'],
      order: [[sequelize.fn('SUM', sequelize.col('usage_count')), 'DESC']],
      limit: 10
    });
    
    // Top merchants by usage
    const topMerchants = await MerchantCategoryMapping.findAll({
      attributes: [
        'merchant_name',
        'usage_count',
        'app_category'
      ],
      where: { is_active: true },
      order: [['usage_count', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      stats: {
        total_mappings: totalMappings,
        active_mappings: activeMappings,
        total_usage: totalUsage,
        top_categories: topCategories,
        top_merchants: topMerchants
      }
    });
    
  } catch (error) {
    console.error('Error fetching merchant-category mapping stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router; 