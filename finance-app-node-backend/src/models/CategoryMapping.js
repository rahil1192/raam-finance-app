const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CategoryMapping = sequelize.define('CategoryMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plaid_category: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    app_category: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'category_mappings',
    timestamps: true,
    indexes: [
      {
        fields: ['plaid_category']
      },
      {
        fields: ['app_category']
      }
    ]
  });

  return CategoryMapping;
}; 