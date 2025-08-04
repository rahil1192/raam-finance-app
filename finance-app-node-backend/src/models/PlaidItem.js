const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlaidItem = sequelize.define('PlaidItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    access_token: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    item_id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    institution_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    institution_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_refresh: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Track update status'
    },
    needs_update: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    plaid_cursor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'For Plaid /transactions/sync'
    }
  }, {
    tableName: 'plaid_items',
    timestamps: true,
    indexes: [
      {
        fields: ['item_id']
      },
      {
        fields: ['access_token']
      },
      {
        fields: ['institution_id']
      }
    ]
  });

  return PlaidItem;
}; 