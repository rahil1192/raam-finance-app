const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    account_id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      comment: 'Plaid account_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    official_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'depository, credit, loan, investment'
    },
    subtype: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'checking, savings, credit card, etc.'
    },
    mask: {
      type: DataTypes.STRING,
      allowNull: true
    },
    available_balance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    current_balance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    iso_currency_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plaid_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'plaid_items',
        key: 'id'
      }
    },
    needs_update: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'accounts',
    timestamps: true,
    indexes: [
      {
        fields: ['account_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['plaid_item_id']
      }
    ]
  });

  return Account;
}; 