const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;

// Clean up DATABASE_URL for PostgreSQL
let cleanDatabaseUrl = DATABASE_URL;
if (DATABASE_URL && DATABASE_URL.startsWith("postgres://")) {
  cleanDatabaseUrl = DATABASE_URL.replace("postgres://", "postgresql://", 1);
}

// Create Sequelize instance
const sequelize = new Sequelize(cleanDatabaseUrl, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

async function runMigration() {
  try {
    console.log('🔄 Starting migration to fix account_id column type...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // Check current schema
    const [currentSchema] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'account_id';
    `);
    
    console.log('📊 Current account_id schema:', currentSchema[0]);
    
    if (currentSchema[0] && currentSchema[0].data_type === 'integer') {
      console.log('🔧 account_id is INTEGER, running migration...');
      
      // Run the migration
      await sequelize.query(`
        -- Drop the foreign key constraint if it exists
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
      `);
      
      await sequelize.query(`
        -- Change the column type from INTEGER to VARCHAR(255)
        ALTER TABLE transactions ALTER COLUMN account_id TYPE VARCHAR(255);
      `);
      
      await sequelize.query(`
        -- Re-add the foreign key constraint
        ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES accounts(account_id);
      `);
      
      await sequelize.query(`
        -- Update any existing integer account_id values to match the accounts table
        UPDATE transactions 
        SET account_id = accounts.account_id 
        FROM accounts 
        WHERE transactions.account_id::text = accounts.id::text 
        AND transactions.account_id ~ '^[0-9]+$';
      `);
      
      await sequelize.query(`
        -- Add an index on account_id for better performance
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      `);
      
      console.log('✅ Migration completed successfully!');
      
      // Verify the change
      const [newSchema] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'account_id';
      `);
      
      console.log('📊 New account_id schema:', newSchema[0]);
      
    } else {
      console.log('✅ account_id is already VARCHAR, no migration needed.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the migration
runMigration(); 