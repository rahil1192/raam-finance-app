-- Migration to fix account_id column type in transactions table
-- This changes account_id from INTEGER to VARCHAR to store Plaid account IDs

-- First, drop the foreign key constraint if it exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

-- Change the column type from INTEGER to VARCHAR(255)
ALTER TABLE transactions ALTER COLUMN account_id TYPE VARCHAR(255);

-- Re-add the foreign key constraint
ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(account_id);

-- Update any existing integer account_id values to match the accounts table
-- This is a safety measure in case there are existing integer values
UPDATE transactions 
SET account_id = accounts.account_id 
FROM accounts 
WHERE transactions.account_id::text = accounts.id::text 
AND transactions.account_id ~ '^[0-9]+$';

-- Add an index on account_id for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id); 