const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  let sequelize;
  
  try {
    // Create Sequelize instance
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate-add-recurrence-pattern-safe.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration to add recurrence_pattern column...');
    console.log('🔍 Migration SQL:', migrationSQL);

    // Execute the migration
    await sequelize.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ recurrence_pattern column has been added to transactions table');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the migration
runMigration(); 