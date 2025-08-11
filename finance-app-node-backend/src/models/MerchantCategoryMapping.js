const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MerchantCategoryMapping = sequelize.define('MerchantCategoryMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Merchant identification
    merchant_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Merchant name (e.g., "Starbucks", "Amazon")'
    },
    merchant_pattern: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Regex pattern for matching merchant names (optional)'
    },
    // Category mapping
    app_category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'App category name (e.g., "Coffee Shops", "Shopping")'
    },
    // Priority and control
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Priority level (higher = more important)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this mapping is active'
    },
    // Metadata
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of this merchant-category mapping'
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'User who created this mapping'
    },
    // Usage tracking
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this mapping has been used'
    },
    last_used: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this mapping was used'
    }
  }, {
    tableName: 'merchant_category_mappings',
    timestamps: true,
    indexes: [
      {
        fields: ['merchant_name']
      },
      {
        fields: ['app_category']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['merchant_name', 'app_category'],
        unique: true,
        name: 'unique_merchant_category'
      }
    ]
  });

  return MerchantCategoryMapping;
}; 