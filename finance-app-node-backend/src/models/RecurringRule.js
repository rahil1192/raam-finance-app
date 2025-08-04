const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecurringRule = sequelize.define('RecurringRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant: {
      type: DataTypes.STRING,
      allowNull: false
    },
    match_type: {
      type: DataTypes.STRING,
      defaultValue: 'exact',
      comment: 'exact, contains, regex'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    recurrence_pattern: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'weekly, biweekly, monthly, etc.'
    }
  }, {
    tableName: 'recurring_rules',
    timestamps: true,
    indexes: [
      {
        fields: ['merchant']
      },
      {
        fields: ['match_type']
      },
      {
        fields: ['active']
      }
    ]
  });

  return RecurringRule;
}; 