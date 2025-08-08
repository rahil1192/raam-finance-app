const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CategoryMapping = sequelize.define('CategoryMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Support for traditional Plaid categories
    plaid_category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Traditional Plaid category (e.g., "Food and Drink")'
    },
    // Support for personal finance categories
    personal_finance_primary: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Primary personal finance category (e.g., "FOOD_AND_DRINK")'
    },
    personal_finance_detailed: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detailed personal finance category (e.g., "FOOD_AND_DRINK_RESTAURANT")'
    },
    app_category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'App category name (e.g., "Restaurants & Bars")'
    },
    // Additional metadata
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this category mapping covers'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this mapping is active'
    }
  }, {
    tableName: 'category_mappings',
    timestamps: true,
    indexes: [
      {
        fields: ['plaid_category']
      },
      {
        fields: ['personal_finance_primary']
      },
      {
        fields: ['personal_finance_detailed']
      },
      {
        fields: ['app_category']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return CategoryMapping;
}; 