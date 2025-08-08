const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MerchantCategoryRule = sequelize.define('MerchantCategoryRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_pattern: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Merchant name pattern to match (case insensitive)'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Category to assign to matching merchants'
    },
    exact_match: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to use exact match or partial match'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this rule is active'
    }
  }, {
    tableName: 'merchant_category_rules',
    timestamps: true,
    indexes: [
      { fields: ['merchant_pattern'] },
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['exact_match'] }
    ]
  });

  return MerchantCategoryRule;
}; 