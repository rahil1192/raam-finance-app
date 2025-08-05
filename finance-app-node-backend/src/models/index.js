const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'sqlite://./finance_tracker.db';

// Clean up DATABASE_URL for PostgreSQL
let cleanDatabaseUrl = DATABASE_URL;
if (DATABASE_URL && DATABASE_URL.startsWith("postgres://")) {
  cleanDatabaseUrl = DATABASEUrl.replace("postgres://", "postgresql://", 1);
}

// Create Sequelize instance
const sequelize = new Sequelize(cleanDatabaseUrl, {
  dialect: DATABASE_URL.includes('postgresql') ? 'postgres' : 'sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: DATABASE_URL.includes('postgresql') ? {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  } : {}
});

// Import models
const Account = require('./Account')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const PlaidItem = require('./PlaidItem')(sequelize);
const CategoryMapping = require('./CategoryMapping')(sequelize);
const RecurringRule = require('./RecurringRule')(sequelize);

// Define associations
Account.hasMany(Transaction, { 
  foreignKey: 'account_id', 
  sourceKey: 'account_id',
  as: 'transactions' 
});
Transaction.belongsTo(Account, { 
  foreignKey: 'account_id', 
  targetKey: 'account_id',
  as: 'account' 
});

PlaidItem.hasMany(Account, { foreignKey: 'plaid_item_id', as: 'accounts' });
Account.belongsTo(PlaidItem, { foreignKey: 'plaid_item_id', as: 'plaid_item' });

// Database initialization function
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Debug: Check what type of database we're using
    console.log('🔍 DATABASE_URL type:', DATABASE_URL.includes('postgresql') ? 'PostgreSQL' : 'SQLite');
    console.log('🔍 DATABASE_URL:', DATABASE_URL.substring(0, 20) + '...');
    
    // Only sync for SQLite, skip for PostgreSQL since tables are manually created
    if (DATABASE_URL.includes('sqlite')) {
      console.log('🔄 Syncing SQLite database...');
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    } else {
      console.log('✅ Using existing PostgreSQL tables (skipping sync).');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  initDatabase,
  Account,
  Transaction,
  PlaidItem,
  CategoryMapping,
  RecurringRule
}; 