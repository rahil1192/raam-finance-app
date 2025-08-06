-- Safe migration to add recurrence_pattern column to transactions table
-- This script checks if the column exists before adding it

-- Check if the column exists, and if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'recurrence_pattern'
    ) THEN
        -- Add the recurrence_pattern column
        ALTER TABLE transactions ADD COLUMN recurrence_pattern VARCHAR(255);
        
        -- Add a comment to the column
        COMMENT ON COLUMN transactions.recurrence_pattern IS 'Recurrence pattern: none, daily, weekly, bi-weekly, monthly, bi-monthly, annually, custom';
        
        -- Update existing records to have 'none' as default recurrence pattern
        UPDATE transactions SET recurrence_pattern = 'none' WHERE recurrence_pattern IS NULL;
        
        -- Make the column NOT NULL after setting defaults
        ALTER TABLE transactions ALTER COLUMN recurrence_pattern SET NOT NULL;
        
        -- Add an index for better performance when querying by recurrence pattern
        CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_pattern ON transactions(recurrence_pattern);
        
        RAISE NOTICE 'recurrence_pattern column added successfully';
    ELSE
        RAISE NOTICE 'recurrence_pattern column already exists';
    END IF;
END $$; 