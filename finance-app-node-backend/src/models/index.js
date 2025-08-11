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
const MerchantCategoryRule = require('./MerchantCategoryRule')(sequelize);
const MerchantCategoryMapping = require('./MerchantCategoryMapping')(sequelize);

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
    
    if (DATABASE_URL.includes('postgresql')) {
      // For PostgreSQL, use a safer approach - only create missing tables
      console.log('🔄 Checking PostgreSQL database for missing tables...');
      
      try {
        // Check if merchant_category_mappings table exists
        const tableExists = await sequelize.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'merchant_category_mappings')",
          { type: sequelize.QueryTypes.SELECT }
        );
        
        if (!tableExists[0].exists) {
          console.log('🔄 Creating missing merchant_category_mappings table...');
          await sequelize.query(`
            CREATE TABLE merchant_category_mappings (
              id SERIAL PRIMARY KEY,
              merchant_name VARCHAR(255) NOT NULL,
              merchant_pattern TEXT,
              app_category VARCHAR(255) NOT NULL,
              priority INTEGER DEFAULT 1,
              is_active BOOLEAN DEFAULT true,
              description TEXT,
              created_by VARCHAR(255),
              usage_count INTEGER DEFAULT 0,
              last_used TIMESTAMP,
              "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_merchant_category_mappings_merchant_name ON merchant_category_mappings(merchant_name);
            CREATE INDEX idx_merchant_category_mappings_app_category ON merchant_category_mappings(app_category);
            CREATE INDEX idx_merchant_category_mappings_is_active ON merchant_category_mappings(is_active);
            CREATE INDEX idx_merchant_category_mappings_priority ON merchant_category_mappings(priority);
            CREATE UNIQUE INDEX unique_merchant_category ON merchant_category_mappings(merchant_name, app_category);
          `);
          console.log('✅ merchant_category_mappings table created successfully.');
        } else {
          console.log('✅ merchant_category_mappings table already exists.');
        }
        
        console.log('✅ PostgreSQL database check completed.');
      } catch (tableError) {
        console.warn('⚠️ Could not create merchant_category_mappings table:', tableError.message);
        console.log('ℹ️ The table may already exist or there may be permission issues.');
      }
    } else {
      // For SQLite, use alter: true as it's safer
      console.log('🔄 Syncing SQLite database with alter mode...');
      await sequelize.sync({ alter: true });
      console.log('✅ SQLite database models synchronized.');
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
  RecurringRule,
  MerchantCategoryRule,
  MerchantCategoryMapping
}; 