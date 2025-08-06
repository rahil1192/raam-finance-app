const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Plaid transaction_id'
    },
    account_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'accounts',
        key: 'account_id'
      }
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    details: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'Uncategorized'
    },
    app_category: {
      type: DataTypes.STRING,
      defaultValue: 'Other',
      comment: 'Normalized category for app use'
    },
    transaction_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Debit or Credit'
    },
    bank: {
      type: DataTypes.STRING,
      allowNull: true
    },
    statement_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Credit Card, Chequing, Savings'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recurrence_pattern: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Recurrence pattern: none, daily, weekly, bi-weekly, monthly, bi-monthly, annually, custom'
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['account_id']
      },
      {
        fields: ['date']
      },
      {
        fields: ['category']
      },
      {
        fields: ['transaction_type']
      },
      {
        unique: true,
        fields: ['transaction_id', 'account_id', 'date', 'amount'],
        name: 'unique_transaction'
      }
    ]
  });

  return Transaction;
}; 